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
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "tags" text;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "color" varchar(50);
ALTER TABLE "departments" ALTER COLUMN "tags" DROP NOT NULL;
ALTER TABLE "departments" ALTER COLUMN "color" DROP NOT NULL;

-- ── Fix constraints for existing tables ────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "context_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "users" ALTER COLUMN "context_id" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "type" DROP NOT NULL;

ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "designation" varchar(100);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "gender" varchar(20);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "mobile" varchar(50);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "mobile2" varchar(50);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "dept" varchar(100);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "city" varchar(100);
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "about" text;
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "date_birth" date;
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "date_left" date;
ALTER TABLE "dispensaries" ADD COLUMN IF NOT EXISTS "salary_cur" real;

ALTER TABLE "dispensaries" ALTER COLUMN "designation" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "gender" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "mobile" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "mobile2" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "dept" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "about" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "date_birth" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "date_left" DROP NOT NULL;
ALTER TABLE "dispensaries" ALTER COLUMN "salary_cur" DROP NOT NULL;

-- ── Add packages to all staff tables ──────────────────────────
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "packages" text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinicadmins') THEN
        ALTER TABLE "clinicadmins" ADD COLUMN IF NOT EXISTS "packages" text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receptionists') THEN
        ALTER TABLE "receptionists" ADD COLUMN IF NOT EXISTS "packages" text;
    END IF;
    -- accounts always exists in shared schema
    ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "packages" text;
END $$;

