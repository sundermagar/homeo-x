import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  appointmentDate: z.string().min(1, 'Date is required'),
  appointmentTime: z.string().optional(),
  consultationFee: z.number().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z.enum(['Scheduled', 'Confirmed', 'CheckedIn', 'InProgress', 'Completed', 'Cancelled', 'NoShow']).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const addToWaitlistSchema = z.object({
  patientId: z.number().int().positive().optional(),
  appointmentId: z.number().int().positive().optional(),
  doctorId: z.number().int().positive().optional(),
  consultationFee: z.number().min(0).optional(),
}).refine((data) => data.patientId || data.appointmentId, {
  message: "Either patientId or appointmentId is required",
  path: ["patientId"],
});

export type AddToWaitlistInput = z.infer<typeof addToWaitlistSchema>;
