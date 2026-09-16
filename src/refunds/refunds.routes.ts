import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import { createRefund, listRefunds, getRefundById, HttpError } from './refunds.service';
import { createRefundSchema } from './refunds.schema';

export const refundsRouter = Router();

refundsRouter.use(requireAuth, requireRole('COMPANY_ADMIN', 'FINANCE'));

const idParamSchema = z.object({ id: z.string().min(1) });

refundsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createRefundSchema.safeParse(req.body);
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
    const refund = await createRefund(req.user!.companyId, parsed.data);
    return res.status(201).json({ data: refund });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

refundsRouter.get('/', async (req: AuthedRequest, res) => {
  const refunds = await listRefunds(req.user!.companyId);
  return res.status(200).json({ data: refunds });
});

refundsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid refund id' } });
  }
  try {
    const refund = await getRefundById(req.user!.companyId, parsedParams.data.id);
    return res.status(200).json({ data: refund });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});