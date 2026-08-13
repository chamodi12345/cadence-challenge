// scripts/run-seed.ts
// Runs seed.ts's fixture data against the database in DATABASE_URL.
import 'dotenv/config';
import { Client } from 'pg';
import { seed } from './seed';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await seed(client);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});