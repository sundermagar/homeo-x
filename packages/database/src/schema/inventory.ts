import { pgTable, serial, varchar, integer, real, timestamp, text } from 'drizzle-orm/pg-core';

export const stocks = pgTable('stocks', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  potency: varchar('potency', { length: 200 }), // Comma separated or single
  category: varchar('category', { length: 100 }),
  quantity: integer('quantity').default(0),
  unitPrice: real('unit_price'),
  batchNumber: varchar('batch_number', { length: 100 }),
  snomedCodeId: integer('snomed_code_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
