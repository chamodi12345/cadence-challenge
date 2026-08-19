import { z } from 'zod';

// One row, after CSV parsing but before DB insertion.
// Everything arrives as a string from the CSV — validation coerces and checks format.
export const bookingRowSchema = z.object({
  external_ref: z.string().trim().min(1, 'external_ref is required'),
  agent_code: z.string().trim().min(1, 'agent_code is required'),
  booking_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'booking_date must be YYYY-MM-DD'),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'amount must be a positive decimal with up to 2 decimal places'),
  product_code: z.string().trim().min(1, 'product_code is required'),
  currency: z.string().trim().length(3).optional(),
});

export type BookingRowInput = z.infer<typeof bookingRowSchema>;