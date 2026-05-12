-- Performance Optimization 2: Composite + trigram indexes for hot query paths
-- Targets the patient list, appointment list, waitlist, follow-ups and token issue
-- query patterns observed in:
--   - apps/api/src/infrastructure/repositories/appointment.repository.pg.ts
--   - apps/api/src/infrastructure/repositories/patient.repository.pg.ts
--
-- Idempotent: every CREATE wrapped with an existence check.
-- Note: this migration runs inside a transaction (drizzle-kit migrate),
-- so we use plain CREATE INDEX (not CONCURRENTLY). For zero-downtime production
-- runs against large tables, prefer scripts/apply-quick-win-indexes.ts instead,
-- which uses CREATE INDEX CONCURRENTLY across every tenant schema.

-- ─── pg_trgm extension (for ILIKE '%foo%' searches) ──────────────────────────
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping pg_trgm — insufficient privilege. Trigram indexes will be skipped.';
END $$;

DO $$
DECLARE
    has_trgm boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') INTO has_trgm;

    -- ─── APPOINTMENTS ────────────────────────────────────────────────────────
    -- Doctor day view + slot-availability lookup (findAvailableSlots, dashboards)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_doctor_date') THEN
        CREATE INDEX idx_appointments_doctor_date
            ON appointments (doctor_id, booking_date)
            WHERE deleted_at IS NULL;
    END IF;

    -- Status-filtered dashboard queries (Pending/Confirmed/Waitlist filters)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_clinic_status_date') THEN
        CREATE INDEX idx_appointments_clinic_status_date
            ON appointments (clinic_id, status, booking_date)
            WHERE deleted_at IS NULL;
    END IF;

    -- findMany pagination (ORDER BY id DESC) scoped to clinic
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_clinic_id_desc') THEN
        CREATE INDEX idx_appointments_clinic_id_desc
            ON appointments (clinic_id, id DESC)
            WHERE deleted_at IS NULL;
    END IF;

    -- Patient history (medical case timeline / follow-ups)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_patient_date_desc') THEN
        CREATE INDEX idx_appointments_patient_date_desc
            ON appointments (patient_id, booking_date DESC)
            WHERE deleted_at IS NULL;
    END IF;

    -- ILIKE %search% on appointment list (name + phone)
    IF has_trgm THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_patient_name_trgm') THEN
            CREATE INDEX idx_appointments_patient_name_trgm
                ON appointments USING gin (patient_name gin_trgm_ops);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_phone_trgm') THEN
            CREATE INDEX idx_appointments_phone_trgm
                ON appointments USING gin (phone gin_trgm_ops);
        END IF;
    END IF;

    -- ─── CASE_DATAS (patients) ───────────────────────────────────────────────
    -- Patient list pagination (clinic + ORDER BY id DESC)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_clinic_id_desc') THEN
        CREATE INDEX idx_patients_clinic_id_desc
            ON case_datas (clinic_id, id DESC)
            WHERE deleted_at IS NULL;
    END IF;

    -- Direct phone-number lookup (exact match, walk-in identification)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_mobile1') THEN
        CREATE INDEX idx_patients_mobile1
            ON case_datas (mobile1)
            WHERE deleted_at IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_phone') THEN
        CREATE INDEX idx_patients_phone
            ON case_datas (phone)
            WHERE deleted_at IS NULL;
    END IF;

    -- Patient ILIKE %search% across the four searchable fields
    IF has_trgm THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_first_name_trgm') THEN
            CREATE INDEX idx_patients_first_name_trgm
                ON case_datas USING gin (first_name gin_trgm_ops);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_surname_trgm') THEN
            CREATE INDEX idx_patients_surname_trgm
                ON case_datas USING gin (surname gin_trgm_ops);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_mobile1_trgm') THEN
            CREATE INDEX idx_patients_mobile1_trgm
                ON case_datas USING gin (mobile1 gin_trgm_ops);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_phone_trgm') THEN
            CREATE INDEX idx_patients_phone_trgm
                ON case_datas USING gin (phone gin_trgm_ops);
        END IF;
    END IF;

    -- ─── WAITLIST ────────────────────────────────────────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist') THEN
        -- addToWaitlist dedup check: (patient_id, date, status, deleted_at IS NULL)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_patient_date_status') THEN
            CREATE INDEX idx_waitlist_patient_date_status
                ON waitlist (patient_id, date, status)
                WHERE deleted_at IS NULL;
        END IF;

        -- callNextInWaitlist / skipWaitlistEntry: (doctor_id, date, status)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_doctor_date_status') THEN
            CREATE INDEX idx_waitlist_doctor_date_status
                ON waitlist (doctor_id, date, status)
                WHERE deleted_at IS NULL;
        END IF;

        -- ORDER BY waiting_number + max(waiting_number) per date
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_date_waitnum') THEN
            CREATE INDEX idx_waitlist_date_waitnum
                ON waitlist (date, waiting_number)
                WHERE deleted_at IS NULL;
        END IF;
    END IF;

    -- ─── PENDING_APPOINTMENTS (next-visit follow-ups) ────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_appointments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pending_appts_regid') THEN
            CREATE INDEX idx_pending_appts_regid
                ON pending_appointments (regid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pending_appts_next_date') THEN
            CREATE INDEX idx_pending_appts_next_date
                ON pending_appointments (next_date);
        END IF;
    END IF;

    -- ─── TOKENS (daily token-number issuance) ────────────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tokens') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tokens_date_tokenno') THEN
            CREATE INDEX idx_tokens_date_tokenno
                ON tokens (date, token_no)
                WHERE deleted_at IS NULL;
        END IF;
    END IF;

    -- ─── BILLS (waitlist patient_finances CTE: GROUP BY regid) ───────────────
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_regid_active') THEN
        CREATE INDEX idx_bills_regid_active
            ON bills (regid)
            WHERE deleted_at IS NULL;
    END IF;

END $$;
