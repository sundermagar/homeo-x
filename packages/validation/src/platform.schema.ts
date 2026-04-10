import { z } from 'zod';

// ─── Organization Schemas ─────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters'),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  phone:        z.string().optional().default(''),
  address:      z.string().optional().default(''),
  website:      z.string().optional().default(''),
  connectSince: z.string().optional().default('1990-01-01'),
  city:         z.string().optional().default(''),
  description:  z.string().optional().default(''),
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
  mobile:      z.string().optional().default(''),
  city:        z.string().optional().default(''),
  address:     z.string().optional().default(''),
  about:       z.string().optional().default(''),
  designation: z.string().optional().default(''),
  clinicId:    z.number().int().positive().optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.omit({ password: true }).partial();

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>;
