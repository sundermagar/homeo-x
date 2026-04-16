import { z } from 'zod';

// Medicine
export const createMedicineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  disease: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  detail: z.string().optional().nullable(),
});

export const updateMedicineSchema = createMedicineSchema.partial();
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
