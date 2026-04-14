import { z } from 'zod';

// ─── Leads ────────────────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional().default(''),
  notes: z.string().optional().nullable(),
  assigned_to: z.number().int().optional().nullable(),
});
export const updateLeadSchema = createLeadSchema.partial();

// ─── Lead Followups ───────────────────────────────────────────────────────────
export const createLeadFollowupSchema = z.object({
  name: z.string().optional().default(''),     // notes
  task: z.string().optional().default(''),      // followup_type
  taskstatus: z.string().optional().default(''),
});
export const updateLeadFollowupSchema = createLeadFollowupSchema.partial();

// ─── Referrals (money-based tracking) ─────────────────────────────────────────
export const createReferralSchema = z.object({
  regid: z.number().int(),
  referral_id: z.number().int(),
  total_amount: z.number().optional().default(0),
  used_amount: z.number().optional().default(0),
});
export const updateReferralSchema = createReferralSchema.partial();

// ─── Case Reminders ───────────────────────────────────────────────────────────
export const createReminderSchema = z.object({
  regid: z.number().int(),
  start_date: z.string().min(1, 'Date is required'),
  remind_time: z.string().optional().default('09:00'),
  heading: z.string().optional().default(''),
  comments: z.string().optional().default(''),
  status: z.string().optional().default('pending'),
});
export const updateReminderSchema = createReminderSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateLeadFollowupInput = z.infer<typeof createLeadFollowupSchema>;
export type UpdateLeadFollowupInput = z.infer<typeof updateLeadFollowupSchema>;
export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
