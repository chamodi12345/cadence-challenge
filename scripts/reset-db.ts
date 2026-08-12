/**
 * Drops every table, reapplies db/schema.sql, then seeds.
 *
 * This is a throwaway-container convenience, not a migration tool. Writing real
 * migrations is part of the assignment.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { seed } from './seed';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'host.docker.internal']);

function assertLocalDatabase(connectionString: string): void {
  const host = new URL(connectionString).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to reset a non-local database (host: "${host}"). ` +
        'This script drops every table. If you really mean it, change DATABASE_URL.',
    );
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
  }

  assertLocalDatabase(connectionString);

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('schema applied');

    await seed(client);
    console.log('seed complete');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
