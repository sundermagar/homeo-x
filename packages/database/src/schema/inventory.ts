import { pgTable, serial, varchar, integer, real, timestamp, text } from 'drizzle-orm/pg-core';

export const stocks = pgTable('stocks', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }),
  quantity: integer('quantity').default(0),
  price: real('price'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const potencies = pgTable('potencies1', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
});

export const frequencies = pgTable('case_frequency', {
  id: serial('id').primaryKey(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
});
