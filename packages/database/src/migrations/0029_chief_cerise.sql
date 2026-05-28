CREATE TABLE IF NOT EXISTS "ml_training_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ml_training_log_id" integer NOT NULL,
	"tenant_id" varchar(50),
	"visit_id" varchar(50) NOT NULL,
	"embedding" vector(768) NOT NULL,
	"embedding_model" varchar(50) NOT NULL,
	"fingerprint_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ml_training_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50),
	"visit_id" varchar(50) NOT NULL,
	"consultation_mode" varchar(20),
	"patient_context" jsonb,
	"transcript" jsonb,
	"soap_notes" jsonb,
	"extracted_symptoms" jsonb,
	"mapped_rubrics" jsonb,
	"repertorization_matrix" jsonb,
	"ai_suggested_remedy" jsonb,
	"doctor_final_remedy" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"days" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unregistered_patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_id" integer,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"gender" varchar(20),
	"registered_patient_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"reminder_date" timestamp,
	"message" text,
	"status" varchar(20) DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_vaccins" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"vaccinee_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vaccinedatas" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"months" integer,
	"parent_id" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "additional_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer,
	"rand_id" varchar(50),
	"dateval" varchar(20),
	"additional_name" varchar(255),
	"additional_price" real DEFAULT 0,
	"additional_quantity" integer DEFAULT 1,
	"received_price" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"charges" varchar(255),
	"amount" real DEFAULT 0,
	"quantity" integer DEFAULT 0,
	"type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinicadmins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"designation" text DEFAULT 'Clinic Administrator',
	"gender" text DEFAULT 'Male' NOT NULL,
	"mobile" text DEFAULT '' NOT NULL,
	"mobile2" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"dept" integer DEFAULT 4 NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"date_birth" date,
	"date_left" date,
	"salary_cur" integer DEFAULT 0 NOT NULL,
	"packages" text DEFAULT '' NOT NULL,
	"clinic_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"clinic_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_reminder" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_id" integer,
	"patient_id" integer,
	"patient_name" text NOT NULL,
	"start_date" varchar(50) NOT NULL,
	"end_date" varchar(50) NOT NULL,
	"remind_time" varchar(20) NOT NULL,
	"recursion" integer,
	"remind_after" varchar(50) NOT NULL,
	"heading" varchar(255) NOT NULL,
	"comments" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_followups" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"name" text,
	"task" varchar(255),
	"taskstatus" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"mobile" varchar(50),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"source" varchar(100),
	"status" varchar(50) DEFAULT '',
	"notes" text,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer,
	"referral_id" integer,
	"total_amount" numeric(10, 2),
	"used_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "records" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer,
	"comment" text,
	"doctorname" varchar(255),
	"mobile" varchar(50),
	"recordtype" varchar(50) DEFAULT 'Call',
	"recorddate" varchar(50),
	"calltime" varchar(50),
	"instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"masked_key" text NOT NULL,
	"expires_at" timestamp,
	"status" text DEFAULT 'active',
	"last_rotated" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer,
	"description" text,
	"reference_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_credit_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"total_allocated" integer DEFAULT 0,
	"consumed" integer DEFAULT 0,
	"cycle_start" timestamp NOT NULL,
	"cycle_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_credit_wallets_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_model_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"context_window" integer,
	"cost_per_input_token" real,
	"cost_per_output_token" real,
	"status" text DEFAULT 'active',
	"capabilities" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"feature" text NOT NULL,
	"model_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"is_fallback" boolean DEFAULT false,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"audio_minutes" real,
	"credits_deducted" integer DEFAULT 0,
	"cost_inr" real DEFAULT 0,
	"prompt_text" text,
	"response_text" text,
	"latency_ms" integer,
	"status" text NOT NULL,
	"error_code" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"feature" text NOT NULL,
	"primary_model" text NOT NULL,
	"fallback_models" jsonb DEFAULT '[]'::jsonb,
	"budget_daily" integer,
	"budget_monthly" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "soap_notes" DROP CONSTRAINT IF EXISTS "soap_notes_visit_id_unique";--> statement-breakpoint
