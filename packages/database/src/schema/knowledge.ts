import {
  pgTable, serial, varchar, text, timestamp, boolean, integer
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

// ─── Static CMS Pages ────────────────────────────────────────────────────────
export const staticPages = pgTable('static_pages', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── FAQs ───────────────────────────────────────────────────────────────────
export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  order: integer('order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
