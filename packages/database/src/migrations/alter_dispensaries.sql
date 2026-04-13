-- Dispensaries Table Expansion Migration
-- Adds missing columns to match the full HomeoX dispensary schema

ALTER TABLE dispensaries
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Male',
ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(50),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
ADD COLUMN IF NOT EXISTS dept VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_birth DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing records to have default values
UPDATE dispensaries SET
  gender = COALESCE(gender, 'Male'),
  updated_at = NOW()
WHERE gender IS NULL OR updated_at IS NULL;