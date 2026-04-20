-- SMS tables
CREATE TABLE IF NOT EXISTS "sms_templates" (
  "id" serial PRIMARY KEY,
  "name" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "sms_type" varchar(100) DEFAULT 'General',
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "sms_reports" (
  "id" serial PRIMARY KEY,
  "regid" integer NOT NULL,
  "phone" varchar(20),
  "message" text NOT NULL,
  "sms_type" varchar(100) NOT NULL,
  "send_date" varchar(100) NOT NULL,
  "status" varchar(50) DEFAULT 'sent',
  "gateway_ref" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "whatsapp_logs" (
  "id" serial PRIMARY KEY,
  "regid" integer,
  "phone" varchar(20) NOT NULL,
  "message" text NOT NULL,
  "deep_link" varchar(500),
  "status" varchar(50) DEFAULT 'sent',
  "send_date" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "otps" (
  "id" serial PRIMARY KEY,
  "phone" varchar(20) NOT NULL,
  "otp" varchar(10) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "verified" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- Consultation tables
CREATE TABLE IF NOT EXISTS "consultations" (
  "id" serial PRIMARY KEY,
  "patient_id" integer NOT NULL,
  "doctor_id" integer,
  "appointment_id" integer,
  "visit_type" varchar(50),
  "status" varchar(50) DEFAULT 'in_progress',
  "subjective" text,
  "objective" text,
  "assessment" text,
  "plan" text,
  "advice" text,
  "ai_generated" boolean DEFAULT false,
  "ai_confidence" real,
  "doctor_approved" boolean DEFAULT false,
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" serial PRIMARY KEY,
  "consultation_id" integer,
  "regid" integer,
  "remedy" text NOT NULL,
  "potency" text,
  "frequency" text,
  "duration" text,
  "instructions" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "soap_notes" (
  "id" serial PRIMARY KEY,
  "visit_id" integer NOT NULL,
  "subjective" text,
  "objective" text,
  "assessment" text,
  "plan" text,
  "advice" text,
  "follow_up" text,
  "icd_codes" jsonb,
  "ai_generated" boolean,
  "ai_confidence" real,
  "doctor_approved" boolean,
  "approved_at" timestamp,
  "specialty_data" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "vitals" (
  "id" serial PRIMARY KEY,
  "visit_id" integer NOT NULL,
  "height_cm" real,
  "weight_kg" real,
  "bmi" real,
  "temperature_f" real,
  "pulse_rate" integer,
  "systolic_bp" integer,
  "diastolic_bp" integer,
  "respiratory_rate" integer,
  "oxygen_saturation" real,
  "blood_sugar" real,
  "notes" text,
  "recorded_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Billing tables
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" serial PRIMARY KEY,
  "regid" integer,
  "invoice_number" varchar(50),
  "patient_name" text,
  "phone" varchar(20),
  "consultation_fee" decimal(10,2),
  "medicine_price" decimal(10,2),
  "additional_charges" decimal(10,2) DEFAULT 0,
  "discount" decimal(10,2) DEFAULT 0,
  "total_amount" decimal(10,2),
  "received_amount" decimal(10,2) DEFAULT 0,
  "balance" decimal(10,2) DEFAULT 0,
  "payment_mode" varchar(50),
  "payment_date" text,
  "status" varchar(50) DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY,
  "invoice_id" integer,
  "regid" text,
  "amount" real,
  "payment_mode" text,
  "payment_date" text,
  "transaction_id" text,
  "status" text,
  "currency" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" text
);

CREATE TABLE IF NOT EXISTS "expense_heads" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "short_name" text,
  "category" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" text
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" serial PRIMARY KEY,
  "clinic_id" integer,
  "expense_head_id" integer,
  "dateval" text,
  "exp_date" date,
  "amount" decimal(10,2),
  "detail" text,
  "voucher_number" text,
  "payment_mode" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" text
);

-- Platform tables
CREATE TABLE IF NOT EXISTS "staff" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "email" text,
  "password" text,
  "role" text NOT NULL,
  "designation" text,
  "department" text,
  "gender" text,
  "mobile" text,
  "mobile2" text,
  "city" text,
  "address" text,
  "date_birth" date,
  "date_joined" date,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "departments" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "short_name" text,
  "color" text,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "display_name" text,
  "permissions" jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY,
  "key" varchar(100) NOT NULL,
  "value" text,
  "category" varchar(50),
  "is_public" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer,
  "action" text NOT NULL,
  "resource" text,
  "resource_id" text,
  "old_data" jsonb,
  "new_data" jsonb,
  "ip_address" varchar(50),
  "user_agent" text,
  "correlation_id" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "patients" (
  "id" serial PRIMARY KEY,
  "regid" integer,
  "patientid" integer,
  "first_name" text,
  "middle_name" text,
  "surname" text,
  "gender" text,
  "date_of_birth" date,
  "phone" text,
  "mobile1" text,
  "mobile2" text,
  "email" text,
  "address" text,
  "area" text,
  "city" text,
  "state" text,
  "pin" text,
  "occupation" text,
  "religion" text,
  "reference" text,
  "refered_by" text,
  "abha_id" text,
  "status" text DEFAULT 'active',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "doctors" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "email" text,
  "mobile" text,
  "specialty" text,
  "qualification" text,
  "consultation_fee" decimal(10,2),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

