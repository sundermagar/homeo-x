import {
  pgTable, serial, integer, varchar, real,
  timestamp, text, date, boolean
} from 'drizzle-orm/pg-core';

// ─── Package Plan Blueprints ─────────────────────────────────────────────────
// Defines the reusable membership templates (e.g. "30-day Plan", "Annual Gold")
export const packagePlans = pgTable('package_plans', {
  id:           serial('id').primaryKey(),
  name:         varchar('name',         { length: 150 }).notNull(),
  description:  text('description'),
  price:        real('price').notNull().default(0),
  durationDays: integer('duration_days').notNull().default(30),
  colorCode:    varchar('color_code',   { length: 20 }).default('#2563EB'),
  isActive:     boolean('is_active').default(true),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
  deletedAt:    timestamp('deleted_at'),
});

// ─── Patient Package Subscriptions ───────────────────────────────────────────
// Tracks which patients are enrolled in which package and their validity window
export const patientPackages = pgTable('patient_packages', {
  id:          serial('id').primaryKey(),
  patientId:   integer('patient_id').notNull(),  // references case_datas.id
  regid:       integer('regid').notNull(),         // denormalized for quick lookup
  packageId:   integer('package_id').notNull(),    // references package_plans.id
  startDate:   date('start_date').notNull(),
  expiryDate:  date('expiry_date').notNull(),
  status:      varchar('status', { length: 20 }).default('Active'), // Active | Expired | Cancelled
  billId:      integer('bill_id'),                 // linked bill record (nullable)
  notes:       text('notes'),
  createdBy:   integer('created_by'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
  deletedAt:   timestamp('deleted_at'),
});
