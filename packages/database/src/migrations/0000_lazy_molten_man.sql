CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"context_id" integer,
	"role_id" integer,
	"role_name" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"remember_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_role" (
	"permission_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_role_permission_id_role_id_pk" PRIMARY KEY("permission_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "permissions_name_unique" UNIQUE("name"),
	CONSTRAINT "permissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_user" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_user_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(100),
	"quantity" integer DEFAULT 0,
	"price" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer,
	"doctor_id" integer,
	"booking_date" date,
	"booking_time" varchar(20),
	"status" varchar(30) DEFAULT 'Pending' NOT NULL,
	"visit_type" varchar(20),
	"consultation_fee" numeric(10, 2),
	"token_no" integer,
	"notes" text,
	"phone" varchar(20),
	"patient_name" varchar(200),
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(20) NOT NULL,
	"end_time" varchar(20) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer,
	"doctor_id" integer,
	"token_no" integer NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"doctor_id" integer,
	"waiting_number" integer NOT NULL,
	"date" date NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"consultation_fee" numeric(10, 2),
	"checked_in_at" timestamp,
	"called_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"price" real DEFAULT 0 NOT NULL,
	"duration_days" integer DEFAULT 30 NOT NULL,
	"color_code" varchar(20) DEFAULT '#2563EB',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"regid" integer NOT NULL,
	"package_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'Active',
	"bill_id" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_reports" (
	"id" serial PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"sms_type" varchar(100) DEFAULT 'General',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_logs" (
	"id" serial PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_datas" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"patientid" integer,
	"title" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"surname" text NOT NULL,
	"gender" text,
	"dob" date,
	"date_of_birth" text,
	"phone" varchar(20),
	"mobile1" text,
	"mobile2" text,
	"email" varchar(150),
	"address" text,
	"city" text,
	"state" text,
	"pin" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "case_datas_regid_unique" UNIQUE("regid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_examination" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"examination_date" varchar(20),
	"bp_systolic" integer,
	"bp_diastolic" integer,
	"findings" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"picture" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"notes" text,
	"notes_type" varchar(50) DEFAULT 'General',
	"dateval" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "growth_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"months" integer NOT NULL,
	"gender" varchar(1) NOT NULL,
	"ideal_height_cm" numeric(5, 2),
	"ideal_weight_kg" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homeo_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"thermal" varchar(50),
	"constitutional" varchar(100),
	"miasm" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "homeo_details_regid_unique" UNIQUE("regid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investigations" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"visit_id" integer,
	"type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"invest_date" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medicalcases" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"clinic_id" integer,
	"doctor_id" integer,
	"status" varchar(50) DEFAULT 'Active',
	"condition" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_potencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"visit_id" integer,
	"dateval" varchar(20),
	"medicine_id" integer,
	"potency_id" integer,
	"frequency_id" integer,
	"days" integer,
	"instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soap_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"advice" text,
	"follow_up" text,
	"icd_codes" jsonb,
	"ai_generated" boolean DEFAULT false,
	"ai_confidence" real,
	"doctor_approved" boolean DEFAULT false,
	"approved_at" timestamp,
	"specialty_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "soap_notes_visit_id_unique" UNIQUE("visit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vitals" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"recorded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vitals_visit_id_unique" UNIQUE("visit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer,
	"bill_no" integer,
	"bill_date" date,
	"charges" real DEFAULT 0 NOT NULL,
	"received" real DEFAULT 0 NOT NULL,
	"balance" real DEFAULT 0 NOT NULL,
	"payment_mode" varchar(50),
	"treatment" varchar(255),
	"disease" varchar(255),
	"from_date" date,
	"to_date" date,
	"charge_id" integer,
	"doctor_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer,
	"bill_id" integer,
	"order_id" varchar(255),
	"payment_id" varchar(255),
	"signature" text,
	"amount" real NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) NOT NULL,
	"payment_mode" varchar(50) NOT NULL,
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soap_notes_view" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"lab_order_id" integer NOT NULL,
	"test_name" varchar(200) NOT NULL,
	"test_code" varchar(50),
	"category" varchar(100),
	"priority" varchar(20) DEFAULT 'ROUTINE',
	"status" varchar(30),
	"result_value" varchar(100),
	"reference_range" varchar(100),
	"unit" varchar(50),
	"flag" varchar(20),
	"ai_suggested" boolean DEFAULT false,
	"result_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50),
	"visit_id" integer NOT NULL,
	"patient_id" integer,
	"ordered_by" integer,
	"status" varchar(30) DEFAULT 'ORDERED',
	"notes" text,
	"ordered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scribing_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50),
	"visit_id" varchar(50) NOT NULL,
	"user_id" integer,
	"status" varchar(20) DEFAULT 'ACTIVE',
	"language" varchar(10) DEFAULT 'en-US',
	"total_duration_ms" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcript_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sequence_number" integer NOT NULL,
	"text" text NOT NULL,
	"speaker" varchar(20) DEFAULT 'DOCTOR',
	"confidence" real DEFAULT 1,
	"start_time_ms" integer,
	"end_time_ms" integer,
	"is_final" boolean DEFAULT true,
	"source" varchar(30) DEFAULT 'WEB_SPEECH_API',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"user_id" integer,
	"visit_id" varchar(50),
	"action_type" varchar(100) NOT NULL,
	"provider" varchar(30),
	"model" varchar(50),
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"confidence" integer,
	"input_hash" varchar(100),
	"output_json" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(100) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"user_id" integer,
	"correlation_id" varchar(50),
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"old_data" jsonb,
	"new_data" jsonb,
	"metadata" jsonb,
	"ip" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '',
	"password" text DEFAULT '',
	"mobile" text DEFAULT '',
	"mobile2" text DEFAULT '',
	"gender" text DEFAULT 'Male',
	"city" text DEFAULT '',
	"address" text DEFAULT '',
	"about" text DEFAULT '',
	"designation" text DEFAULT '',
	"clinic_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '',
	"phone" text DEFAULT '',
	"address" text DEFAULT '',
	"website" text DEFAULT '',
	"connect_since" date DEFAULT '1990-01-01',
	"city" text DEFAULT '',
	"description" text DEFAULT '',
	"profile_image" integer DEFAULT 0,
	"profile" integer DEFAULT 0,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courier_masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(50),
	"tracking_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dispensaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"password" text,
	"gender" varchar(20) DEFAULT 'Male',
	"mobile" varchar(50),
	"mobile2" varchar(50),
	"location" varchar(255),
	"city" varchar(100),
	"address" text,
	"about" text,
	"designation" varchar(100),
	"dept" varchar(100),
	"date_birth" date,
	"contact_number" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"ques" text NOT NULL,
	"detail" text,
	"ans" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_frequency" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"frequency" text,
	"duration" varchar(255),
	"days" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medicines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"disease" text,
	"potency_id" integer,
	"type" varchar(100),
	"category" varchar(100),
	"price" real DEFAULT 0,
	"stock_level" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pdf_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"header_html" text,
	"footer_html" text,
	"margin" varchar(100),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "potencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "static_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "static_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- FK constraints removed: case_datas has duplicate regid values and type mismatches
-- ALTER TABLE "bills" ADD CONSTRAINT "bills_regid_case_datas_regid_fk" FOREIGN KEY ("regid") REFERENCES "case_datas"("regid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "payments" ADD CONSTRAINT "payments_regid_case_datas_regid_fk" FOREIGN KEY ("regid") REFERENCES "case_datas"("regid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_audit_tenant" ON "ai_audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_audit_visit" ON "ai_audit_logs" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");
