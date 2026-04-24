import {
  pgTable, serial, integer, varchar, text, timestamp, boolean
} from 'drizzle-orm/pg-core';

// ─── SMS Templates ─────────────────────────────────────────────────────────
export const smsTemplates = pgTable('sms_templates', {
  id:           serial('id').primaryKey(),
  name:         varchar('name',         { length: 200 }).notNull(),
  message:      text('message').notNull(),
  smsType:      varchar('sms_type',    { length: 100 }).default('General'), // General | Promotional | Transactional
  isActive:     boolean('is_active').default(true),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
  deletedAt:    timestamp('deleted_at'),
});

// ─── SMS Delivery Reports ──────────────────────────────────────────────────
export const smsReports = pgTable('sms_reports', {
  id:         serial('id').primaryKey(),
  regid:      integer('regid').notNull(),
  phone:      varchar('phone', { length: 20 }),
  message:    text('message').notNull(),
  smsType:    varchar('sms_type', { length: 100 }).notNull(), // Case Create | Appointment | Normal | Group | OTP | WhatsApp | Birthday | Package Expiry | etc.
  sendDate:   varchar('send_date', { length: 100 }).notNull(), // ISO timestamp
  status:     varchar('status', { length: 50 }).default('sent'), // sent | delivered | failed | pending
  gatewayRef: varchar('gateway_ref', { length: 255 }),          // Provider's message ID
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
  deletedAt:  timestamp('deleted_at'),
});

// ─── WhatsApp Logs ─────────────────────────────────────────────────────────
export const whatsappLogs = pgTable('whatsapp_logs', {
  id:         serial('id').primaryKey(),
  regid:      integer('regid'),
  phone:      varchar('phone', { length: 20 }).notNull(),
  message:    text('message').notNull(),
  deepLink:   varchar('deep_link', { length: 500 }),            // Generated WhatsApp deep link
  status:     varchar('status', { length: 50 }).default('sent'),
  sendDate:   varchar('send_date', { length: 100 }).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
  deletedAt:  timestamp('deleted_at'),
});

// ─── OTP Records ───────────────────────────────────────────────────────────
export const otps = pgTable('otps', {
  id:        serial('id').primaryKey(),
  phone:     varchar('phone', { length: 20 }).notNull(),
  otp:       varchar('otp', { length: 10 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verified:  boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
