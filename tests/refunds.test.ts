import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db/pool';
import { createRefund, listRefunds, getRefundById } from '../src/refunds/refunds.service';
import { generatePayoutRun, finalizePayoutRun, getPayoutRun } from '../src/payouts/payouts.service';

const companyId = `refund-test-${randomUUID()}`;
const agentId = `${companyId}-agent`;
const b1Id = `${companyId}-b1`;
const b2Id = `${companyId}-b2`;
const b3Id = `${companyId}-b3`;
const ruleSetId = `${companyId}-rules`;

// Company is created in beforeAll; same order as payout-concurrency.test.ts.
// Cleanup: payout_runs → companies (run line items cascade away with the run
// before we touch agents, which have no cascade on payout_line_items.agent_id).
let juneRunId: string;

beforeAll(async () => {
  await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [
    companyId,
    'Refund Fixture',
  ]);

  await pool.query(
    `INSERT INTO agents (id, company_id, agent_code, full_name)
     VALUES ($1, $2, 'AG-001', 'Fixture Agent')`,
    [agentId, companyId],
  );

  // Single rule set effective 2026-01-01 — used for both June and July.
  await pool.query(
    `INSERT INTO commission_rule_sets (id, company_id, label, effective_from)
     VALUES ($1, $2, 'Fixture rules', '2026-01-01')`,
    [ruleSetId, companyId],
  );
  await pool.query(
    `INSERT INTO commission_tiers (id, rule_set_id, min_volume, max_volume, rate)
     VALUES ($1, $2, 0, 500000, 0.03)`,
    [`${ruleSetId}-t1`, ruleSetId],
  );
  // Product Q override at 5% — used in the July booking.
  await pool.query(
    `INSERT INTO commission_product_overrides (id, rule_set_id, product_code, rate)
     VALUES ($1, $2, 'Q', 0.05)`,
    [`${ruleSetId}-oq`, ruleSetId],
  );

  // Two June bookings (AG-001), each 100000, product P.
  await pool.query(
    `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
     VALUES ($1, $2, 'REF-A1', 'AG-001', '2026-06-10', 100000, 'P')`,
    [b1Id, companyId],
  );
  await pool.query(
    `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
     VALUES ($1, $2, 'REF-A2', 'AG-001', '2026-06-20', 100000, 'P')`,
    [b2Id, companyId],
  );

  // One July booking (AG-001), 200000, product Q (override 5%).
  await pool.query(
    `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
     VALUES ($1, $2, 'REF-A3', 'AG-001', '2026-07-05', 200000, 'Q')`,
    [b3Id, companyId],
  );

  // Generate + finalise the June run so that computeClawbacks can match it.
  const june = await generatePayoutRun(companyId, '2026-06');
  const finalised = await finalizePayoutRun(companyId, june.id);
  expect(finalised.status).toBe('FINALISED');
  juneRunId = finalised.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM refunds WHERE company_id = $1', [companyId]);
  await pool.query('DELETE FROM payout_line_items WHERE run_id IN (SELECT id FROM payout_runs WHERE company_id = $1)', [companyId]);
  await pool.query('DELETE FROM payout_runs WHERE company_id = $1', [companyId]);
  await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
});

describe('refund validation', () => {
  it('rejects a refund for a booking that does not exist (404)', async () => {
    const fakeId = `nonexistent-${randomUUID()}`;
    await expect(
      createRefund(companyId, {
        bookingId: fakeId,
        amount: '5000',
        refundDate: '2026-06-15',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a refund where amount exceeds the booking amount (400)', async () => {
    await expect(
      createRefund(companyId, {
        bookingId: b1Id,
        amount: '200000',
        refundDate: '2026-06-15',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a refund date before the booking date (400)', async () => {
    // B2 booking date is 2026-06-20 — refundDate is before it.
    await expect(
      createRefund(companyId, {
        bookingId: b2Id,
        amount: '10000',
        refundDate: '2026-06-10',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('records a refund for a valid booking (201)', async () => {
    const refund = await createRefund(companyId, {
      bookingId: b2Id,
      amount: '100000',
      refundDate: '2026-06-25',
      reason: 'Customer cancelled',
    });

    expect(refund.id).toBeDefined();
    expect(refund.bookingId).toBe(b2Id);
    expect(refund.amount).toBe('100000.00');
    expect(refund.refundDate).toBe('2026-06-25');
    expect(refund.reason).toBe('Customer cancelled');
    expect(refund.status).toBe('PENDING_SETTLEMENT');
    expect(refund.settledRunId).toBeNull();
  });

  it('rejects a duplicate refund for the same booking (409)', async () => {
    await expect(
      createRefund(companyId, {
        bookingId: b2Id,
        amount: '100000',
        refundDate: '2026-06-26',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('finalised_at is stamped on finalise', () => {
  it('finalised_at is not null after finalising a run', async () => {
    const { rows } = await pool.query<{ finalised_at: string | null }>(
      'SELECT finalised_at::text FROM payout_runs WHERE id = $1',
      [juneRunId],
    );
    expect(rows[0]?.finalised_at).not.toBeNull();
  });
});

describe('clawback against finalised run', () => {
  let julyRunId: string;

  it('generates a deduction on the next run for a refund recorded after finalisation', async () => {
    const july = await generatePayoutRun(companyId, '2026-07');
    julyRunId = july.id;

    // The only line item should be AG-001 with:
    //   grossVolume: 200000 (only the July Q booking)
    //   commission: 200000 * 5% = 10000
    //   clawback: June with all (200000 * 3% = 6000)
    //           - June without B2 (100000 * 3% = 3000) = 3000
    //   net: 10000 - 3000 = 7000
    const agLine = july.lineItems.find((li) => li.agentCode === 'AG-001');
    expect(agLine).toBeDefined();
    expect(agLine!.bookingCount).toBe(1);
    expect(agLine!.grossVolume).toBe('200000.00');
    expect(agLine!.commissionAmount).toBe('7000.00');
    expect(agLine!.ratesApplied).toContain('refund clawback');

    // Verify the June run was not mutated.
    const june = await getPayoutRun(companyId, juneRunId);
    const juneAg = june.lineItems.find((li) => li.agentCode === 'AG-001');
    expect(juneAg?.commissionAmount).toBe('6000.00'); // unchanged

    // Total reflects only July net.
    expect(july.totalCommission).toBe('7000');
  });

  it('marks the refund as settled once clawed back', async () => {
    const refunds = await listRefunds(companyId);
    const refund = refunds.find((r) => r.bookingId === b2Id);
    expect(refund).toBeDefined();
    expect(refund!.status).toBe('SETTLED');
    expect(refund!.settledRunId).toBe(julyRunId);
  });

  it('getRefundById returns the correct refund', async () => {
    const refunds = await listRefunds(companyId);
    const refund = refunds.find((r) => r.bookingId === b2Id)!;
    const fetched = await getRefundById(companyId, refund.id);
    expect(fetched.id).toBe(refund.id);
    expect(fetched.bookingId).toBe(b2Id);
    expect(fetched.status).toBe('SETTLED');
  });
});
