import { z } from 'zod';

// ─── Dictionary ───────────────────────────────────────────────────────────────
export const createDictionarySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  text: z.string().optional().default(''),
  comments: z.string().optional().default(''),
  cross_ref: z.string().optional().default(''),
});
export const updateDictionarySchema = createDictionarySchema.partial();

// ─── Library Resources ────────────────────────────────────────────────────────
export const createLibraryResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional().nullable(),
  resourceType: z.enum(['Book', 'PDF', 'Link']).optional().nullable(),
  url: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
});
export const updateLibraryResourceSchema = createLibraryResourceSchema.partial();

// ─── Records ──────────────────────────────────────────────────────────────────
export const createRecordSchema = z.object({
  regid: z.number().int().optional().nullable(),
  comment: z.string().optional().default(''),
  doctorname: z.string().optional().default(''),
  mobile: z.string().optional().default(''),
  recordtype: z.string().optional().default('Call'),
  recorddate: z.string().optional().nullable(),
  calltime: z.string().optional().nullable(),
  instructions: z.string().optional().default(''),
});
export const updateRecordSchema = createRecordSchema.partial();

export type CreateDictionaryInput = z.infer<typeof createDictionarySchema>;
export type UpdateDictionaryInput = z.infer<typeof updateDictionarySchema>;
export type CreateLibraryResourceInput = z.infer<typeof createLibraryResourceSchema>;
export type UpdateLibraryResourceInput = z.infer<typeof updateLibraryResourceSchema>;
export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
