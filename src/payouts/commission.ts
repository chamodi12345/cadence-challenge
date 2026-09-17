import Decimal from 'decimal.js';
import { HttpError } from '../lib/HttpError';

/* ---------- types consumed / produced by the pure calculator ---------- */

export interface TierRow {
  minVolume: string;
  maxVolume: string | null;
  rate: string;
}

export interface OverrideRow {
  productCode: string;
  rate: string;
}

export interface CommissionBooking {
  agentCode: string;
  amount: string;
  productCode: string;
}

export interface CommissionItem {
  agentCode: string;
  bookingCount: number;
  grossVolume: string;
  commissionAmount: string;
  ratesApplied: string;
}

/* ---------- helpers ---------- */

function tierRateFor(volume: Decimal, tiers: TierRow[]): Decimal {
  for (const tier of tiers) {
    const min = new Decimal(tier.minVolume);
    const max = tier.maxVolume ? new Decimal(tier.maxVolume) : null;
    if (volume.gte(min) && (max === null || volume.lte(max))) {
      return new Decimal(tier.rate);
    }
  }
  throw new HttpError(500, `No tier matches volume ${volume.toString()} — rule set is misconfigured`);
}

/**
 * Pure calculation of commission line items for one period.
 *
 * Behaviour: the tier determines a **flat** rate that is applied to the whole
 * monthly gross volume (not marginal). A per-product override replaces the
 * tier rate for bookings of that product only.
 *
 * This function has no side-effects and no dependency on the database.
 */
export function calculateCommission(
  bookings: CommissionBooking[],
  tiers: TierRow[],
  overrides: OverrideRow[],
): CommissionItem[] {
  const overrideMap = new Map<string, Decimal>(
    overrides.map((o) => [o.productCode.toUpperCase(), new Decimal(o.rate)]),
  );

  const byAgent = new Map<string, CommissionBooking[]>();
  for (const b of bookings) {
    const list = byAgent.get(b.agentCode) ?? [];
    list.push(b);
    byAgent.set(b.agentCode, list);
  }

  const items: CommissionItem[] = [];

  for (const [agentCode, agentBookings] of byAgent) {
    const grossVolume = agentBookings.reduce((sum, b) => sum.plus(b.amount), new Decimal(0));
    const tierRate = tierRateFor(grossVolume, tiers);

    let commission = new Decimal(0);
    const ratesUsed = new Set<string>([`${tierRate.times(100).toString()}% tier`]);

    for (const b of agentBookings) {
      const productRate = overrideMap.get(b.productCode.toUpperCase());
      const rate = productRate ?? tierRate;
      if (productRate) {
        ratesUsed.add(`${b.productCode} override ${productRate.times(100).toString()}%`);
      }
      commission = commission.plus(new Decimal(b.amount).times(rate));
    }
    commission = commission.toDecimalPlaces(2);

    items.push({
      agentCode,
      bookingCount: agentBookings.length,
      grossVolume: grossVolume.toDecimalPlaces(2).toString(),
      commissionAmount: commission.toString(),
      ratesApplied: Array.from(ratesUsed).join('; '),
    });
  }

  return items;
}
