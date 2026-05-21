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
CREATE INDEX IF NOT EXISTS "idx_ml_training_tenant" ON "ml_training_logs" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ml_training_visit" ON "ml_training_logs" ("visit_id");