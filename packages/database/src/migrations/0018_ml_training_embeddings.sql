-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to ml_training_logs
ALTER TABLE "ml_training_logs" ADD COLUMN IF NOT EXISTS "embedding" vector(768);
ALTER TABLE "ml_training_logs" ADD COLUMN IF NOT EXISTS "embedding_model" varchar(50);

-- HNSW index for fast cosine similarity search
-- (HNSW is ~10x faster than IVFFlat at query time, slightly slower to build)
CREATE INDEX IF NOT EXISTS "idx_ml_embedding_hnsw"
  ON "ml_training_logs"
  USING hnsw ("embedding" vector_cosine_ops);