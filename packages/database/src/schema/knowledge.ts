import {
  pgTable, serial, varchar, text, timestamp
} from 'drizzle-orm/pg-core';

// ─── Dictionary (matches legacy `dictionary` table exactly) ───────────────────
export const dictionary = pgTable('dictionary', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
  text: text('text'),
  comments: text('comments'),
  crossRef: varchar('cross_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// ─── Library Resources ────────────────────────────────────────────────────────
export const libraryResources = pgTable('library_resources', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  author: varchar('author', { length: 255 }),
  resourceType: varchar('resource_type', { length: 50 }),
  url: varchar('url', { length: 1024 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
