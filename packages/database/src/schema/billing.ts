import { pgTable, serial, varchar, integer, real, timestamp, text, date } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';
import { procedureCodes } from './clinical-codes.js';

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
  procedureCodeId: integer('procedure_code_id').references(() => procedureCodes.id),
  disease: varchar('disease', { length: 255 }),
  fromDate: date('from_date'),
  toDate: date('to_date'),
  chargeId: integer('charge_id'),
  doctorId: integer('doctor_id'),
  notes: text('notes'),
  billType: varchar('bill_type', { length: 30 }).default('Consultation'),
  customTitle: varchar('custom_title', { length: 255 }),
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

export const charges = pgTable('charges', {
  id: serial('id').primaryKey(),
  charges: varchar('charges', { length: 255 }),
  amount: real('amount').default(0),
  quantity: integer('quantity').default(0),
  type: varchar('type', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const additionalCharges = pgTable('additional_charges', {
  id: serial('id').primaryKey(),
  regid: integer('regid').references(() => patients.regid, { onDelete: 'set null' }),
  randId: varchar('rand_id', { length: 50 }),
  dateval: varchar('dateval', { length: 20 }),
  additionalName: varchar('additional_name', { length: 255 }),
  additionalPrice: real('additional_price').default(0),
  additionalQuantity: integer('additional_quantity').default(1),
  receivedPrice: real('received_price').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
