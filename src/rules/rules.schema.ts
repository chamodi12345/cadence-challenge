import { z } from 'zod';

const tierSchema = z
  .object({
    minVolume: z.string().regex(/^\d+(\.\d{1,2})?$/, 'minVolume must be a decimal string'),
    maxVolume: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'maxVolume must be a decimal string')
      .nullable(),
    rate: z.number().min(0).max(1),
  })
  .refine((t) => t.maxVolume === null || Number(t.maxVolume) > Number(t.minVolume), {
    message: 'maxVolume must be greater than minVolume',
    path: ['maxVolume'],
  });

const productOverrideSchema = z.object({
  productCode: z.string().min(1),
  rate: z.number().min(0).max(1),
});

export const createRuleSetSchema = z.object({
  label: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be YYYY-MM-DD'),
  tiers: z.array(tierSchema).min(1),
  productOverrides: z.array(productOverrideSchema).optional().default([]),
});

export const updateRuleSetSchema = createRuleSetSchema.partial();

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateRuleSetInput = z.infer<typeof createRuleSetSchema>;
export type UpdateRuleSetInput = z.infer<typeof updateRuleSetSchema>;