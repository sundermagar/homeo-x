-- Migration: Add unregistered_patient_id to appointments and waitlist
-- This enables linking unregistered patients to their respective records.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS unregistered_patient_id INTEGER;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS unregistered_patient_id INTEGER;

-- Ensure indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_appointments_unreg_patient_id ON appointments (unregistered_patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_unreg_patient_id ON waitlist (unregistered_patient_id);
