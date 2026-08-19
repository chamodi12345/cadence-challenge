import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import {
  generatePayoutRun,
  getPayoutRun,
  listPayoutRuns,
  finalizePayoutRun,
  HttpError,
} from './payouts.service';

export const payoutsRouter = Router();

payoutsRouter.use(requireAuth, requireRole('COMPANY_ADMIN', 'FINANCE'));

const generateSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
});
const idParamSchema = z.object({ id: z.string().uuid() });

payoutsRouter.get('/', async (req: AuthedRequest, res) => {
  const runs = await listPayoutRuns(req.user!.companyId);
  return res.status(200).json({ data: runs });
});

payoutsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid run id' } });
  }
  try {
    const run = await getPayoutRun(req.user!.companyId, parsedParams.data.id);
    return res.status(200).json({ data: run });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

payoutsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }
  try {
    const run = await generatePayoutRun(req.user!.companyId, parsed.data.period);
    return res.status(201).json({ data: run });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

payoutsRouter.post('/:id/finalize', async (req: AuthedRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid run id' } });
  }
  try {
    const run = await finalizePayoutRun(req.user!.companyId, parsedParams.data.id);
    return res.status(200).json({ data: run });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});