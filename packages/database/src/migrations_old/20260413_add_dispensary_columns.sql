-- Add missing dispensary columns for HomeoX settings
-- Ensures the dispensaries table contains all required fields used by the API.

ALTER TABLE dispensaries
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Male',
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS about TEXT,
  ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dept VARCHAR(100),
  ADD COLUMN IF NOT EXISTS date_birth DATE,
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE dispensaries SET
  gender = COALESCE(gender, 'Male'),
  updated_at = COALESCE(updated_at, NOW())
WHERE gender IS NULL OR updated_at IS NULL;
