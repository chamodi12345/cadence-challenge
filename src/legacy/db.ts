import 'dotenv/config';
import { Pool } from 'pg';

let pool: Pool | undefined;

/**
 * Lazily-created connection pool. Nothing here opens a socket until the first query,
 * so importing this module in a unit test is safe.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
