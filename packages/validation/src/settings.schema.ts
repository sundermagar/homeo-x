import { z } from 'zod';

// ─── Department ───────────────────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
export const updateDepartmentSchema = createDepartmentSchema.partial();
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ─── Dispensary ───────────────────────────────────────────────────────────────
export const createDispensarySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']).default('Male'),
  mobile: z.string().max(50).optional().nullable(),
  mobile2: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(), // current Kreed.health field
  city: z.string().max(100).optional().nullable(),
  address: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  dept: z.string().max(100).optional().nullable(),
  dateBirth: z.string().optional().nullable(),
  contactNumber: z.string().max(50).optional().nullable(), // current Kreed.health stub field
  isActive: z.boolean().default(true),
});
export const updateDispensarySchema = createDispensarySchema.partial();
export type CreateDispensaryInput = z.infer<typeof createDispensarySchema>;
export type UpdateDispensaryInput = z.infer<typeof updateDispensarySchema>;


// ─── Referral Source ──────────────────────────────────────────────────────────
export const createReferralSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});
export const updateReferralSourceSchema = createReferralSourceSchema.partial();
export type CreateReferralSourceInput = z.infer<typeof createReferralSourceSchema>;
export type UpdateReferralSourceInput = z.infer<typeof updateReferralSourceSchema>;

// ─── Reference Type ───────────────────────────────────────────────────────────
export const createReferenceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  isActive: z.boolean().default(true),
});
export const updateReferenceTypeSchema = createReferenceTypeSchema.partial();
export type CreateReferenceTypeInput = z.infer<typeof createReferenceTypeSchema>;
export type UpdateReferenceTypeInput = z.infer<typeof updateReferenceTypeSchema>;

// ─── Sticker ──────────────────────────────────────────────────────────────────
export const createStickerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  detail: z.string().min(1, 'Detail is required'),
});
export const updateStickerSchema = createStickerSchema.partial();
export type CreateStickerInput = z.infer<typeof createStickerSchema>;
export type UpdateStickerInput = z.infer<typeof updateStickerSchema>;

// ─── Static Page ──────────────────────────────────────────────────────────────
export const createStaticPageSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().optional(),
  isActive: z.boolean().default(true),
});
export const updateStaticPageSchema = createStaticPageSchema.partial();
export type CreateStaticPageInput = z.infer<typeof createStaticPageSchema>;
export type UpdateStaticPageInput = z.infer<typeof updateStaticPageSchema>;

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export const createFaqSchema = z.object({
  name: z.string().min(1, 'Name (Question) is required'),
  detail: z.string().min(1, 'Detail (Answer) is required'),
  ques: z.string().optional(),
  ans: z.string().optional(),
  isActive: z.boolean().default(true),
});
export const updateFaqSchema = createFaqSchema.partial();
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;

// ─── PDF Settings ─────────────────────────────────────────────────────────────
export const createPdfSettingsSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(255),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  margin: z.string().max(100).optional(),
  isDefault: z.boolean().default(false),
});
export const updatePdfSettingsSchema = createPdfSettingsSchema.partial();
export type CreatePdfSettingsInput = z.infer<typeof createPdfSettingsSchema>;
export type UpdatePdfSettingsInput = z.infer<typeof updatePdfSettingsSchema>;


// ─── Role ─────────────────────────────────────────────────────────────────────
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().max(150).optional(),
  description: z.string().optional(),
});
export const updateRoleSchema = createRoleSchema.partial();
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ─── Permission ───────────────────────────────────────────────────────────────
export const createPermissionSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().min(1).max(150),
  module: z.string().min(1).max(100),
  description: z.string().optional(),
});
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

// ─── Assign Permissions to Role ───────────────────────────────────────────────
export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.number().int()).min(1, 'At least one permission required'),
});
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;

// ─── Potency / Frequency ─────────────────────────────────────────────────────
export const createPotencySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  detail: z.string().optional(),
});
export const updatePotencySchema = createPotencySchema.partial();
export type CreatePotencyInput = z.infer<typeof createPotencySchema>;
export type UpdatePotencyInput = z.infer<typeof updatePotencySchema>;

export const createFrequencySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  frequency: z.string().max(255).optional(),
  duration: z.string().max(255).optional(),
  days: z.number().int().optional(),
});
export const updateFrequencySchema = createFrequencySchema.partial();
export type CreateFrequencyInput = z.infer<typeof createFrequencySchema>;
export type UpdateFrequencyInput = z.infer<typeof updateFrequencySchema>;



// ─── Message Template ────────────────────────────────────────────────────────
export const createMessageTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['SMS', 'WhatsApp']).default('SMS'),
  isActive: z.boolean().default(true),
});
export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();

// ─── Package Plans ────────────────────────────────────────────────────────
export const createPackagePlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0),
  durationDays: z.number().int().min(1),
  colorCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updatePackagePlanSchema = createPackagePlanSchema.partial();

export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;
