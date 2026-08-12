import type { Pool } from 'pg';
import { findBookingsByAgentCode, type BookingRecord } from './bookingRepository';

export interface AgentSummary {
  agentCode: string;
  bookingCount: number;
  gross: number;
  commission: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Totals one agent's bookings for a period and applies a flat rate.
 *
 * `periodStart` / `periodEnd` are ISO `YYYY-MM-DD` and the comparison relies on ISO
 * strings sorting in date order.
 */
export function summariseAgent(
  agentCode: string,
  bookings: BookingRecord[],
  rate: number,
  periodStart: string,
  periodEnd: string,
): AgentSummary {
  const inPeriod = bookings.filter(
    (booking) => booking.booking_date >= periodStart && booking.booking_date <= periodEnd,
  );

  let gross = 0;
  for (const booking of inPeriod) {
    gross += Number(booking.amount);
  }

  return {
    agentCode,
    bookingCount: inPeriod.length,
    gross: round2(gross),
    commission: round2(gross * rate),
  };
}

export async function buildAgentSummary(
  pool: Pool,
  companyId: string,
  agentCode: string,
  rate: number,
  periodStart: string,
  periodEnd: string,
): Promise<AgentSummary> {
  const bookings = await findBookingsByAgentCode(pool, companyId, agentCode);
  return summariseAgent(agentCode, bookings, rate, periodStart, periodEnd);
}
