import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, AuthedRequest } from '../auth/auth.middleware';

export const statementsRouter = Router();

statementsRouter.use(requireAuth);

const periodQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
});

statementsRouter.get('/', async (req: AuthedRequest, res) => {
  if (!req.user!.agentId) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'This account is not linked to an agent record.' },
    });
  }

  const parsed = periodQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'period query param must be YYYY-MM' },
    });
  }
  const { period } = parsed.data;

  // period is already validated by the zod regex above (\d{4}-\d{2}), so
  // slicing fixed positions is safe and avoids the split+map+destructure
  // pattern, which noUncheckedIndexedAccess flags as possibly undefined.
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));

  const start = `${period}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${period}-${String(lastDay).padStart(2, '0')}`;

  const { rows: agentRows } = await pool.query<{ agentCode: string }>(
    `SELECT agent_code AS "agentCode" FROM agents WHERE id = $1 AND company_id = $2`,
    [req.user!.agentId, req.user!.companyId],
  );
  const agent = agentRows[0];
  if (!agent) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent record not found' } });
  }

  const { rows: bookings } = await pool.query(
    `SELECT id, external_ref AS "externalRef", booking_date AS "bookingDate",
            amount, currency, product_code AS "productCode"
       FROM bookings
      WHERE company_id = $1 AND agent_code = $2
        AND booking_date >= $3 AND booking_date <= $4
      ORDER BY booking_date ASC`,
    [req.user!.companyId, agent.agentCode, start, end],
  );

  const { rows: lineItemRows } = await pool.query(
    `SELECT li.id, li.booking_count AS "bookingCount", li.gross_volume AS "grossVolume",
            li.commission_amount AS "commissionAmount", li.rates_applied AS "ratesApplied",
            pr.id AS "runId", pr.status AS "runStatus"
       FROM payout_line_items li
       JOIN payout_runs pr ON pr.id = li.run_id
      WHERE li.agent_id = $1 AND pr.period_start = $2 AND pr.period_end = $3`,
    [req.user!.agentId, start, end],
  );

  return res.status(200).json({
    data: {
      period,
      bookings,
      payout: lineItemRows[0] ?? null,
    },
  });
});