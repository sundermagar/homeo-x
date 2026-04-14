import { z } from 'zod';

/**
 * Staff validation schemas — unified create/update for all staff categories.
 */

export const staffCategoryEnum = z.enum(['doctor', 'employee', 'receptionist', 'clinicadmin', 'account']);

export const createStaffSchema = z.object({
  category: staffCategoryEnum,
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().or(z.literal('')).optional().default(''),
  mobile: z.string().min(1, 'Mobile is required'),
  mobile2: z.string().optional().default(''),
  gender: z.enum(['Male', 'Female', 'Other']).default('Male'),
  designation: z.string().optional().default(''),
  dept: z.number().int().optional().default(4),
  city: z.string().optional().default(''),
  address: z.string().optional().default(''),
  about: z.string().optional().default(''),
  dateBirth: z.string().optional().default(''),
  dateLeft: z.string().optional().default(''),
  salaryCur: z.number().optional().default(0),

  // Doctor-specific
  title: z.string().optional().default(''),
  firstname: z.string().optional().default(''),
  middlename: z.string().optional().default(''),
  surname: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  institute: z.string().optional().default(''),
  passedOut: z.string().optional().default(''),
  registrationId: z.string().optional().default(''),
  consultationFee: z.string().optional().default(''),
  permanentAddress: z.string().optional().default(''),
  password: z.string().optional().default(''),
  clinicId: z.number().int().nullable().optional().default(null),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ category: true });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
