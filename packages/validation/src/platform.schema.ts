import { z } from 'zod';
import { phoneSchema } from './common.schema';

// ─── Organization Schemas ─────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters'),
  email:         z.string().email('Invalid email').optional().or(z.literal('')),
  phone:         phoneSchema.default(''),

  address:       z.string().optional().default(''),
  website:       z.string().optional().default(''),
  connectSince:  z.string().optional().default('1990-01-01'),
  city:          z.string().optional().default(''),
  description:   z.string().optional().default(''),
  tagLine:       z.string().optional().default(''),
  registration:  z.string().optional().default(''),
  logo:          z.string().optional().default(''),
  address2:      z.string().optional().default(''),
  timing:        z.string().optional().default(''),
  // Initial Administrator
  adminEmail:    z.string().email('Invalid admin email').optional().or(z.literal('')),
  adminPassword: z.string().min(6, 'Admin password must be at least 6 characters').optional().or(z.literal('')),
});


export const updateOrganizationSchema = createOrganizationSchema.partial();

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationSchema>;

// ─── Account Schemas ──────────────────────────────────────────────────────────

export const createAccountSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  password:    z.string().min(6, 'Password must be at least 6 characters'),
  gender:      z.enum(['Male', 'Female', 'Other']).optional().default('Male'),
  mobile:      phoneSchema.default(''),
  city:        z.string().optional().default(''),
  address:     z.string().optional().default(''),
  about:       z.string().optional().default(''),
  designation: z.string().optional().default(''),
  dept:        z.number().int().optional().default(1),
  clinicId:    z.number().int().positive().optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.omit({ password: true }).partial();

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>;
