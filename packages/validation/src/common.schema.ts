import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const regidParamSchema = z.object({
  regid: z.coerce.number().int().positive(),
});

/**
 * Numeric string schema — ensures the string contains only digits.
 * Uses .regex() instead of .refine() so the type stays ZodString,
 * which allows further chaining of .max(), .min(), etc.
 */
export const numericStringSchema = z
  .string()
  .regex(/^\d*$/, { message: 'Must contain only numbers' });

export const phoneSchema = numericStringSchema.max(20).optional();


