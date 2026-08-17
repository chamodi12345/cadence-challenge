import { Router } from 'express';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import { createRuleSetSchema, updateRuleSetSchema, idParamSchema } from './rules.schema';
import {
  listRuleSets,
  getRuleSet,
  createRuleSet,
  updateRuleSet,
  deleteRuleSet,
  HttpError,
} from './rules.service';

export const rulesRouter = Router();

// Both Company Admin and Finance can manage commission rules.
rulesRouter.use(requireAuth, requireRole('COMPANY_ADMIN', 'FINANCE'));

rulesRouter.get('/', async (req: AuthedRequest, res) => {
  const ruleSets = await listRuleSets(req.user!.companyId);
  return res.status(200).json({ data: ruleSets });
});

rulesRouter.get('/:id', async (req: AuthedRequest, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid rule set id' } });
  }
  try {
    const ruleSet = await getRuleSet(req.user!.companyId, paramsResult.data.id);
    return res.status(200).json({ data: ruleSet });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

rulesRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createRuleSetSchema.safeParse(req.body);
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
    const ruleSet = await createRuleSet(req.user!.companyId, parsed.data);
    return res.status(201).json({ data: ruleSet });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

rulesRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid rule set id' } });
  }
  const parsed = updateRuleSetSchema.safeParse(req.body);
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
    const ruleSet = await updateRuleSet(req.user!.companyId, paramsResult.data.id, parsed.data);
    return res.status(200).json({ data: ruleSet });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

rulesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid rule set id' } });
  }
  try {
    await deleteRuleSet(req.user!.companyId, paramsResult.data.id);
    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});