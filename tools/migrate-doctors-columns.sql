-- Migration script to add doctor-specific columns to all tenant schemas
-- This script loops through all tenant schemas and adds missing columns to the doctors table

DO $$
DECLARE
    schema_name TEXT;
    column_exists BOOLEAN;
BEGIN
    -- List of all tenant schemas (adjust as needed)
    FOR schema_name IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Check if doctors table exists in this schema
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = schema_name 
            AND table_name = 'doctors'
        ) THEN
            -- Add firstname column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'firstname'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN firstname VARCHAR(255)', schema_name);
                RAISE NOTICE 'Added firstname column to %I.doctors', schema_name;
            END IF;

            -- Add surname column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'surname'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN surname VARCHAR(255)', schema_name);
                RAISE NOTICE 'Added surname column to %I.doctors', schema_name;
            END IF;

            -- Add title column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'title'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN title VARCHAR(50)', schema_name);
                RAISE NOTICE 'Added title column to %I.doctors', schema_name;
            END IF;

            -- Add consultationFee column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'consultation_fee'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN consultation_fee NUMERIC(10,2)', schema_name);
                RAISE NOTICE 'Added consultation_fee column to %I.doctors', schema_name;
            END IF;

            -- Add aadharnumber column if it doesn't exist (for doctor identification)
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'aadharnumber'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN aadharnumber VARCHAR(20)', schema_name);
                RAISE NOTICE 'Added aadharnumber column to %I.doctors', schema_name;
            END IF;

            -- Add pannumber column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'pannumber'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN pannumber VARCHAR(20)', schema_name);
                RAISE NOTICE 'Added pannumber column to %I.doctors', schema_name;
            END IF;

            -- Add joiningdate column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = schema_name 
                AND table_name = 'doctors' 
                AND column_name = 'joiningdate'
            ) THEN
                EXECUTE format('ALTER TABLE %I.doctors ADD COLUMN joiningdate DATE', schema_name);
                RAISE NOTICE 'Added joiningdate column to %I.doctors', schema_name;
            END IF;

        END IF;
    END LOOP;
END $$;

-- Verify the migration by checking column counts
SELECT 
    table_schema,
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'doctors'
AND table_schema LIKE 'tenant_%'
GROUP BY table_schema, table_name
ORDER BY table_schema;
