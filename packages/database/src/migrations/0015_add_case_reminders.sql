-- Migration 0015: Add case_reminders table
CREATE TABLE IF NOT EXISTS "case_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"regid" integer NOT NULL,
	"reminder_date" timestamp,
	"message" text,
	"status" varchar(20) DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now()
);
