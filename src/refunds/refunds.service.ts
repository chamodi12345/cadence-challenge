import Decimal from 'decimal.js';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { HttpError } from '../lib/HttpError';
import type { CreateRefundInput } from './refunds.schema';

export { HttpError };

export interface Refund {
  id: string;
  companyId: string;
  bookingId: string;
  amount: string;
  refundDate: string;
  reason: string | null;
  settledRunId: string | null;
  createdAt: string;
  status: 'PENDING_SETTLEMENT' | 'SETTLED';
}

function toRefund(row: Record<string, unknown>): Refund {
  const settledRunId = typeof row.settledRunId === 'string' && row.settledRunId ? row.settledRunId : null;
  return {
    id: row.id as string,
    companyId: row.companyId as string,
    bookingId: row.bookingId as string,
    amount: row.amount as string,
    refundDate: row.refundDate as string,
    reason: typeof row.reason === 'string' && row.reason ? row.reason : null,
    settledRunId,
    createdAt: new Date(row.createdAt as string).toISOString(),
    status: settledRunId ? 'SETTLED' : 'PENDING_SETTLEMENT',
  };
}

/**
 * Records a refund for a single booking.
 *
 * Validation performed here (never in raw SQL — amounts are compared via
 * NUMERIC casts so string vs numeric comparison is exact):
 *   - the booking exists and belongs to the caller's company;
 *   - the booking has not already been refunded (one refund per booking);
 *   - the refund amount is positive and <= the booking's original amount;
 *   - the refund date is not before the booking date.
 *
 * The refund is *not* applied to any payout run at this point. How it is
 * recovered depends on the state of the run for the booking's period:
 *   - booking period FINALISED and refund recorded after finalisation -> the
 *     next payout run claws it back (see computeClawbacks in payouts.service);
 *   - booking period DRAFT/not yet run -> the next generate excludes the
 *     refunded booking entirely, so it is never paid out (Known Gap: the
 *     partial case between generate and finalise is documented in ADR-0002).
 */
export async function createRefund(companyId: string, input: CreateRefundInput): Promise<Refund> {
  const refundDate = input.refundDate;

  const { rows: bookingRows } = await pool.query<{
    id: string;
    booking_date: string;
    amount: string;
  }>(
    `SELECT id, booking_date, amount::text FROM bookings WHERE id = $1 AND company_id = $2`,
    [input.bookingId, companyId],
  );
  const booking = bookingRows[0];
  if (!booking) throw new HttpError(404, 'Booking not found');

  if (refundDate < booking.booking_date) {
    throw new HttpError(400, 'refundDate cannot be before the booking date');
  }

  const bookingAmount = new Decimal(booking.amount);
  if (bookingAmount.lessThanOrEqualTo(0)) {
    throw new HttpError(409, 'Cannot refund a booking with a non-positive amount');
  }
  if (bookingAmount.lessThan(input.amount)) {
    throw new HttpError(
      400,
      `refund amount exceeds the booking amount (${bookingAmount.toString()})`,
    );
  }

  // Reserve the row first so two concurrent createRefund calls for the same
  // booking cannot both pass the duplicate check (they serialize on this
  // row's lock).
  const { rows: lockRows } = await pool.query(
    'SELECT id FROM bookings WHERE id = $1 FOR UPDATE',
    [input.bookingId],
  );
  if (lockRows.length === 0) throw new HttpError(404, 'Booking not found');

  const { rows: existingRows } = await pool.query<{ id: string }>(
    'SELECT id FROM refunds WHERE booking_id = $1',
    [input.bookingId],
  );
  if (existingRows.length > 0) throw new HttpError(409, 'This booking has already been refunded');

  const id = randomUUID();
  await pool.query(
    `INSERT INTO refunds (id, company_id, booking_id, amount, refund_date, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, companyId, booking.id, input.amount, refundDate, input.reason ?? null],
  );

  return getRefundById(companyId, id);
}

export async function listRefunds(companyId: string): Promise<Refund[]> {
  const { rows } = await pool.query(
    `SELECT id, company_id AS "companyId", booking_id AS "bookingId",
            amount::text AS amount, refund_date AS "refundDate", reason,
            settled_run_id AS "settledRunId", created_at AS "createdAt"
       FROM refunds
      WHERE company_id = $1
      ORDER BY refund_date DESC, created_at DESC`,
    [companyId],
  );
  return rows.map(toRefund);
}

export async function getRefundById(companyId: string, refundId: string): Promise<Refund> {
  const { rows } = await pool.query(
    `SELECT id, company_id AS "companyId", booking_id AS "bookingId",
            amount::text AS amount, refund_date AS "refundDate", reason,
            settled_run_id AS "settledRunId", created_at AS "createdAt"
       FROM refunds
      WHERE id = $1 AND company_id = $2`,
    [refundId, companyId],
  );
  const refund = rows[0];
  if (!refund) throw new HttpError(404, 'Refund not found');
  return toRefund(refund);
}