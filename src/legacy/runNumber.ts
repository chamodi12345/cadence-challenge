import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { logger } from './logger';

/**
 * Payout run numbers are sequential per company and appear on the payslip Finance sends
 * to agents, so two runs in one company must never share a number.
 */
export async function nextRunNumber(pool: Pool, companyId: string): Promise<number> {
  const result = await pool.query<{ next: string }>(
    `SELECT COALESCE(MAX(run_no), 0) + 1 AS next
       FROM payout_runs
      WHERE company_id = $1`,
    [companyId],
  );

  return Number(result.rows[0]?.next ?? '1');
}

export async function createPayoutRun(
  pool: Pool,
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ id: string; runNo: number }> {
  const runNo = await nextRunNumber(pool, companyId);
  const id = `run_${randomUUID()}`;

  await pool.query(
    `INSERT INTO payout_runs (id, company_id, run_no, period_start, period_end, status)
     VALUES ($1, $2, $3, $4, $5, 'DRAFT')`,
    [id, companyId, runNo, periodStart, periodEnd],
  );

  logger.info('payout run created', { companyId, runNo, periodStart, periodEnd });

  return { id, runNo };
}
