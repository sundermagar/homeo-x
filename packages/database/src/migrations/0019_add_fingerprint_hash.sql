ALTER TABLE "ml_training_logs" ADD COLUMN IF NOT EXISTS "fingerprint_hash" varchar(64);
