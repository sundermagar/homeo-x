ALTER TABLE "users" ADD COLUMN "clinic_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "firstname" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middlename" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "surname" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" text DEFAULT 'Male';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mobile2" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permanent_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_left" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "joiningdate" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dept" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "qualification" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "institute" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passed_out" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "consultation_fee" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "salary_cur" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "aadharnumber" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pannumber" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profilepic" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_certificate" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "aadhar_card" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pan_card" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "appointment_letter" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "10_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "12_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bhms_document" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "md_document" text;