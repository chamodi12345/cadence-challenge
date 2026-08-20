import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1),
});

export const addMemberSchema = z.object({
  agentCode: z.string().min(1),
  isLead: z.boolean().optional().default(false),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
export const memberParamSchema = z.object({ id: z.string().uuid(), memberId: z.string().uuid() });

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;