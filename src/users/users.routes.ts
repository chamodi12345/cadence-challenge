import { Router } from 'express';
import { requireAuth, requireRole, AuthedRequest } from '../auth/auth.middleware';
import { createUserSchema } from './users.schema';
import { createUser, listUsers, HttpError } from './users.service';
import { updateUserSchema } from './users.schema';
import { updateUser, deleteUser } from './users.service';

export const usersRouter = Router();

// Finance/Agent management is a Company Admin responsibility only.
usersRouter.use(requireAuth, requireRole('COMPANY_ADMIN'));

usersRouter.get('/', async (req: AuthedRequest, res) => {
  const users = await listUsers(req.user!.companyId);
  return res.status(200).json({ data: users });
});

usersRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  try {
    const user = await createUser(req.user!.companyId, parsed.data);
    return res.status(201).json({ data: user });
  } catch (err) {
    if (err instanceof HttpError) {
      return res
        .status(err.status)
        .json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});




usersRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
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
    const result = await updateUser(req.user!.companyId, req.params.id, parsed.data);
    return res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});

usersRouter.delete('/:id', async (req: AuthedRequest, res) => {
  try {
    await deleteUser(req.user!.companyId, req.params.id, req.user!.id);
    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: 'REQUEST_FAILED', message: err.message } });
    }
    throw err;
  }
});