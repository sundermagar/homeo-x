import { pgTable, serial, varchar, integer, real, timestamp, text, date } from 'drizzle-orm/pg-core';
import { patients } from './patients';

export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  regid: integer('regid').references(() => patients.regid, { onDelete: 'set null' }),
  billNo: integer('bill_no'),
  billDate: date('bill_date'),
  charges: real('charges').default(0).notNull(),
  received: real('received').default(0).notNull(),
  balance: real('balance').default(0).notNull(),
  paymentMode: varchar('payment_mode', { length: 50 }),
  treatment: varchar('treatment', { length: 255 }),
  disease: varchar('disease', { length: 255 }),
  fromDate: date('from_date'),
  toDate: date('to_date'),
  chargeId: integer('charge_id'),
  doctorId: integer('doctor_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  regid: integer('regid').references(() => patients.regid, { onDelete: 'set null' }),
  billId: integer('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  orderId: varchar('order_id', { length: 255 }),
  paymentId: varchar('payment_id', { length: 255 }),
  signature: text('signature'),
  amount: real('amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('INR').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  paymentMode: varchar('payment_mode', { length: 50 }).notNull(),
  paymentDate: timestamp('payment_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
