-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0022: Add missing clinical-codes tables and billing columns
-- Fixes:
--   1. "column bills.procedure_code_id does not exist"
--   2. "relation snomed_concepts does not exist"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Create clinical-codes tables (ICD, SNOMED, LOINC, etc.) ─────────────

CREATE TABLE IF NOT EXISTS "icd_codes" (
  "id" serial PRIMARY KEY,
  "code" varchar(20) NOT NULL,
  "version" varchar(10) NOT NULL DEFAULT 'ICD-10',
  "description" text NOT NULL,
  "chapter" varchar(100),
  "category" varchar(255),
  "parent_code" varchar(20),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "snomed_concepts" (
  "id" serial PRIMARY KEY,
  "concept_id" bigint NOT NULL UNIQUE,
  "fsn" text NOT NULL,
  "term" text NOT NULL,
  "concept_type" varchar(50),
  "active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "loinc_codes" (
  "id" serial PRIMARY KEY,
  "loinc_num" varchar(20) NOT NULL UNIQUE,
  "component" text NOT NULL,
  "property" varchar(50),
  "system" varchar(100),
  "scale" varchar(20),
  "method" varchar(100),
  "units" varchar(50),
  "description" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lab_panels" (
  "id" serial PRIMARY KEY,
  "code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lab_panel_loinc_links" (
  "id" serial PRIMARY KEY,
  "lab_panel_id" integer NOT NULL REFERENCES "lab_panels"("id"),
  "loinc_code_id" integer NOT NULL REFERENCES "loinc_codes"("id"),
  "sort_order" integer DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "code_mappings" (
  "id" serial PRIMARY KEY,
  "source_system" varchar(20) NOT NULL,
  "source_code" varchar(50) NOT NULL,
  "target_system" varchar(20) NOT NULL,
  "target_code" varchar(50) NOT NULL,
  "map_type" varchar(20) DEFAULT 'equivalent',
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "procedure_codes" (
  "id" serial PRIMARY KEY,
  "code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "category" varchar(100),
  "standard" varchar(20) DEFAULT 'CPT',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "medical_case_diagnoses" (
  "id" serial PRIMARY KEY,
  "medical_case_id" integer NOT NULL,
  "icd_code_id" integer REFERENCES "icd_codes"("id"),
  "snomed_code_id" integer REFERENCES "snomed_concepts"("id"),
  "is_primary" boolean DEFAULT false,
  "notes" text,
  "recorded_at" timestamp DEFAULT now(),
  "recorded_by" varchar(36)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "investigation_results" (
  "id" serial PRIMARY KEY,
  "investigation_id" integer NOT NULL,
  "loinc_code_id" integer REFERENCES "loinc_codes"("id"),
  "observation_value" varchar(100),
  "observation_unit" varchar(20),
  "reference_range" varchar(50),
  "is_abnormal" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- ─── 2. Add missing columns to bills table ──────────────────────────────────

ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "procedure_code_id" integer;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "bill_type" varchar(30) DEFAULT 'Consultation';
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "custom_title" varchar(255);
--> statement-breakpoint

-- ─── 3. Create indexes (safely, won't fail if they already exist) ───────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'icd_code_idx') THEN
    CREATE INDEX "icd_code_idx" ON "icd_codes" ("code");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'icd_desc_idx') THEN
    CREATE INDEX "icd_desc_idx" ON "icd_codes" ("description");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'snomed_concept_id_idx') THEN
    CREATE INDEX "snomed_concept_id_idx" ON "snomed_concepts" ("concept_id");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'snomed_term_idx') THEN
    CREATE INDEX "snomed_term_idx" ON "snomed_concepts" ("term");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'loinc_num_idx') THEN
    CREATE INDEX "loinc_num_idx" ON "loinc_codes" ("loinc_num");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'proc_code_name_idx') THEN
    CREATE INDEX "proc_code_name_idx" ON "procedure_codes" ("name");
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'code_map_source_idx') THEN
    CREATE INDEX "code_map_source_idx" ON "code_mappings" ("source_code");
  END IF;
END $$;
