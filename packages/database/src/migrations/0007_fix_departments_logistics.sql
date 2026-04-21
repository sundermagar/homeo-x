-- ============================================================
-- Migration 0007: Fix departments NOT NULL legacy constraints
-- The 'tags' and 'color' columns are legacy fields that the
-- modern UI does not populate. Drop their NOT NULL constraints
-- so department creation works without providing dummy data.
-- Safe to re-run (IF NOT EXISTS / DROP NOT NULL is idempotent).
-- ============================================================

-- Drop legacy NOT NULL on departments
DO $$
BEGIN
  -- tags column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'tags' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "departments" ALTER COLUMN "tags" DROP NOT NULL;
  END IF;

  -- color column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'color' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "departments" ALTER COLUMN "color" DROP NOT NULL;
  END IF;
END $$;

-- Ensure is_active exists on departments
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;

-- Ensure courier_masters table exists (used by new logistics module)
CREATE TABLE IF NOT EXISTS "courier_masters" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "contact_person" varchar(255),
  "phone" varchar(50),
  "tracking_url" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Ensure package_plans table exists
CREATE TABLE IF NOT EXISTS "package_plans" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "description" text,
  "price" decimal(10,2) DEFAULT 0,
  "duration_days" integer DEFAULT 30,
  "color_code" varchar(50) DEFAULT '#2563EB',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Patch couriermedicines for modern usage
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'couriermedicines') THEN
        ALTER TABLE "couriermedicines" ADD COLUMN IF NOT EXISTS "medicine_ids" text;
        ALTER TABLE "couriermedicines" ADD COLUMN IF NOT EXISTS "tracking_no" varchar(255);
        ALTER TABLE "couriermedicines" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'Pending';
        ALTER TABLE "couriermedicines" ADD COLUMN IF NOT EXISTS "notified" integer DEFAULT 0;
        ALTER TABLE "couriermedicines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
    END IF;
END $$;

