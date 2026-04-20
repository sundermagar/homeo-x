DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenseshead') THEN
    IF (SELECT count(*) FROM "expenseshead") = 0 THEN
      INSERT INTO "expenseshead" (expenseshead, short_name, created_at, updated_at) VALUES 
        ('Rent', 'RENT', CAST(now() AS text), CAST(now() AS text)),
        ('Electricity & Utilities', 'UTIL', CAST(now() AS text), CAST(now() AS text)),
        ('Salaries', 'SALARY', CAST(now() AS text), CAST(now() AS text)),
        ('Medical Supplies', 'SUPPLY', CAST(now() AS text), CAST(now() AS text)),
        ('Marketing & Ads', 'MKTG', CAST(now() AS text), CAST(now() AS text)),
        ('Maintenance', 'MAINT', CAST(now() AS text), CAST(now() AS text)),
        ('Miscellaneous', 'MISC', CAST(now() AS text), CAST(now() AS text));
    END IF;
  END IF;
END $$;
