import {
  pgTable, serial, integer, varchar, text, timestamp
} from 'drizzle-orm/pg-core';

// ─── Records (legacy `records` table — call records / growth tracking) ────────
export const records = pgTable('records', {
  id: serial('id').primaryKey(),
  regid: integer('regid'),
  comment: text('comment'),
  doctorname: varchar('doctorname', { length: 255 }),
  mobile: varchar('mobile', { length: 50 }),
  recordtype: varchar('recordtype', { length: 50 }).default('Call'),
  recorddate: varchar('recorddate', { length: 50 }),
  calltime: varchar('calltime', { length: 50 }),
  instructions: text('instructions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
