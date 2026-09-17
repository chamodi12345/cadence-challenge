import { describe, expect, it } from 'vitest';
import { calculateCommission } from './commission';
import type { CommissionBooking, OverrideRow, TierRow } from './commission';

/* ------------------------------------------------------------------ */
/* Test fixtures                                                      */
/* ------------------------------------------------------------------ */

const TIERS: TierRow[] = [
  { minVolume: '0', maxVolume: '500000', rate: '0.03' },       // 0–500k  → 3 %
  { minVolume: '500000.01', maxVolume: '2000000', rate: '0.05' }, // 500k–2m → 5 %
  { minVolume: '2000000.01', maxVolume: null, rate: '0.07' },  // >2m     → 7 %
];

function booking(agentCode: string, amount: string, productCode = 'P'): CommissionBooking {
  return { agentCode, amount, productCode };
}

/* ------------------------------------------------------------------ */
/* Tier semantics                                                     */
/* ------------------------------------------------------------------ */

describe('calculateCommission — tier selection', () => {
  it('applies the lowest tier flat rate to a volume that falls within it', () => {
    const items = calculateCommission([booking('AG-001', '100000')], TIERS, []);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      agentCode: 'AG-001',
      bookingCount: 1,
      grossVolume: '100000',
      commissionAmount: '3000', // 100000 × 3 %
      ratesApplied: '3% tier',
    });
  });

  it('applies the middle-tier flat rate to the whole volume', () => {
    // 600k total → falls in middle band. Flat 5 % on 600k = 30k.
    const items = calculateCommission([booking('AG-001', '600000')], TIERS, []);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      agentCode: 'AG-001',
      grossVolume: '600000',
      commissionAmount: '30000',
    });
  });

  it('applies the top-tier open-ended rate to volumes above the highest tier', () => {
    const items = calculateCommission(
      [booking('AG-001', '1500000'), booking('AG-001', '600000')],
      TIERS,
      [],
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      agentCode: 'AG-001',
      grossVolume: '2100000',
      commissionAmount: '147000', // 2 100 000 × 7 %
      ratesApplied: '7% tier',
    });
  });

  it('uses the tier selected by total monthly volume for every booking in that month', () => {
    // Two bookings: 400k + 150k = 550k → middle tier (5 %).
    // A naïve marginal calc would differ: 500k×3 % + 50k×5 % = 17 500.
    // Our flat-on-whole-volume model: 550k × 5 % = 27 500.
    const items = calculateCommission(
      [booking('AG-001', '400000'), booking('AG-001', '150000')],
      TIERS,
      [],
    );
    expect(items[0]?.commissionAmount).toBe('27500');
  });

  it('throws when no tier matches the volume (rule set is misconfigured)', () => {
    // Tight bands with no open-ended top tier — 600k cannot be matched.
    const tightTiers: TierRow[] = [
      { minVolume: '0', maxVolume: '500000', rate: '0.03' },
    ];
    expect(() =>
      calculateCommission([booking('AG-001', '600000')], tightTiers, []),
    ).toThrow(/No tier matches volume 600000/);
  });
});

/* ------------------------------------------------------------------ */
/* Product overrides                                                  */
/* ------------------------------------------------------------------ */

describe('calculateCommission — product overrides', () => {
  it('replaces the tier rate for bookings of the overridden product', () => {
    const overrides: OverrideRow[] = [{ productCode: 'VISA', rate: '0.02' }];
    const items = calculateCommission(
      [
        booking('AG-001', '100000', 'VISA'),
        booking('AG-001', '50000', 'CASH'),
      ],
      TIERS,
      overrides,
    );

    expect(items[0]).toMatchObject({
      bookingCount: 2,
      grossVolume: '150000',
      commissionAmount: '3500', // VISA 100k×2 % + CASH 50k×3 %
    });
    // The description should mention the override.
    expect(items[0]?.ratesApplied).toContain('VISA override 2%');
  });
});

/* ------------------------------------------------------------------ */
/* Multi-agent grouping                                               */
/* ------------------------------------------------------------------ */

describe('calculateCommission — multi-agent', () => {
  it('groups bookings by agent and produces one item per agent', () => {
    const items = calculateCommission(
      [
        booking('AG-001', '100000'),
        booking('AG-002', '200000'),
      ],
      TIERS,
      [],
    );

    expect(items).toHaveLength(2);
    expect(items.find((i) => i.agentCode === 'AG-001')?.commissionAmount).toBe('3000');
    expect(items.find((i) => i.agentCode === 'AG-002')?.commissionAmount).toBe('6000');
  });
});

/* ------------------------------------------------------------------ */
/* Precision / rounding                                               */
/* ------------------------------------------------------------------ */

describe('calculateCommission — rounding', () => {
  it('rounds commission to 2 decimal places using standard banker-half-up', () => {
    // 0.3 × 7 % = 0.021 → rounded to 0.02.
    const items = calculateCommission(
      [
        booking('AG-001', '0.10'),
        booking('AG-001', '0.20'),
      ],
      [{ minVolume: '0', maxVolume: null, rate: '0.07' }],
      [],
    );
    expect(items[0]?.grossVolume).toBe('0.3');
    expect(items[0]?.commissionAmount).toBe('0.02');
  });
});