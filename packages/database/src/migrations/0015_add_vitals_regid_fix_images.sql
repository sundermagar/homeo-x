-- Migration 0014: Add regid to vitals, fix case_images schema
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards
-- Does NOT delete any data

-- ─── 1. Vitals: add regid column ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vitals' AND column_name = 'regid'
  ) THEN
    ALTER TABLE vitals ADD COLUMN regid INTEGER;

    -- Backfill regid from appointments for existing rows
    UPDATE vitals v
    SET regid = a.patient_id
    FROM appointments a
    WHERE v.visit_id = a.id AND v.regid IS NULL;

    -- Make it NOT NULL after backfill (rows without a match keep NULL)
    -- Only set NOT NULL if all rows have been filled
  END IF;
END $$;

-- ─── 2. Vitals: make visit_id nullable and drop UNIQUE constraint ───────────
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Drop NOT NULL constraint on visit_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vitals' AND column_name = 'visit_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE vitals ALTER COLUMN visit_id DROP NOT NULL;
  END IF;

  -- Drop any UNIQUE constraint on visit_id (schema-aware)
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE t.relname = 'vitals'
    AND n.nspname = current_schema()
    AND c.contype = 'u'
    AND EXISTS (
      SELECT 1 FROM unnest(c.conkey) AS col
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = col
      WHERE a.attname = 'visit_id'
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE vitals DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
  END IF;
END $$;

-- ─── 3. SOAP Notes: add regid column ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'soap_notes' AND column_name = 'regid'
  ) THEN
    ALTER TABLE soap_notes ADD COLUMN regid INTEGER;

    -- Backfill regid from appointments for existing rows
    UPDATE soap_notes s
    SET regid = a.patient_id
    FROM appointments a
    WHERE s.visit_id = a.id AND s.regid IS NULL;
  END IF;
END $$;

-- ─── 4. Case Images: set created_at defaults for NULL rows ──────────────────
UPDATE case_images
SET created_at = NOW()
WHERE created_at IS NULL;

-- Ensure the default is set going forward
ALTER TABLE case_images ALTER COLUMN created_at SET DEFAULT NOW();

-- ─── 5. Case Notes: set created_at defaults for NULL rows ───────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'case_notes' AND column_name = 'created_at'
  ) THEN
    UPDATE case_notes SET created_at = NOW() WHERE created_at IS NULL;
    ALTER TABLE case_notes ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;
END $$;
