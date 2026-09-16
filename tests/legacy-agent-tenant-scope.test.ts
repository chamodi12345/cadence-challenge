import 'dotenv/config';
import { describe, it, expect, afterEach } from 'vitest';
import { Pool } from 'pg';
import { findBookingsByAgentCode } from '../src/legacy/bookingRepository';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const stamp = `legacy-ts-${Date.now()}`;
const companyAName = `${stamp}-A`;
const companyBName = `${stamp}-B`;
const companyAId = `${stamp}-A-id`;
const companyBId = `${stamp}-B-id`;

async function cleanup(): Promise<void> {
  await pool.query(
    `DELETE FROM bookings WHERE company_id IN ($1, $2)`,
    [companyAId, companyBId],
  );
  await pool.query(`DELETE FROM agents WHERE company_id IN ($1, $2)`, [companyAId, companyBId]);
  await pool.query(`DELETE FROM companies WHERE id IN ($1, $2)`, [companyAId, companyBId]);
}

afterEach(async () => {
  await cleanup();
});

describe('legacy findBookingsByAgentCode tenant scoping (regression: security)', () => {
  it("must not return another company's bookings for the same agent code", async () => {
    await pool.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [companyAId, companyAName]);
    await pool.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [companyBId, companyBName]);

    // The README calls this out: agent codes are unique per company, not globally.
    // AG-001 exists in both companies, exactly like the seed data.
    await pool.query(
      `INSERT INTO agents (id, company_id, agent_code, full_name) VALUES ($1, $2, 'AG-001', 'A Agent')`,
      [`${companyAId}-agent`, companyAId],
    );
    await pool.query(
      `INSERT INTO agents (id, company_id, agent_code, full_name) VALUES ($1, $2, 'AG-001', 'B Agent')`,
      [`${companyBId}-agent`, companyBId],
    );

    await pool.query(
      `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
       VALUES ($1, $2, 'A-REF', 'AG-001', '2026-03-01', 100.00, 'P')`,
      [`${companyAId}-book-a`, companyAId],
    );
    await pool.query(
      `INSERT INTO bookings (id, company_id, external_ref, agent_code, booking_date, amount, product_code)
       VALUES ($1, $2, 'B-REF', 'AG-001', '2026-03-02', 200.00, 'P')`,
      [`${companyBId}-book-b`, companyBId],
    );

    const rows = await findBookingsByAgentCode(pool, companyAId, 'AG-001');

    expect(rows).toHaveLength(1);
    expect(rows[0].external_ref).toBe('A-REF');
  });
});