import { z } from 'zod';

export const createBillSchema = z.object({
  regid: z.number().int().positive(),
  totalAmount: z.number().min(0),
  receivedAmount: z.number().min(0).default(0),
  paymentMode: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
