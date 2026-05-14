CREATE TABLE IF NOT EXISTS "consent_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_regid" integer NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"ip_address" varchar(45),
	"user_agent" text,
	"consent_version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Note: We avoid FK constraint here because patients table might be in the same schema 
-- but handled by legacy migrations. Drizzle's references() would try to create it.
-- If we want strictness, we can add it later.
