import Decimal from 'decimal.js';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RuleSetRow {
  id: string;
  effectiveFrom: string;
}
interface TierRow {
  minVolume: string;
  maxVolume: string | null;
  rate: string;
}
interface OverrideRow {
  productCode: string;
  rate: string;
}
interface BookingRow {
  agentCode: string;
  amount: string;
  productCode: string;
}

export interface LineItem {
  id: string;
  agentId: string;
  agentCode: string;
  bookingCount: number;
  grossVolume: string;
  commissionAmount: string;
  ratesApplied: string;
}

export interface PayoutRun {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'FINALISED';
  lineItems: LineItem[];
  totalCommission: string;
}

function monthToRange(period: string): { start: string; end: string } {
  // period is "YYYY-MM"
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new HttpError(400, 'period must be in YYYY-MM format');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = `${match[1]}-${match[2]}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Resolves which commission rule set applies to a given period: the one with
 * the latest effective_from that is still <= the period's start date. This
 * is what makes past payouts stable even if rules change later — a run
 * always looks up "what was true on this date", never "what's true now".
 */
async function resolveRuleSet(
  companyId: string,
  periodStart: string,
): Promise<{ tiers: TierRow[]; overrides: OverrideRow[] }> {
  const { rows } = await pool.query<RuleSetRow>(
    `SELECT id, effective_from AS "effectiveFrom"
       FROM commission_rule_sets
      WHERE company_id = $1 AND effective_from <= $2
      ORDER BY effective_from DESC
      LIMIT 1`,
    [companyId, periodStart],
  );
  const ruleSet = rows[0];
  if (!ruleSet) {
    throw new HttpError(
      409,
      `No commission rule set is effective on or before ${periodStart}. Create one before generating a payout run for this period.`,
    );
  }

  const { rows: tiers } = await pool.query<TierRow>(
    `SELECT min_volume AS "minVolume", max_volume AS "maxVolume", rate
       FROM commission_tiers WHERE rule_set_id = $1 ORDER BY min_volume ASC`,
    [ruleSet.id],
  );
  const { rows: overrides } = await pool.query<OverrideRow>(
    `SELECT product_code AS "productCode", rate
       FROM commission_product_overrides WHERE rule_set_id = $1`,
    [ruleSet.id],
  );

  return { tiers, overrides };
}

function tierRateFor(volume: Decimal, tiers: TierRow[]): Decimal {
  for (const tier of tiers) {
    const min = new Decimal(tier.minVolume);
    const max = tier.maxVolume ? new Decimal(tier.maxVolume) : null;
    if (volume.gte(min) && (max === null || volume.lte(max))) {
      return new Decimal(tier.rate);
    }
  }
  // Shouldn't happen if tiers are well-formed (open-ended top tier), but fail
  // loudly rather than silently applying a 0% rate.
  throw new HttpError(500, `No tier matches volume ${volume.toString()} — rule set is misconfigured`);
}

/**
 * Generates (or regenerates) a DRAFT run for a company + period. Regeneration
 * is only allowed while the run is DRAFT — a FINALISED run is immutable, so
 * this function refuses to touch one.
 */
export async function generatePayoutRun(companyId: string, period: string): Promise<PayoutRun> {
  const { start, end } = monthToRange(period);

  const { rows: existingRuns } = await pool.query<{ id: string; status: string }>(
    `SELECT id, status FROM payout_runs
      WHERE company_id = $1 AND period_start = $2 AND period_end = $3`,
    [companyId, start, end],
  );
  const existing = existingRuns[0];
  if (existing?.status === 'FINALISED') {
    throw new HttpError(
      409,
      'A finalised run already exists for this period and cannot be regenerated. Finalised runs are immutable.',
    );
  }

  const { tiers, overrides } = await resolveRuleSet(companyId, start);
  const overrideMap = new Map(overrides.map((o) => [o.productCode.toUpperCase(), new Decimal(o.rate)]));

  const { rows: bookings } = await pool.query<BookingRow>(
    `SELECT agent_code AS "agentCode", amount, product_code AS "productCode"
       FROM bookings
      WHERE company_id = $1 AND booking_date >= $2 AND booking_date <= $3`,
    [companyId, start, end],
  );

  const { rows: agents } = await pool.query<{ id: string; agentCode: string }>(
    `SELECT id, agent_code AS "agentCode" FROM agents WHERE company_id = $1`,
    [companyId],
  );
  const agentIdByCode = new Map(agents.map((a) => [a.agentCode, a.id]));

  // Group bookings by agent.
  const byAgent = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const list = byAgent.get(b.agentCode) ?? [];
    list.push(b);
    byAgent.set(b.agentCode, list);
  }

  const lineItems: Omit<LineItem, 'id'>[] = [];
  let runTotal = new Decimal(0);

  for (const [agentCode, agentBookings] of byAgent) {
    const grossVolume = agentBookings.reduce((sum, b) => sum.plus(b.amount), new Decimal(0));
    const tierRate = tierRateFor(grossVolume, tiers);

    let commission = new Decimal(0);
    const ratesUsed = new Set<string>([`${tierRate.times(100).toString()}% tier`]);

    for (const b of agentBookings) {
      const productRate = overrideMap.get(b.productCode.toUpperCase());
      const rate = productRate ?? tierRate;
      if (productRate) ratesUsed.add(`${b.productCode} override ${productRate.times(100).toString()}%`);
      commission = commission.plus(new Decimal(b.amount).times(rate));
    }
    commission = commission.toDecimalPlaces(2);
    runTotal = runTotal.plus(commission);

    const agentId = agentIdByCode.get(agentCode);
    if (!agentId) continue; // orphaned agent_code shouldn't happen given import validates it, but guard anyway

    lineItems.push({
      agentId,
      agentCode,
      bookingCount: agentBookings.length,
      grossVolume: grossVolume.toDecimalPlaces(2).toString(),
      commissionAmount: commission.toString(),
      ratesApplied: Array.from(ratesUsed).join('; '),
    });
  }

  // Team-lead override: 1% flat, per team led, on the OTHER members' volume
  // only — the lead's own sales are already commissioned via their personal
  // tier above, so this avoids double-counting. Not effective-dated: reflects
  // current team membership, not a historical snapshot (Known Gap).
  const { rows: leadTeams } = await pool.query<{ teamId: string; leadAgentId: string }>(
    `SELECT t.id AS "teamId", tm.agent_id AS "leadAgentId"
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id AND tm.is_lead = true
      WHERE t.company_id = $1`,
    [companyId],
  );

  for (const { teamId, leadAgentId } of leadTeams) {
    const { rows: memberVolumeRows } = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(b.amount), 0)::text AS total
         FROM bookings b
         JOIN agents a ON a.agent_code = b.agent_code AND a.company_id = b.company_id
         JOIN team_members tm ON tm.agent_id = a.id AND tm.team_id = $1 AND tm.is_lead = false
        WHERE b.company_id = $2 AND b.booking_date >= $3 AND b.booking_date <= $4`,
      [teamId, companyId, start, end],
    );

    const teamVolume = new Decimal(memberVolumeRows[0]?.total ?? '0');
    if (teamVolume.isZero()) continue;

    const overrideAmount = teamVolume.times(0.01).toDecimalPlaces(2);
    const leadAgentCode = agents.find((a) => a.id === leadAgentId)?.agentCode;
    if (!leadAgentCode) continue;

    const existingLine = lineItems.find((li) => li.agentId === leadAgentId);
    if (existingLine) {
      existingLine.commissionAmount = new Decimal(existingLine.commissionAmount)
        .plus(overrideAmount)
        .toString();
      existingLine.ratesApplied += `; team override 1% (Rs ${overrideAmount.toString()})`;
    } else {
      lineItems.push({
        agentId: leadAgentId,
        agentCode: leadAgentCode,
        bookingCount: 0,
        grossVolume: '0.00',
        commissionAmount: overrideAmount.toString(),
        ratesApplied: `team override 1% (Rs ${overrideAmount.toString()})`,
      });
    }
    runTotal = runTotal.plus(overrideAmount);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let runId: string;
    if (existing) {
      runId = existing.id;
      await client.query('DELETE FROM payout_line_items WHERE run_id = $1', [runId]);
      await client.query(`UPDATE payout_runs SET status = 'DRAFT' WHERE id = $1`, [runId]);
    } else {
      const { rows: countRows } = await client.query<{ count: string }>(
        'SELECT COUNT(*) FROM payout_runs WHERE company_id = $1',
        [companyId],
      );
      const runNo = Number(countRows[0]?.count ?? '0') + 1;
      runId = randomUUID();
      await client.query(
        `INSERT INTO payout_runs (id, company_id, run_no, period_start, period_end, status)
         VALUES ($1, $2, $3, $4, $5, 'DRAFT')`,
        [runId, companyId, runNo, start, end],
      );
    }

    for (const item of lineItems) {
      await client.query(
        `INSERT INTO payout_line_items
           (id, run_id, agent_id, agent_code, booking_count, gross_volume, commission_amount, rates_applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          runId,
          item.agentId,
          item.agentCode,
          item.bookingCount,
          item.grossVolume,
          item.commissionAmount,
          item.ratesApplied,
        ],
      );
    }

    await client.query('COMMIT');
    return getPayoutRun(companyId, runId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getPayoutRun(companyId: string, runId: string): Promise<PayoutRun> {
  const { rows: runRows } = await pool.query(
    `SELECT id, company_id AS "companyId", period_start AS "periodStart",
            period_end AS "periodEnd", status
       FROM payout_runs WHERE id = $1 AND company_id = $2`,
    [runId, companyId],
  );
  const run = runRows[0];
  if (!run) throw new HttpError(404, 'Payout run not found');

  const { rows: lineItems } = await pool.query<LineItem>(
    `SELECT id, agent_id AS "agentId", agent_code AS "agentCode",
            booking_count AS "bookingCount", gross_volume AS "grossVolume",
            commission_amount AS "commissionAmount", rates_applied AS "ratesApplied"
       FROM payout_line_items WHERE run_id = $1 ORDER BY agent_code ASC`,
    [runId],
  );

  const totalCommission = lineItems
    .reduce((sum, li) => sum.plus(li.commissionAmount), new Decimal(0))
    .toString();

  return { ...run, lineItems, totalCommission };
}

export async function listPayoutRuns(companyId: string): Promise<Omit<PayoutRun, 'lineItems'>[]> {
  const { rows } = await pool.query(
    `SELECT pr.id, pr.company_id AS "companyId", pr.period_start AS "periodStart",
            pr.period_end AS "periodEnd", pr.status,
            COALESCE(SUM(li.commission_amount), 0)::text AS "totalCommission"
       FROM payout_runs pr
       LEFT JOIN payout_line_items li ON li.run_id = pr.id
      WHERE pr.company_id = $1
      GROUP BY pr.id
      ORDER BY pr.period_start DESC`,
    [companyId],
  );
  return rows;
}

export async function finalizePayoutRun(companyId: string, runId: string): Promise<PayoutRun> {
  const run = await getPayoutRun(companyId, runId);
  if (run.status === 'FINALISED') {
    throw new HttpError(409, 'This run is already finalised.');
  }
  await pool.query(`UPDATE payout_runs SET status = 'FINALISED' WHERE id = $1 AND company_id = $2`, [
    runId,
    companyId,
  ]);
  return getPayoutRun(companyId, runId);
}