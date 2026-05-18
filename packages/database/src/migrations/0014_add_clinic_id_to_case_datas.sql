-- Migration: Add clinic_id column to core domain tables
-- This ties legacy records to their respective clinic/organization.

ALTER TABLE case_datas
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER;

-- Optional: create indexes for faster clinic-scoped lookups
CREATE INDEX IF NOT EXISTS idx_case_datas_clinic_id ON case_datas (clinic_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_clinic_id ON waitlist (clinic_id);
