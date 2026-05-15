-- Migration: Add clinic_id to finance-related tables
-- This ensures the dashboard queries can filter by clinic consistently.

ALTER TABLE bills ADD COLUMN IF NOT EXISTS clinic_id INTEGER;
ALTER TABLE receipt ADD COLUMN IF NOT EXISTS clinic_id INTEGER;
ALTER TABLE settargets ADD COLUMN IF NOT EXISTS clinic_id INTEGER;

-- Optional: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_clinic_id ON bills (clinic_id);
CREATE INDEX IF NOT EXISTS idx_receipt_clinic_id ON receipt (clinic_id);
CREATE INDEX IF NOT EXISTS idx_settargets_clinic_id ON settargets (clinic_id);
