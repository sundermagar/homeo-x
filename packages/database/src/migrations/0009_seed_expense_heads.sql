DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenseshead' AND table_schema = current_schema()) THEN
    -- Repair legacy tenants whose expenseshead.id was created without a sequence default
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'expenseshead'
        AND table_schema = current_schema()
        AND column_name = 'id'
        AND column_default IS NOT NULL
    ) THEN
      EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I.expenseshead_id_seq', current_schema());
      EXECUTE format('ALTER TABLE %I.expenseshead ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
                     current_schema(), current_schema() || '.expenseshead_id_seq');
      EXECUTE format('ALTER SEQUENCE %I.expenseshead_id_seq OWNED BY %I.expenseshead.id',
                     current_schema(), current_schema());
      PERFORM setval(
        (current_schema() || '.expenseshead_id_seq')::regclass,
        GREATEST(COALESCE((SELECT MAX(id) FROM "expenseshead"), 0), 1),
        true
      );
    END IF;

    IF (SELECT count(*) FROM "expenseshead") = 0 THEN
      INSERT INTO "expenseshead" (expenseshead, short_name, created_at, updated_at) VALUES
        ('Rent', 'RENT', now(), now()),
        ('Electricity & Utilities', 'UTIL', now(), now()),
        ('Salaries', 'SALARY', now(), now()),
        ('Medical Supplies', 'SUPPLY', now(), now()),
        ('Marketing & Ads', 'MKTG', now(), now()),
        ('Maintenance', 'MAINT', now(), now()),
        ('Miscellaneous', 'MISC', now(), now());
    END IF;
  END IF;
END $$;
