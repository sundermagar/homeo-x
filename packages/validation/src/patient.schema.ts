import { z } from 'zod';

export const createPatientSchema = z.object({
  // Name
  title: z.string().max(20).optional(),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  surname: z.string().min(1, 'Surname is required').max(100),
  gender: z.enum(['M', 'F', 'Other']).default('M'),
  dateOfBirth: z.string().optional(),
  // Contact
  phone: z.string().max(20).optional(),
  mobile1: z.string().max(20).optional(),
  mobile2: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  // Address
  pin: z.string().max(10).optional(),
  address: z.string().optional(),
  road: z.string().optional(),
  area: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  altAddress: z.string().optional(),
  // Personal
  religion: z.string().optional(),
  occupation: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().max(10).optional(),
  // Clinical
  referenceType: z.string().max(100).optional(),
  referredBy: z.string().optional(),
  assistantDoctor: z.string().optional(),
  consultationFee: z.coerce.number().optional(),
  courierOutstation: z.boolean().optional().default(false),
});

export const updatePatientSchema = createPatientSchema.partial();

export const familyMemberSchema = z.object({
  memberRegid: z.coerce.number().min(1, 'Member Reg ID is required'),
  relation: z.string().min(1, 'Relation is required'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
