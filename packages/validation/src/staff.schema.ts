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
  title: z.string().min(1, 'Title is required'),
  firstname: z.string().min(1, 'First name is required'),
  middlename: z.string().optional().default(''),
  surname: z.string().min(1, 'Surname is required'),
  qualification: z.string().optional().default(''),
  institute: z.string().optional().default(''),
  passedOut: z.string().optional().default(''),
  registrationId: z.string().optional().nullable().default(null),
  consultationFee: z.number().optional().nullable().default(0),
  permanentAddress: z.string().optional().default(''),
  password: z.string().optional().default(''),
  clinicId: z.number().int().nullable().optional().default(null),
  aadharnumber: z.string().optional().nullable().default(null),
  pannumber: z.string().optional().nullable().default(null),
  joiningdate: z.string().optional().nullable().default(null),
  registrationCertificate: z.string().optional().default(''),
  aadharCard: z.string().optional().default(''),
  panCard: z.string().optional().default(''),
  appointmentLetter: z.string().optional().default(''),
  profilepic: z.string().optional().default(''),
  col10Document: z.string().optional().default(''),
  col12Document: z.string().optional().default(''),
  bhmsDocument: z.string().optional().default(''),
  mdDocument: z.string().optional().default(''),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ category: true });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
