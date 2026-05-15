-- Migration: Fix schema drift across all tenant tables
-- Adds missing columns that were added to the Drizzle schema but missed in older tenants.
-- All statements use IF NOT EXISTS so they are safe to run multiple times.

-- case_datas missing columns
ALTER TABLE case_datas 
  ADD COLUMN IF NOT EXISTS assitant_doctor TEXT,
  ADD COLUMN IF NOT EXISTS consultation_fee INTEGER,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS reference_type_id INTEGER;

-- appointments missing columns
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS unregistered_patient_id INTEGER;

-- waitlist missing columns
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS unregistered_patient_id INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_datas_assitant_doctor ON case_datas (assitant_doctor);
CREATE INDEX IF NOT EXISTS idx_appointments_unreg_patient_id ON appointments (unregistered_patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_unreg_patient_id ON waitlist (unregistered_patient_id);
