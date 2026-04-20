DO $$ 
BEGIN
    -- Ensure payment columns exist and are the correct type
    
    -- Rename case_id to regid if regid doesn't exist but case_id does
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='case_id') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='regid') THEN
        ALTER TABLE "payments" RENAME COLUMN "case_id" TO "regid";
    END IF;

    -- If regid exists but is not an integer, cast it to integer
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='regid' AND data_type != 'integer') THEN
        ALTER TABLE "payments" ALTER COLUMN "regid" TYPE integer USING ("regid"::integer);
    END IF;

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='bill_id') THEN
        ALTER TABLE "payments" ADD COLUMN "bill_id" integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='order_id') THEN
        ALTER TABLE "payments" ADD COLUMN "order_id" varchar(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_id') THEN
        ALTER TABLE "payments" ADD COLUMN "payment_id" varchar(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='signature') THEN
        ALTER TABLE "payments" ADD COLUMN "signature" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='amount') THEN
        ALTER TABLE "payments" ADD COLUMN "amount" real DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='currency') THEN
        ALTER TABLE "payments" ADD COLUMN "currency" varchar(10) DEFAULT 'INR' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='status') THEN
        ALTER TABLE "payments" ADD COLUMN "status" varchar(50) DEFAULT 'Completed' NOT NULL;
    END IF;

    -- Convert payment_date from text to timestamp if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_date' AND data_type = 'text') THEN
        ALTER TABLE "payments" ALTER COLUMN "payment_date" TYPE timestamp USING NULLIF("payment_date", '')::timestamp;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
