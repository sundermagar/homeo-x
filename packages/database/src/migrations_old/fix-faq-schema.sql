-- SQL script to fix the FAQ table constraint error
-- This script makes the 'deleted_at' column nullable in the 'faqs' table for all tenant schemas.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
        EXECUTE format('ALTER TABLE %I.faqs ALTER COLUMN deleted_at DROP NOT NULL', r.schema_name);
        RAISE NOTICE 'Altered faqs table in schema %', r.schema_name;
    END LOOP;
END $$;
