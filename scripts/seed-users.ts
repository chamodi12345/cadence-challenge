// scripts/seed-users.ts
// Adds login users to each company already created by seed.ts.
// Does NOT create new companies — run seed.ts first.
// Safe to re-run: existing emails are skipped via ON CONFLICT.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool } from '../src/db/pool';

interface SeedUser {
  companyId: string;
  email: string;
  fullName: string;
  role: 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT';
  mustChangePassword?: boolean;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users: SeedUser[] = [
    { companyId: 'cmp_northwind', email: 'admin@northwind.test', fullName: 'Nimal Perera', role: 'COMPANY_ADMIN' },
    { companyId: 'cmp_acme', email: 'admin@acme.test', fullName: 'Dilani Rathnayake', role: 'COMPANY_ADMIN' },
    {
      companyId: 'cmp_northwind',
      email: 'newagent@northwind.test',
      fullName: 'New Agent',
      role: 'AGENT',
      mustChangePassword: true,
    },
  ];

  for (const u of users) {
    const result = await pool.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [randomUUID(), u.companyId, u.email, passwordHash, u.fullName, u.role, u.mustChangePassword ?? false]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Created ${u.role} ${u.email} for ${u.companyId}`);
    } else {
      console.log(`Skipped ${u.email} — already exists`);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});