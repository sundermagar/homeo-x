-- Performance Optimization 3: Dashboard hot-path indexes
-- Targets the queries in apps/api/src/infrastructure/repositories/dashboard.repository.pg.ts
-- (getKpis, getRevenueSeries, getMultiRevenueSeries, getRevenueBreakdown,
--  getRecentTransactions, getRecentActivity, getMonthlyTargets, getTopBilling).
--
-- Idempotent: every CREATE wrapped with an existence check.

DO $$
BEGIN
    -- ─── BILLS ────────────────────────────────────────────────────────────────
    -- Revenue series + financials + recent transactions:
    --   FROM bills b JOIN patients pb ON pb.regid = b.regid
    --   WHERE b.bill_date >= ... AND b.bill_date < ...
    -- The dashboard never filters bills.clinic_id directly — it joins through
    -- patients. So the right access pattern is (bill_date, regid).
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_billdate_regid_active') THEN
        CREATE INDEX idx_bills_billdate_regid_active
            ON bills (bill_date, regid)
            WHERE deleted_at IS NULL;
    END IF;

    -- Top-billing list: ORDER BY b.charges DESC NULLS LAST within a date+clinic window.
    -- Covering: (bill_date, charges DESC, regid) lets PG sort without re-reading bills.
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_billdate_charges_regid') THEN
        CREATE INDEX idx_bills_billdate_charges_regid
            ON bills (bill_date, charges DESC, regid)
            WHERE deleted_at IS NULL;
    END IF;

    -- Recent transactions UNION: ORDER BY created_at DESC, LIMIT N.
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_created_active') THEN
        CREATE INDEX idx_bills_created_active
            ON bills (created_at DESC)
            WHERE deleted_at IS NULL;
    END IF;

    -- ─── RECEIPT ──────────────────────────────────────────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt') THEN
        -- Revenue series + recent activity: filter by created_at, join to patients on regid.
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipt_created_regid_active') THEN
            CREATE INDEX idx_receipt_created_regid_active
                ON receipt (created_at, regid)
                WHERE deleted_at IS NULL OR deleted_at::text = '';
        END IF;

        -- Recent transactions UNION ordering.
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipt_created_desc_active') THEN
            CREATE INDEX idx_receipt_created_desc_active
                ON receipt (created_at DESC)
                WHERE deleted_at IS NULL OR deleted_at::text = '';
        END IF;
    END IF;

    -- ─── EXPENSES (KPI: today's expenses) ─────────────────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_clinic_date_active') THEN
            CREATE INDEX idx_expenses_clinic_date_active
                ON expenses (clinic_id, exp_date)
                WHERE deleted_at IS NULL OR deleted_at::text = '';
        END IF;
    END IF;

    -- ─── WAITLIST (KPI avg wait time + today queue) ───────────────────────────
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waitlist') THEN
        -- avg(called_at - checked_in_at) over (clinic, date) — partial on rows that
        -- contributed to the avg only.
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_clinic_date_wait') THEN
            CREATE INDEX idx_waitlist_clinic_date_wait
                ON waitlist (clinic_id, date)
                WHERE called_at IS NOT NULL
                  AND checked_in_at IS NOT NULL
                  AND deleted_at IS NULL;
        END IF;
    END IF;

    -- ─── APPOINTMENTS (recent activity feed: ORDER BY id DESC LIMIT N) ────────
    -- Already covered by idx_appointments_clinic_id_desc from migration 0016.

    -- ─── CASE_REMINDER (pending reminders widget) ─────────────────────────────
    -- The dashboard tries case_reminder first. ensureIndexes() in app.ts already
    -- creates idx_case_reminders_clinic_status WHERE status = 'pending', but
    -- only on case_reminder (singular). Make sure both spellings are covered.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'case_reminders') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_case_reminders_clinic_pending') THEN
            CREATE INDEX idx_case_reminders_clinic_pending
                ON case_reminders (regid, status)
                WHERE status = 'pending';
        END IF;
    END IF;

END $$;
