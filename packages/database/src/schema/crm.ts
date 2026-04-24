import {
  pgTable, serial, integer, varchar, text, timestamp, decimal
} from 'drizzle-orm/pg-core';

// ─── Leads (matches legacy `leads` table exactly) ─────────────────────────────
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  mobile: varchar('mobile', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  source: varchar('source', { length: 100 }),
  status: varchar('status', { length: 50 }).default(''),
  notes: text('notes'),
  assignedTo: integer('assigned_to'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Lead Followups (legacy `lead_followups` table) ───────────────────────────
export const leadFollowups = pgTable('lead_followups', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id'),
  name: text('name'),        // notes/description
  task: varchar('task', { length: 255 }),
  taskstatus: varchar('taskstatus', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Referrals (legacy `referral` table — tracks money amounts) ───────────────
export const referrals = pgTable('referral', {
  id: serial('id').primaryKey(),
  regid: integer('regid'),
  referralId: integer('referral_id'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  usedAmount: decimal('used_amount', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Case Reminders (legacy `case_reminder` singular) ─────────────────────────
export const caseReminders = pgTable('case_reminder', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id'),
  patientId: integer('patient_id'),
  patientName: text('patient_name').notNull(),
  startDate: varchar('start_date', { length: 50 }).notNull(),
  endDate: varchar('end_date', { length: 50 }).notNull(),
  remindTime: varchar('remind_time', { length: 20 }).notNull(),
  recursion: integer('recursion'),
  remindAfter: varchar('remind_after', { length: 50 }).notNull(),
  heading: varchar('heading', { length: 255 }).notNull(),
  comments: text('comments').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: text('deleted_at'),
});
