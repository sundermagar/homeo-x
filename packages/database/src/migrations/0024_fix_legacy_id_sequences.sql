-- Fix legacy tenant tables whose `id` column was created as `integer NOT NULL`
-- without an attached sequence (the legacy provisioner did this for 119 tables).
-- Idempotent: only acts on int-typed `id` columns that are NOT NULL with no default.

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
    WHERE c.table_schema = current_schema()
      AND c.column_name = 'id'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.data_type IN ('integer', 'bigint', 'smallint')
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> '__drizzle_migrations'
  LOOP
    seq_name := rec.table_name || '_id_seq';

    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I.%I', current_schema(), seq_name);

    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
                   current_schema(), rec.table_name, current_schema() || '.' || seq_name);

    EXECUTE format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.id',
                   current_schema(), seq_name, current_schema(), rec.table_name);

    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I.%I',
                   current_schema(), rec.table_name) INTO max_id;

    PERFORM setval(
      (current_schema() || '.' || seq_name)::regclass,
      GREATEST(max_id, 1),
      true
    );
  END LOOP;
END $$;
