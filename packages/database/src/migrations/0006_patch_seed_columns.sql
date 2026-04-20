-- ============================================================
-- Migration 0006: Patch missing columns needed by seeders
-- These columns exist in the Drizzle schema but are absent from
-- the legacy provision-tenant.ts table definitions.
-- Using ADD COLUMN IF NOT EXISTS so it is safe to re-run.
-- ============================================================

-- ── users table ──────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_pic" text;

-- ── dispensaries table ────────────────────────────────────────
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "location" varchar(255);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "contact_number" varchar(50);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;

-- ── medicines table: legacy uses uppercase "ID", add lowercase ─
-- Add all modern columns expected by catalog seeder
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "id" serial;
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "name" varchar(255);
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "disease" text;
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "potency_id" integer;
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "type" varchar(100);
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "category" varchar(100);
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "price" real DEFAULT 0;
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "stock_level" integer DEFAULT 0;
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- ── potencies table ───────────────────────────────────────────
ALTER TABLE "potencies" ADD COLUMN IF NOT EXISTS "detail" text;

-- ── referral_sources: make sure is_active exists ─────────────
ALTER TABLE "referral_sources" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "referral_sources" ADD COLUMN IF NOT EXISTS "type" varchar(100);
ALTER TABLE "referral_sources" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- ── stickers table ────────────────────────────────────────────
ALTER TABLE "stickers" ADD COLUMN IF NOT EXISTS "color" varchar(50) DEFAULT '#3B82F6';
ALTER TABLE "stickers" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;

-- ── departments table ─────────────────────────────────────────
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
