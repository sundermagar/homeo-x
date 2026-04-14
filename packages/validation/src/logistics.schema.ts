import { z } from 'zod';

export const courierMedicineStatusEnum = z.enum(['Pending', 'Packed', 'Dispatched', 'Delivered', 'Returned']);

export const createCourierSchema = z.object({
  packageId: z.number().int().optional().nullable(),
  totalNoPackage: z.number().int().min(1).default(1),
});

export const updateCourierSchema = createCourierSchema.partial();

export const createCourierMedicineSchema = z.object({
  courierId: z.number().int(),
  regid: z.number().int(),
  medicineIds: z.array(z.object({
    medicine_id: z.number().int(),
    quantity: z.number().int().min(1),
  })).optional(),
  dispatchDate: z.string().optional().nullable(),
  trackingNo: z.string().optional().nullable(),
  status: courierMedicineStatusEnum.default('Pending'),
});

export const updateCourierMedicineSchema = z.object({
  status: courierMedicineStatusEnum.optional(),
  trackingNo: z.string().optional().nullable(),
  dispatchDate: z.string().optional().nullable(),
});

export type CreateCourierInput = z.infer<typeof createCourierSchema>;
export type UpdateCourierInput = z.infer<typeof updateCourierSchema>;
export type CreateCourierMedicineInput = z.infer<typeof createCourierMedicineSchema>;
export type UpdateCourierMedicineInput = z.infer<typeof updateCourierMedicineSchema>;
