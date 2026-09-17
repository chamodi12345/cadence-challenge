import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db/pool';
import {
  generatePayoutRun,
  finalizePayoutRun,
  HttpError,
} from '../src/payouts/payouts.service';

const companyId = `payout-race-${randomUUID()}`;

beforeAll(async () => {
  await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [
    companyId,
    'Payout Concurrency Fixture',
  ]);

  await pool.query(
    `INSERT INTO agents (id, company_id, agent_code, full_name) VALUES ($1, $2, 'AG-001', 'Fixture Agent')`,
    [`${companyId}-agent`, companyId],
  );

  const ruleSetId = `${companyId}-rules`;
  await pool.query(
    `INSERT INTO commission_rule_sets (id, company_id, label, effective_from) VALUES ($1, $2, 'Fixture rules', '2026-01-01')`,
    [ruleSetId, companyId],
  );
  await pool.query(
    `INSERT INTO commission_tiers (id, rule_set_id, min_volume, max_volume, rate) VALUES ($1, $2, 0, 500000, 0.03)`,
    [`${ruleSetId}-t1`, ruleSetId],
  );
  await pool.query(
    `INSERT INTO commission_tiers (id, rule_set_id, min_volume, max_volume, rate) VALUES ($1, $2, 500000.01, NULL, 0.05)`,
    [`${ruleSetId}-t2`, ruleSetId],
  );

  await pool.query(
    `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
     VALUES ($1, $2, 'RACE-A1', 'AG-001', '2026-06-15', 100000, 'P')`,
    [`${companyId}-book-a1`, companyId],
  );
});

afterAll(async () => {
  // payout_line_items.agent_id has no ON DELETE CASCADE, so the runs must go
  // first (line items cascade away with their run) before agents/company.
  await pool.query('DELETE FROM payout_runs WHERE company_id = $1', [companyId]);
  // Company deletion then cascades: agents, bookings, rule sets (+ tiers).
  await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
});

describe('concurrency safety (S2)', () => {
  it('exactly one of two simultaneous finalise requests wins', async () => {
    const run = await generatePayoutRun(companyId, '2026-06');

    const results = await Promise.allSettled([
      finalizePayoutRun(companyId, run.id),
      finalizePayoutRun(companyId, run.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const loser = rejected[0];
    expect(loser.status).toBe('rejected');
    if (loser.status === 'rejected' && loser.reason instanceof HttpError) {
      expect(loser.reason.status).toBe(409);
    }

    // The run ends up FINALISED exactly once.
    const { rows } = await pool.query('SELECT status FROM payout_runs WHERE id = $1', [run.id]);
    expect(rows[0]?.status).toBe('FINALISED');
  });

  it('two concurrent generates for the same period produce exactly one run', async () => {
    const results = await Promise.allSettled([
      generatePayoutRun(companyId, '2026-07'),
      generatePayoutRun(companyId, '2026-07'),
    ]);

    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM payout_runs WHERE company_id = $1 AND period_start = '2026-07-01'`,
      [companyId],
    );
    expect(rows).toHaveLength(1);

    // Any fulfilled call must have resolved to that single run id.
    for (const r of results) {
      if (r.status === 'fulfilled') expect(r.value.id).toBe(rows[0]?.id);
    }
  });

  it('concurrent generates for different periods mint distinct, increasing run numbers', async () => {
    const results = await Promise.allSettled([
      generatePayoutRun(companyId, '2026-08'),
      generatePayoutRun(companyId, '2026-09'),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(2);

    const { rows } = await pool.query<{ run_no: number }>(
      `SELECT run_no FROM payout_runs
        WHERE company_id = $1 AND period_start IN ('2026-08-01', '2026-09-01')
        ORDER BY period_start ASC`,
      [companyId],
    );

    const runNos = rows.map((r) => r.run_no);
    expect(runNos).toHaveLength(2);
    expect(new Set(runNos).size).toBe(2); // no duplicates
  });
});