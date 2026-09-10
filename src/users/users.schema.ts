import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['FINANCE', 'AGENT']),
  // Required when role is AGENT — links this login to an existing
  // agent business record (agent_code is unique per company).
  agentCode: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['FINANCE', 'AGENT']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;