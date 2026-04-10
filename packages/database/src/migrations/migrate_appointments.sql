-- Appointments Module: Safe CREATE IF NOT EXISTS migration
-- Run against each tenant schema: psql "..." -f migrate_appointments.sql

-- ─── appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                  SERIAL PRIMARY KEY,
  patient_id          INTEGER,
  doctor_id           INTEGER,
  booking_date        DATE,
  booking_time        VARCHAR(20),
  status              VARCHAR(30) NOT NULL DEFAULT 'Pending',
  visit_type          VARCHAR(20),
  consultation_fee    NUMERIC(10,2),
  token_no            INTEGER,
  notes               TEXT,
  phone               VARCHAR(20),
  patient_name        VARCHAR(200),
  cancellation_reason TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient     ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_deleted     ON appointments(deleted_at);

-- ─── tokens (daily token sequence per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER,
  doctor_id   INTEGER,
  token_no    INTEGER NOT NULL,
  date        DATE NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'queued',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_date    ON tokens(date);
CREATE INDEX IF NOT EXISTS idx_tokens_deleted ON tokens(deleted_at);

-- ─── waitlist (live waiting room) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id               SERIAL PRIMARY KEY,
  patient_id       INTEGER NOT NULL,
  appointment_id   INTEGER,
  doctor_id        INTEGER,
  waiting_number   INTEGER NOT NULL,
  date             DATE NOT NULL,
  status           INTEGER NOT NULL DEFAULT 0,
  consultation_fee NUMERIC(10,2),
  checked_in_at    TIMESTAMP,
  called_at        TIMESTAMP,
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_date    ON waitlist(date);
CREATE INDEX IF NOT EXISTS idx_waitlist_deleted ON waitlist(deleted_at);

-- ─── doctor_availability ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_availability (
  id           SERIAL PRIMARY KEY,
  doctor_id    INTEGER NOT NULL,
  day_of_week  INTEGER NOT NULL,
  start_time   VARCHAR(20) NOT NULL,
  end_time     VARCHAR(20) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctor_avail_doctor ON doctor_availability(doctor_id);
