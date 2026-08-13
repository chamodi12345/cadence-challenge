// You run this yourself when a client signs up. Not a web page — nobody
// but you needs it.
// Usage: npx tsx scripts/create-company.ts "Acme Ceylon" admin@acme.test
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/db/pool';

async function main() {
  const [companyName, adminEmail] = process.argv.slice(2);
  if (!companyName || !adminEmail) {
    console.error('Usage: npx tsx scripts/create-company.ts "<Company Name>" <admin-email>');
    process.exit(1);
  }

  const tempPassword = Math.random().toString(36).slice(2, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const company = await pool.query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
    [companyName]
  );
  const companyId = company.rows[0].id;

  await pool.query(
    `INSERT INTO users (company_id, email, full_name, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, 'COMPANY_ADMIN', true)`,
    [companyId, adminEmail, companyName + ' Admin', passwordHash]
  );

  console.log(`Company created: ${companyName} (${companyId})`);
  console.log(`Login email:     ${adminEmail}`);
  console.log(`Temp password:   ${tempPassword}   <-- hand this to the client, then discard it`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});