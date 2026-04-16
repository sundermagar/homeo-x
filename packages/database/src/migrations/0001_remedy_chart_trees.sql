-- Migration: 0001_remedy_chart_trees
-- Creates the AI Remedy Chart / Repertory Tree tables:
--   remedy_tree_nodes  — hierarchical rubric tree migrated from legacy managetreedatas
--   remedy_alternatives — remedy suggestions per rubric node migrated from medicine_others
-- Generated from: legacy database backups (extracted_tree_data_chd2.sql, extracted_alternatives_data.sql)

CREATE TABLE IF NOT EXISTS "remedy_tree_nodes" (
  "id"          serial PRIMARY KEY NOT NULL,
  "parent_id"   integer              DEFAULT 0,
  "label"       varchar(255)         NOT NULL,
  "description" text,
  "node_type"   varchar(50)          DEFAULT 'RUBRIC',
  "sort_order"  integer             DEFAULT 0,
  "is_active"   boolean             DEFAULT true,
  "created_at"  timestamp DEFAULT now() NOT NULL,
  "updated_at"  timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "remedy_tree_nodes_parent_id_idx"
  ON "remedy_tree_nodes" ("parent_id");
CREATE INDEX IF NOT EXISTS "remedy_tree_nodes_label_idx"
  ON "remedy_tree_nodes" ("label");
CREATE INDEX IF NOT EXISTS "remedy_tree_nodes_parent_label_idx"
  ON "remedy_tree_nodes" ("parent_id", "label");

CREATE TABLE IF NOT EXISTS "remedy_alternatives" (
  "id"        serial PRIMARY KEY NOT NULL,
  "tree_id"   integer          NOT NULL,
  "remedy"    varchar(255),
  "potency"    varchar(100),
  "notes"     text,
  "sort_order" integer         DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "remedy_alternatives_tree_id_fk"
    FOREIGN KEY ("tree_id")
    REFERENCES "remedy_tree_nodes" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "remedy_alternatives_tree_id_idx"
  ON "remedy_alternatives" ("tree_id");

-- Seed will be run separately via: npx tsx packages/database/src/seeds/remedy-chart-seed.ts
