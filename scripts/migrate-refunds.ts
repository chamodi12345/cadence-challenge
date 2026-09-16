import 'dotenv/config';
import { pool } from '../src/db/pool';

/**
 * Non-destructive migration: adds the `refunds` table to an existing database
 * that was created before schema.sql included it. Idempotent — safe to run
 * repeatedly.
 *
 * db/schema.sql (used by `npm run db:reset`) is the source of truth for fresh
 * installs; this script exists so current local dev data does not need to be
 * wiped.
 *
 * Usage: npx tsx scripts/migrate-refunds.ts
 */
async function main(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refunds (
      id             TEXT PRIMARY KEY,
      company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      booking_id     TEXT NOT NULL REFERENCES bookings(id),
      amount         NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
      refund_date    DATE NOT NULL,
      reason         TEXT,
      settled_run_id TEXT REFERENCES payout_runs(id),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT refunds_booking_unique UNIQUE (booking_id)
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS refunds_company_date_idx ON refunds (company_id, refund_date)',
  );
  await pool.query(
    'ALTER TABLE payout_runs ADD COLUMN IF NOT EXISTS finalised_at TIMESTAMPTZ',
  );
  console.log('migrate-refunds: refunds table + payout_runs.finalised_at are present');
  await pool.end();
}

main().catch((err) => {
  console.error('migrate-refunds failed:', err);
  process.exitCode = 1;
});