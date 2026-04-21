-- Performance Optimization: Add indexes for frequently queried columns in Dashboard and Analytics
-- Target: Primary clinical and financial tables

DO $$ 
BEGIN
    -- Appointments: Optimize queue and range queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_date') THEN
        CREATE INDEX idx_appointments_date ON appointments (booking_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_status') THEN
        CREATE INDEX idx_appointments_status ON appointments (status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_patient') THEN
        CREATE INDEX idx_appointments_patient ON appointments (patient_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_created') THEN
        CREATE INDEX idx_appointments_created ON appointments (created_at);
    END IF;

    -- Patients: Optimize new patient counts and lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_created') THEN
        CREATE INDEX idx_patients_created ON case_datas (created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_deleted') THEN
        CREATE INDEX idx_patients_deleted ON case_datas (deleted_at);
    END IF;

    -- Bills: Optimize revenue and financial reporting
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_date') THEN
        CREATE INDEX idx_bills_date ON bills (bill_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_regid') THEN
        CREATE INDEX idx_bills_regid ON bills (regid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_created') THEN
        CREATE INDEX idx_bills_created ON bills (created_at);
    END IF;

    -- Receipts: Optimize additional collections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipt_created') THEN
            CREATE INDEX idx_receipt_created ON receipt (created_at);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipt_regid') THEN
            CREATE INDEX idx_receipt_regid ON receipt (regid);
        END IF;
    END IF;

    -- Expenses: Optimize expense tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_date') THEN
            CREATE INDEX idx_expenses_date ON expenses (exp_date);
        END IF;
    END IF;

    -- Waitlist: Optimize wait time calculations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_date') THEN
            CREATE INDEX idx_waitlist_date ON waitlist (date);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_session') THEN
            CREATE INDEX idx_waitlist_session ON waitlist (checked_in_at, called_at);
        END IF;
    END IF;

END $$;
