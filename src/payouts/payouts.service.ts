import Decimal from 'decimal.js';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { calculateCommission } from './commission';
import type { TierRow, OverrideRow } from './commission';
import { HttpError } from '../lib/HttpError';

export { HttpError };

interface RuleSetRow {
  id: string;
  effectiveFrom: string;
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

/**
 * Generates (or regenerates) a DRAFT run for a company + period. Regeneration
 * is only allowed while the run is DRAFT — a FINALISED run is immutable, so
 * this function refuses to touch one.
 *
 * Run-number and same-period safety: the company row is locked with
 * `SELECT ... FOR UPDATE` inside the transaction, so two concurrent
 * generatePayoutRun calls for the same company serialize — exactly one
 * creates a new run row and the other reuses it (or 409s if finalised).
 *
 * run_no is computed as `MAX(run_no) + 1` (not COUNT+1). The original
 * COUNT-based approach would collide if a run row were ever deleted,
 * because COUNT shrinks but MAX stays — MAX+1 always produces a number
 * strictly above any surviving run_no.
 */
export async function generatePayoutRun(companyId: string, period: string): Promise<PayoutRun> {
  const { start, end } = monthToRange(period);

  const { tiers, overrides } = await resolveRuleSet(companyId, start);

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

  // Pure commission calculation (no side effects, fully unit-testable).
  const commissionItems = calculateCommission(bookings, tiers, overrides);

  const lineItems: Omit<LineItem, 'id'>[] = [];
  for (const item of commissionItems) {
    const agentId = agentIdByCode.get(item.agentCode);
    if (!agentId) continue; // orphaned agent_code — guarded by import validation
    lineItems.push({ ...item, agentId });
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
  }

  // --- persistence inside a transaction ------------------------------------
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Serialise concurrent run generation and finalisation per company.
    // Two concurrent calls either create one run (the second reuses the
    // first's) or one sees FINALISED and 409s — never duplicates.
    await client.query('SELECT id FROM companies WHERE id = $1 FOR UPDATE', [companyId]);

    // Check for an existing run INSIDE the transaction after the lock.
    const { rows: existingRuns } = await client.query<{ id: string; status: string }>(
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

    let runId: string;
    if (existing) {
      runId = existing.id;
      await client.query('DELETE FROM payout_line_items WHERE run_id = $1', [runId]);
      await client.query(`UPDATE payout_runs SET status = 'DRAFT' WHERE id = $1`, [runId]);
    } else {
      // MAX(run_no)+1 under the company-row lock: no duplicate run_no is
      // possible, and MAX is safe if earlier runs have been deleted.
      const { rows: maxRows } = await client.query<{ next: string }>(
        'SELECT COALESCE(MAX(run_no), 0) + 1 AS next FROM payout_runs WHERE company_id = $1',
        [companyId],
      );
      const runNo = Number(maxRows[0]?.next ?? '1');
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

/**
 * Finalises a payout run atomically.
 *
 * The conditional `UPDATE ... WHERE status = 'DRAFT'` ensures that exactly
 * one of two concurrent finalise requests succeeds — Postgres acquires a
 * row-level lock on the `payout_runs` row, so the second UPDATE re-evaluates
 * the WHERE clause after the first commits, sees status = 'FINALISED', and
 * touches zero rows (409).
 */
export async function finalizePayoutRun(companyId: string, runId: string): Promise<PayoutRun> {
  const result = await pool.query(
    `UPDATE payout_runs SET status = 'FINALISED'
      WHERE id = $1 AND company_id = $2 AND status = 'DRAFT'`,
    [runId, companyId],
  );

  if (result.rowCount === 0) {
    // Distinguish 404 (no run) from 409 (already finalised).
    await getPayoutRun(companyId, runId); // throws HttpError(404) if missing
    throw new HttpError(409, 'This run is not in DRAFT status and cannot be finalised.');
  }

  return getPayoutRun(companyId, runId);
}