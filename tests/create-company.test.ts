import 'dotenv/config';
import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { Pool } from 'pg';



const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const testCompanyName = `Regression Test Co ${Date.now()}`;
const testAdminEmail = `regression-${Date.now()}@test.test`;

async function cleanup(): Promise<void> {
  // users.company_id has no ON DELETE CASCADE, so the user row must be
  // removed before the company row it references.
  await pool.query(
    `DELETE FROM users WHERE company_id IN (SELECT id FROM companies WHERE name = $1)`,
    [testCompanyName],
  );
  await pool.query('DELETE FROM companies WHERE name = $1', [testCompanyName]);
}

afterEach(async () => {
  await cleanup();
});

describe('create-company.ts (regression: companies.id must be app-generated)', () => {
  it('creates a company with a real, app-generated UUID id — never relies on a DB default', async () => {
    execSync(`npx tsx scripts/create-company.ts "${testCompanyName}" ${testAdminEmail}`, {
      encoding: 'utf8',
    });

    const { rows } = await pool.query('SELECT id FROM companies WHERE name = $1', [testCompanyName]);

    expect(rows).toHaveLength(1);
    const insertedId = rows[0].id;

    // The actual regression check: the id must be a real, non-empty,
    // UUID-shaped string supplied by the app. The old bug would have
    // produced undefined/null here instead, since nothing generated one.
    expect(insertedId).toBeDefined();
    expect(typeof insertedId).toBe('string');
    expect(insertedId).toMatch(UUID_PATTERN);
  });

  it(
    'creates the admin user with must_change_password true and a hashed password',
    async () => {
      const { rows: existing } = await pool.query('SELECT id FROM companies WHERE name = $1', [
        testCompanyName,
      ]);
      if (existing.length === 0) {
        execSync(`npx tsx scripts/create-company.ts "${testCompanyName}" ${testAdminEmail}`, {
          encoding: 'utf8',
        });
      }

      const { rows } = await pool.query(
        `SELECT u.must_change_password, u.password_hash
           FROM users u JOIN companies c ON c.id = u.company_id
          WHERE u.email = $1`,
        [testAdminEmail],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].must_change_password).toBe(true);
      // Never plaintext — must be a real bcrypt hash.
      expect(rows[0].password_hash.startsWith('$2')).toBe(true);
    },
    15000, // this test shells out to a real subprocess (tsx + bcrypt), which
           // reliably takes longer than Vitest's default 5s timeout
  );
});