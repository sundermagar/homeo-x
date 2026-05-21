-- Splits embeddings out of `ml_training_logs` into a dedicated table.
-- Safe to run regardless of whether 0019 (which adds fingerprint_hash) was applied.

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ml_training_embeddings" (
  "id" serial PRIMARY KEY NOT NULL,
  "ml_training_log_id" integer NOT NULL REFERENCES "ml_training_logs"("id") ON DELETE CASCADE,
  "tenant_id" varchar(50),
  "visit_id" varchar(50) NOT NULL,
  "embedding" vector(768) NOT NULL,
  "embedding_model" varchar(50) NOT NULL,
  "fingerprint_hash" varchar(64) NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ml_training_embeddings_log"    ON "ml_training_embeddings" ("ml_training_log_id");
--> statement-breakpoint
CREATE INDEX        IF NOT EXISTS "idx_ml_training_embeddings_tenant" ON "ml_training_embeddings" ("tenant_id");
--> statement-breakpoint
CREATE INDEX        IF NOT EXISTS "idx_ml_training_embeddings_visit"  ON "ml_training_embeddings" ("visit_id");
--> statement-breakpoint
CREATE INDEX        IF NOT EXISTS "idx_ml_training_embeddings_hnsw"   ON "ml_training_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

-- Backfill from old columns if they exist (handles both: 0018 only, or 0018+0019)
DO $$
DECLARE
  has_emb boolean;
  has_fp  boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ml_training_logs' AND column_name = 'embedding')        INTO has_emb;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ml_training_logs' AND column_name = 'fingerprint_hash') INTO has_fp;

  IF has_emb AND has_fp THEN
    EXECUTE $sql$
      INSERT INTO ml_training_embeddings (ml_training_log_id, tenant_id, visit_id, embedding, embedding_model, fingerprint_hash, created_at, updated_at)
      SELECT id, tenant_id, visit_id, embedding,
             COALESCE(embedding_model, 'gemini-embedding-001'),
             COALESCE(fingerprint_hash, ''),
             created_at, updated_at
      FROM ml_training_logs
      WHERE embedding IS NOT NULL
      ON CONFLICT (ml_training_log_id) DO NOTHING
    $sql$;
  ELSIF has_emb THEN
    EXECUTE $sql$
      INSERT INTO ml_training_embeddings (ml_training_log_id, tenant_id, visit_id, embedding, embedding_model, fingerprint_hash, created_at, updated_at)
      SELECT id, tenant_id, visit_id, embedding,
             COALESCE(embedding_model, 'gemini-embedding-001'),
             '',
             created_at, updated_at
      FROM ml_training_logs
      WHERE embedding IS NOT NULL
      ON CONFLICT (ml_training_log_id) DO NOTHING
    $sql$;
  END IF;
END $$;
--> statement-breakpoint

-- Drop the old vector index and columns from ml_training_logs
DROP INDEX IF EXISTS "idx_ml_embedding_hnsw";
--> statement-breakpoint
ALTER TABLE "ml_training_logs" DROP COLUMN IF EXISTS "embedding";
--> statement-breakpoint
ALTER TABLE "ml_training_logs" DROP COLUMN IF EXISTS "embedding_model";
--> statement-breakpoint
ALTER TABLE "ml_training_logs" DROP COLUMN IF EXISTS "fingerprint_hash";
