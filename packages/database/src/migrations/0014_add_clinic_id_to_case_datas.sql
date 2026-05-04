-- Migration: Add clinic_id column to case_datas table
-- This ties legacy patient records to their respective clinic/organization.
-- The column is nullable to remain backward-compatible with existing records.

ALTER TABLE case_datas
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER;

-- Optional: create an index for faster clinic-scoped patient lookups
CREATE INDEX IF NOT EXISTS idx_case_datas_clinic_id ON case_datas (clinic_id);

-- Verify
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'case_datas' AND column_name = 'clinic_id';
