import { Router } from 'express';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import { createTeamSchema, addMemberSchema, idParamSchema, memberParamSchema } from './teams.schema';
import { listTeams, createTeam, deleteTeam, addMember, removeMember, HttpError } from './teams.service';

export const teamsRouter = Router();

teamsRouter.use(requireAuth, requireRole('COMPANY_ADMIN'));

teamsRouter.get('/', async (req: AuthedRequest, res) => {
  const teams = await listTeams(req.user!.companyId);
  return res.status(200).json({ data: teams });
});

teamsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }
  const team = await createTeam(req.user!.companyId, parsed.data);
  return res.status(201).json({ data: team });
});

teamsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid team id' } });
  }
  try {
    await deleteTeam(req.user!.companyId, parsedParams.data.id);
    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

teamsRouter.post('/:id/members', async (req: AuthedRequest, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid team id' } });
  }
  const parsed = addMemberSchema.safeParse(req.body);
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
    const team = await addMember(req.user!.companyId, parsedParams.data.id, parsed.data);
    return res.status(201).json({ data: team });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

teamsRouter.delete('/:id/members/:memberId', async (req: AuthedRequest, res) => {
  const parsedParams = memberParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });
  }
  try {
    await removeMember(req.user!.companyId, parsedParams.data.id, parsedParams.data.memberId);
    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});