ALTER TABLE "vitals" DROP CONSTRAINT IF EXISTS "vitals_visit_id_unique";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "patient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "middle_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "surname" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "surname" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "gender" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "phone" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "mobile1" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "mobile2" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "case_datas" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "investigations" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ALTER COLUMN "parent_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ALTER COLUMN "label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "soap_notes" ALTER COLUMN "visit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vitals" ALTER COLUMN "visit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "mobile" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "mobile2" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "gender" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "city" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "about" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "designation" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_otp" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_otp_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "potency" varchar(200);--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "unit_price" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "batch_number" varchar(100);--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "snomed_code_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "unregistered_patient_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "call_status" varchar(50);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "call_date" varchar(20);--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN IF NOT EXISTS "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN IF NOT EXISTS "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN IF NOT EXISTS "unregistered_patient_id" integer;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN IF NOT EXISTS "rowcolor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "status" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "road" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "area" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "alt_address" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "religion" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "occupation" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "blood_group" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "reference" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "refered_by" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "refered_name" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "assistant_doctor" text;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "consultation_fee" integer;--> statement-breakpoint
ALTER TABLE "case_datas" ADD COLUMN IF NOT EXISTS "courier_outstation" text;--> statement-breakpoint
ALTER TABLE "investigations" ADD COLUMN IF NOT EXISTS "attachment_url" text;--> statement-breakpoint
ALTER TABLE "investigations" ADD COLUMN IF NOT EXISTS "summary" text;--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "rxremedy" varchar(255);--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "rxpotency" varchar(100);--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "rxfrequency" varchar(100);--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "rxdays" varchar(50);--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "rxprescription" text;--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "additional_name" varchar(255);--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "additional_price" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "received_price" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "received_date" varchar(20);--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "hindi_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "gujrati_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "punjabi_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "malyalum_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "kannad_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "bengali_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "marathi_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "french_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "german_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "spanish_label" text;--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "image" varchar(255);--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "detail_image" varchar(255);--> statement-breakpoint
ALTER TABLE "remedy_tree_nodes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN IF NOT EXISTS "regid" integer;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN IF NOT EXISTS "regid" integer;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "procedure_code_id" integer;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "bill_type" varchar(30) DEFAULT 'Consultation';--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "custom_title" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "dept" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "date_birth" date;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "date_left" date;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "salary_cur" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "packages" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "assigned_to" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_email" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_password" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "registration_fee" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tag_line" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "registration" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "logo" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "timing" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "tags" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "color" varchar(50) DEFAULT '#2563EB';--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "snomed_code_id" integer;--> statement-breakpoint
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "potencies" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "ml_training_embeddings" ADD CONSTRAINT "ml_training_embeddings_ml_training_log_id_ml_training_logs_id_fk" FOREIGN KEY ("ml_training_log_id") REFERENCES "public"."ml_training_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_charges" ADD CONSTRAINT "additional_charges_regid_case_datas_regid_fk" FOREIGN KEY ("regid") REFERENCES "public"."case_datas"("regid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ml_training_embeddings_log" ON "ml_training_embeddings" USING btree ("ml_training_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ml_training_embeddings_tenant" ON "ml_training_embeddings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ml_training_embeddings_visit" ON "ml_training_embeddings" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ml_training_embeddings_hnsw" ON "ml_training_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ml_training_visit" ON "ml_training_logs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ml_training_tenant" ON "ml_training_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreg_clinic_idx" ON "unregistered_patients" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreg_name_idx" ON "unregistered_patients" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreg_reg_id_idx" ON "unregistered_patients" USING btree ("registered_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreg_deleted_idx" ON "unregistered_patients" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_procedure_code_id_procedure_codes_id_fk" FOREIGN KEY ("procedure_code_id") REFERENCES "public"."procedure_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_dashboard" ON "appointments" USING btree ("clinic_id","booking_date") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_followup" ON "appointments" USING btree ("clinic_id","visit_type","booking_date") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_waitlist_dashboard" ON "waitlist" USING btree ("clinic_id","date","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_waitlist_appointment_id" ON "waitlist" USING btree ("appointment_id") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "stocks" DROP COLUMN IF EXISTS "price";--> statement-breakpoint
ALTER TABLE "homeo_details" DROP COLUMN IF EXISTS "miasm";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "profile_image";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "profile";
