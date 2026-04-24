-- Migration 0013: Add knowledge base tables (dictionary and library_resources)
-- These tables support the knowledge router in the operations dashboard

CREATE TABLE IF NOT EXISTS "dictionary" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "text" text DEFAULT '',
  "comments" text DEFAULT '',
  "cross_ref" text DEFAULT '',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "library_resources" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "author" text DEFAULT '',
  "resource_type" text DEFAULT 'Book',
  "url" text DEFAULT '',
  "description" text DEFAULT '',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);