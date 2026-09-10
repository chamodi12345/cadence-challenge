import { Pool, types } from 'pg';

// DATE oid = 1082. By default, node-postgres parses DATE columns into JS
// Date objects. That's a trap here: a plain date like "2026-03-01" gets
// interpreted as UTC midnight, then JSON.stringify() and the frontend's
// timezone (UTC+5:30 in this case) shift it back to "2026-02-28T18:30:00Z"
// when displayed. Returning the raw string instead avoids that entirely —
// every DATE column (bookings, payout run periods, rule effective dates)
// stays exactly what's stored, no implicit timezone conversion.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});