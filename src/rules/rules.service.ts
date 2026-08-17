import { pool } from '../db/pool';
import type { CreateRuleSetInput, UpdateRuleSetInput } from './rules.schema';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface TierRow {
  id: string;
  minVolume: string;
  maxVolume: string | null;
  rate: number;
}

interface ProductOverrideRow {
  id: string;
  productCode: string;
  rate: number;
}

interface RuleSetRow {
  id: string;
  companyId: string;
  label: string;
  effectiveFrom: string;
  createdAt: string;
  tiers: TierRow[];
  productOverrides: ProductOverrideRow[];
}

// A rule set is "locked" once its effective date has arrived — it is now (or was)
// live, and payout runs may already have resolved against it. Only a future-dated
// rule set can still be edited or deleted. This is what keeps computed history stable
// when someone changes commission terms going forward.
function isLocked(effectiveFrom: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return effectiveFrom <= today;
}

export async function listRuleSets(companyId: string): Promise<RuleSetRow[]> {
  const { rows: ruleSets } = await pool.query(
    `SELECT id, company_id AS "companyId", label, effective_from AS "effectiveFrom",
            created_at AS "createdAt"
       FROM commission_rule_sets
      WHERE company_id = $1
      ORDER BY effective_from DESC`,
    [companyId],
  );

  const results: RuleSetRow[] = [];
  for (const rs of ruleSets) {
    results.push({ ...rs, ...(await loadChildren(rs.id)) });
  }
  return results;
}

export async function getRuleSet(companyId: string, id: string): Promise<RuleSetRow> {
  const { rows } = await pool.query(
    `SELECT id, company_id AS "companyId", label, effective_from AS "effectiveFrom",
            created_at AS "createdAt"
       FROM commission_rule_sets
      WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
  const ruleSet = rows[0];
  if (!ruleSet) throw new HttpError(404, 'Rule set not found');
  return { ...ruleSet, ...(await loadChildren(id)) };
}

async function loadChildren(
  ruleSetId: string,
): Promise<{ tiers: TierRow[]; productOverrides: ProductOverrideRow[] }> {
  const { rows: tiers } = await pool.query(
    `SELECT id, min_volume AS "minVolume", max_volume AS "maxVolume", rate
       FROM commission_tiers
      WHERE rule_set_id = $1
      ORDER BY min_volume ASC`,
    [ruleSetId],
  );
  const { rows: productOverrides } = await pool.query(
    `SELECT id, product_code AS "productCode", rate
       FROM commission_product_overrides
      WHERE rule_set_id = $1
      ORDER BY product_code ASC`,
    [ruleSetId],
  );
  return { tiers, productOverrides };
}

export async function createRuleSet(
  companyId: string,
  input: CreateRuleSetInput,
): Promise<RuleSetRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO commission_rule_sets (company_id, label, effective_from)
       VALUES ($1, $2, $3)
       RETURNING id, company_id AS "companyId", label, effective_from AS "effectiveFrom",
                 created_at AS "createdAt"`,
      [companyId, input.label, input.effectiveFrom],
    );
    const ruleSet = rows[0];

    for (const tier of input.tiers) {
      await client.query(
        `INSERT INTO commission_tiers (rule_set_id, min_volume, max_volume, rate)
         VALUES ($1, $2, $3, $4)`,
        [ruleSet.id, tier.minVolume, tier.maxVolume, tier.rate],
      );
    }

    for (const override of input.productOverrides) {
      await client.query(
        `INSERT INTO commission_product_overrides (rule_set_id, product_code, rate)
         VALUES ($1, $2, $3)`,
        [ruleSet.id, override.productCode, override.rate],
      );
    }

    await client.query('COMMIT');
    return { ...ruleSet, ...(await loadChildren(ruleSet.id)) };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
      throw new HttpError(409, 'A rule set with this effective date already exists');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateRuleSet(
  companyId: string,
  id: string,
  input: UpdateRuleSetInput,
): Promise<RuleSetRow> {
  const existing = await getRuleSet(companyId, id);
  if (isLocked(existing.effectiveFrom)) {
    throw new HttpError(
      409,
      'This rule set is already effective or in the past and cannot be modified. Create a new rule set with a future effective date instead.',
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (input.label !== undefined || input.effectiveFrom !== undefined) {
      await client.query(
        `UPDATE commission_rule_sets
            SET label = COALESCE($1, label),
                effective_from = COALESCE($2, effective_from)
          WHERE id = $3 AND company_id = $4`,
        [input.label ?? null, input.effectiveFrom ?? null, id, companyId],
      );
    }

    if (input.tiers !== undefined) {
      await client.query('DELETE FROM commission_tiers WHERE rule_set_id = $1', [id]);
      for (const tier of input.tiers) {
        await client.query(
          `INSERT INTO commission_tiers (rule_set_id, min_volume, max_volume, rate)
           VALUES ($1, $2, $3, $4)`,
          [id, tier.minVolume, tier.maxVolume, tier.rate],
        );
      }
    }

    if (input.productOverrides !== undefined) {
      await client.query('DELETE FROM commission_product_overrides WHERE rule_set_id = $1', [id]);
      for (const override of input.productOverrides) {
        await client.query(
          `INSERT INTO commission_product_overrides (rule_set_id, product_code, rate)
           VALUES ($1, $2, $3)`,
          [id, override.productCode, override.rate],
        );
      }
    }

    await client.query('COMMIT');
    return getRuleSet(companyId, id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteRuleSet(companyId: string, id: string): Promise<void> {
  const existing = await getRuleSet(companyId, id);
  if (isLocked(existing.effectiveFrom)) {
    throw new HttpError(
      409,
      'This rule set is already effective or in the past and cannot be deleted.',
    );
  }
  await pool.query('DELETE FROM commission_rule_sets WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
}