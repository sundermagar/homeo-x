CREATE TABLE IF NOT EXISTS "charges" (
  "id" serial PRIMARY KEY NOT NULL,
  "charges" varchar(255),
  "amount" real DEFAULT 0,
  "quantity" integer DEFAULT 0,
  "type" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "additional_charges" (
  "id" serial PRIMARY KEY NOT NULL,
  "regid" integer REFERENCES "patients"("regid") ON DELETE SET NULL,
  "rand_id" varchar(50),
  "dateval" varchar(20),
  "additional_name" varchar(255),
  "additional_price" real DEFAULT 0,
  "additional_quantity" integer DEFAULT 1,
  "received_price" real DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "additional_name" varchar(255);
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "additional_price" real DEFAULT 0;
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "received_price" real DEFAULT 0;
ALTER TABLE "case_potencies" ADD COLUMN IF NOT EXISTS "received_date" varchar(20);
