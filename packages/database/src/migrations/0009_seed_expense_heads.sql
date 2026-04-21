DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenseshead') THEN
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
