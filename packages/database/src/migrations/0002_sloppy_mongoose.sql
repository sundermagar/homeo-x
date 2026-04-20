ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstname" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "middlename" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" text DEFAULT 'Male';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile2" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permanent_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "about" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_left" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "joiningdate" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dept" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "qualification" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "institute" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passed_out" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "consultation_fee" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "salary_cur" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadharnumber" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pannumber" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profilepic" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_certificate" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhar_card" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pan_card" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appointment_letter" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "10_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "12_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bhms_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "md_document" text;