-- Fix int `id` columns in the PUBLIC schema that lack a sequence default.
-- The per-tenant sweep in 0024 only touches the tenant schema (current_schema()),
-- but tables like `ml_training_logs` and `ml_training_embeddings` live in `public`
-- and were created without a working serial default in some environments.
--
-- Runs per-tenant migration pass but is fully idempotent — first pass fixes public,
-- subsequent tenant passes find nothing to fix and are no-ops.

DO $$
DECLARE
  rec RECORD;
  seq_name text;
  max_id bigint;
BEGIN
  FOR rec IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.data_type IN ('integer', 'bigint', 'smallint')
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> '__drizzle_migrations'
  LOOP
    seq_name := rec.table_name || '_id_seq';

    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I', seq_name);

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
                   rec.table_name, 'public.' || seq_name);

    EXECUTE format('ALTER SEQUENCE public.%I OWNED BY public.%I.id',
                   seq_name, rec.table_name);

    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public.%I', rec.table_name) INTO max_id;

    PERFORM setval(
      ('public.' || seq_name)::regclass,
      GREATEST(max_id, 1),
      true
    );
  END LOOP;
END $$;
