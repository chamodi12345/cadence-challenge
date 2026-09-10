// You run this yourself when a client signs up. Not a web page — nobody
// but you needs it.
// Usage: npx tsx scripts/create-company.ts "Acme Ceylon" admin@acme.test

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/db/pool';
import { randomBytes, randomUUID } from 'node:crypto';

async function main() {
  const [companyName, adminEmail] = process.argv.slice(2);

  if (!companyName || !adminEmail) {
    console.error(
      'Usage: npx tsx scripts/create-company.ts "<Company Name>" <admin-email>'
    );
    process.exit(1);
  }

  // Generate a cryptographically secure temporary password.
  // 12 bytes = 96 bits of entropy.
  const tempPassword = randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Application generates IDs.
  const companyId = randomUUID();
  const userId = randomUUID();

  // Create the company first because users.company_id
  // references companies.id.
  await pool.query(
    `INSERT INTO companies (id, name)
     VALUES ($1, $2)`,
    [companyId, companyName]
  );

  // Create the Company Admin.
  await pool.query(
    `INSERT INTO users (
       id,
       company_id,
       email,
       full_name,
       password_hash,
       role,
       must_change_password,
       password_reset_required_by
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       'COMPANY_ADMIN',
       true,
       now() + interval '7 days'
     )`,
    [
      userId,
      companyId,
      adminEmail,
      companyName + ' Admin',
      passwordHash,
    ]
  );

  console.log(`Company created: ${companyName} (${companyId})`);
  console.log(`Login email:     ${adminEmail}`);
  console.log(
    `Temp password:   ${tempPassword}   <-- hand this to the client, then discard it`
  );

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});