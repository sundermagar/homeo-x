import { pgTable, serial, integer, varchar, real, timestamp, text } from 'drizzle-orm/pg-core';

export const bills = pgTable('bill', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  totalAmount: real('total_amount').default(0),
  receivedAmount: real('received_amount').default(0),
  balanceAmount: real('balance_amount').default(0),
  paymentMode: varchar('payment_mode', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
