import type { Pool } from 'pg';
import { logger } from './logger';
import { toOffset, type PageParams } from './pagination';

export interface BookingRecord {
  id: string;
  external_ref: string;
  agent_code: string;
  /** ISO `YYYY-MM-DD`. Cast in SQL so callers never have to deal with a Date object. */
  booking_date: string;
  /** NUMERIC comes back from pg as a string. Left as a string on purpose. */
  amount: string;
  product_code: string;
}

export async function listBookingsForPeriod(
  pool: Pool,
  companyId: string,
  periodStart: string,
  periodEnd: string,
  page: PageParams,
): Promise<{ rows: BookingRecord[]; total: number }> {
  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM bookings
      WHERE company_id = $1
        AND booking_date BETWEEN $2 AND $3`,
    [companyId, periodStart, periodEnd],
  );

  const result = await pool.query<BookingRecord>(
    `SELECT id,
            external_ref,
            agent_code,
            to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
            amount,
            product_code
       FROM bookings
      WHERE company_id = $1
        AND booking_date BETWEEN $2 AND $3
      ORDER BY booking_date, external_ref
      LIMIT $4 OFFSET $5`,
    [companyId, periodStart, periodEnd, page.limit, toOffset(page)],
  );

  return { rows: result.rows, total: Number(totalResult.rows[0]?.count ?? '0') };
}

/**
 * Used by the agent summary report to pull one agent's bookings.
 */
export async function findBookingsByAgentCode(
  pool: Pool,
  companyId: string,
  agentCode: string,
): Promise<BookingRecord[]> {
  logger.debug('loading bookings for agent', { companyId, agentCode });

  const result = await pool.query<BookingRecord>(
    `SELECT id,
            external_ref,
            agent_code,
            to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
            amount,
            product_code
       FROM bookings
      WHERE agent_code = $1
      ORDER BY booking_date, external_ref`,
    [agentCode],
  );

  return result.rows;
}
