import { z } from 'zod';

// Booking ids in the seed data are NOT all UUIDs (e.g. `bkg_nw_0001`), so
// accept any non-empty string here — the service layer resolves and validates
// the actual booking row.
export const createRefundSchema = z.object({
  bookingId: z.string().trim().min(1, 'bookingId is required'),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'amount must be a positive decimal with up to 2 decimal places'),
  refundDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'refundDate must be YYYY-MM-DD'),
  reason: z.string().trim().min(1).max(500, 'reason must be at most 500 characters').optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;