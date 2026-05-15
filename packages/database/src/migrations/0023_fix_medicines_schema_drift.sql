-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0023: Fix medicines and stocks table schema drift
-- Fixes: "column m.deleted_at does not exist" in Clinical Medicine Catalog
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add missing columns to medicines table ──────────────────────────────

ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "name" varchar(255);
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "disease" text;
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "potency_id" integer;
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "type" varchar(100);
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "category" varchar(100);
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "price" real DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "stock_level" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint

-- ─── 2. Data Migration: Populate "name" from legacy "shortname" or "remedy" ──

UPDATE "medicines" SET "name" = "shortname" WHERE "name" IS NULL AND "shortname" IS NOT NULL;
--> statement-breakpoint
UPDATE "medicines" SET "name" = "remedy" WHERE "name" IS NULL AND "remedy" IS NOT NULL;
--> statement-breakpoint

-- ─── 3. Fix stocks table schema drift ───────────────────────────────────────

ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "unit_price" real;
--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "batch_number" varchar(100);
--> statement-breakpoint

-- Fix deleted_at type if it's text (common legacy issue)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stocks' AND column_name = 'deleted_at' AND data_type = 'text'
  ) THEN
    ALTER TABLE "stocks" ALTER COLUMN "deleted_at" TYPE timestamp USING "deleted_at"::timestamp;
  END IF;
END $$;
--> statement-breakpoint
