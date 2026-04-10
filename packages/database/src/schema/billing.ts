import { pgTable, serial, integer, varchar, real, timestamp, text } from 'drizzle-orm/pg-core';

export const bills = pgTable('bill', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  billNo: varchar('bill_no', { length: 50 }).notNull(),
  billDate: varchar('bill_date', { length: 20 }),
  totalAmount: real('total_amount').default(0),
  receivedAmount: real('received_amount').default(0),
  balanceAmount: real('balance_amount').default(0),
  paymentMode: varchar('payment_mode', { length: 50 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
