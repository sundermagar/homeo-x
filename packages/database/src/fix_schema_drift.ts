import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });
const dbUrl = process.env['DATABASE_URL']!;
const sql = postgres(dbUrl, { max: 1 });

async function diagnoseAndFix() {
  // 1. Find schemas missing procedure_code_id on bills
  const missingBills = await sql`
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c 
      WHERE c.table_schema = s.schema_name 
      AND c.table_name = 'bills' 
      AND c.column_name = 'procedure_code_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.tables t 
      WHERE t.table_schema = s.schema_name 
      AND t.table_name = 'bills'
    )
  `;
  console.log(`\n=== Schemas MISSING procedure_code_id on bills: ${missingBills.length} ===`);
  for (const s of missingBills) console.log('  -', s['schema_name']);

  // 2. Find schemas missing deleted_at on medicines
  const missingMed = await sql`
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c 
      WHERE c.table_schema = s.schema_name 
      AND c.table_name = 'medicines' 
      AND c.column_name = 'deleted_at'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.tables t 
      WHERE t.table_schema = s.schema_name 
      AND t.table_name = 'medicines'
    )
  `;
  console.log(`\n=== Schemas MISSING deleted_at on medicines: ${missingMed.length} ===`);
  for (const s of missingMed) console.log('  -', s['schema_name']);

  // 3. Find schemas missing snomed_concepts table
  const missingSnomed = await sql`
    SELECT s.schema_name 
    FROM information_schema.schemata s
    WHERE s.schema_name LIKE 'tenant_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables t 
      WHERE t.table_schema = s.schema_name 
      AND t.table_name = 'snomed_concepts'
    )
  `;
  console.log(`\n=== Schemas MISSING snomed_concepts table: ${missingSnomed.length} ===`);
  for (const s of missingSnomed) console.log('  -', s['schema_name']);

  // 4. NOW FIX ALL OF THEM
  const allSchemas = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`;
  console.log(`\n=== Applying direct fixes to ${allSchemas.length} tenant schemas... ===\n`);

  for (const row of allSchemas) {
    const schema = row['schema_name'];
    try {
      // Fix bills table
      await sql.unsafe(`ALTER TABLE "${schema}"."bills" ADD COLUMN IF NOT EXISTS "procedure_code_id" integer`);
      await sql.unsafe(`ALTER TABLE "${schema}"."bills" ADD COLUMN IF NOT EXISTS "bill_type" varchar(30) DEFAULT 'Consultation'`);
      await sql.unsafe(`ALTER TABLE "${schema}"."bills" ADD COLUMN IF NOT EXISTS "custom_title" varchar(255)`);

      // Fix medicines table 
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "name" varchar(255)`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "disease" text`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "potency_id" integer`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "type" varchar(100)`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "category" varchar(100)`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "price" real DEFAULT 0`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "stock_level" integer DEFAULT 0`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`);
      await sql.unsafe(`ALTER TABLE "${schema}"."medicines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);
      
      // Populate name from legacy columns
      await sql.unsafe(`UPDATE "${schema}"."medicines" SET "name" = "shortname" WHERE "name" IS NULL AND "shortname" IS NOT NULL`);
      await sql.unsafe(`UPDATE "${schema}"."medicines" SET "name" = "remedy" WHERE "name" IS NULL AND "remedy" IS NOT NULL`);

      // Fix stocks table  
      await sql.unsafe(`ALTER TABLE "${schema}"."stocks" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 0`);
      await sql.unsafe(`ALTER TABLE "${schema}"."stocks" ADD COLUMN IF NOT EXISTS "unit_price" real`);
      await sql.unsafe(`ALTER TABLE "${schema}"."stocks" ADD COLUMN IF NOT EXISTS "batch_number" varchar(100)`);
      await sql.unsafe(`ALTER TABLE "${schema}"."stocks" ADD COLUMN IF NOT EXISTS "category" varchar(100)`);

      // Create snomed_concepts if missing
      await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${schema}"."snomed_concepts" (
        "id" serial PRIMARY KEY,
        "concept_id" bigint NOT NULL UNIQUE,
        "fsn" text NOT NULL,
        "term" text NOT NULL,
        "concept_type" varchar(50),
        "active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      )`);

      // Create procedure_codes if missing
      await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${schema}"."procedure_codes" (
        "id" serial PRIMARY KEY,
        "code" varchar(20) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "description" text,
        "category" varchar(100),
        "standard" varchar(20) DEFAULT 'CPT',
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      )`);

      console.log(`  ✅ ${schema} — fixed`);
    } catch (err: any) {
      console.error(`  ❌ ${schema} — ${err.message}`);
    }
  }

  // Also fix public schema
  try {
    await sql.unsafe(`ALTER TABLE "public"."bills" ADD COLUMN IF NOT EXISTS "procedure_code_id" integer`);
    await sql.unsafe(`ALTER TABLE "public"."bills" ADD COLUMN IF NOT EXISTS "bill_type" varchar(30) DEFAULT 'Consultation'`);
    await sql.unsafe(`ALTER TABLE "public"."bills" ADD COLUMN IF NOT EXISTS "custom_title" varchar(255)`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "name" varchar(255)`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "price" real DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "stock_level" integer DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`);
    await sql.unsafe(`ALTER TABLE "public"."medicines" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`);
    await sql.unsafe(`ALTER TABLE "public"."stocks" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 0`);
    await sql.unsafe(`ALTER TABLE "public"."stocks" ADD COLUMN IF NOT EXISTS "unit_price" real`);
    await sql.unsafe(`ALTER TABLE "public"."stocks" ADD COLUMN IF NOT EXISTS "batch_number" varchar(100)`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "public"."snomed_concepts" (
      "id" serial PRIMARY KEY,
      "concept_id" bigint NOT NULL UNIQUE,
      "fsn" text NOT NULL,
      "term" text NOT NULL,
      "concept_type" varchar(50),
      "active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT now()
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS "public"."procedure_codes" (
      "id" serial PRIMARY KEY,
      "code" varchar(20) NOT NULL UNIQUE,
      "name" varchar(255) NOT NULL,
      "description" text,
      "category" varchar(100),
      "standard" varchar(20) DEFAULT 'CPT',
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT now()
    )`);
    console.log(`  ✅ public — fixed`);
  } catch (err: any) {
    console.error(`  ❌ public — ${err.message}`);
  }

  // Verify the fix for hopeeclinic
  const verify = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'tenant_hopeeclinic' AND table_name = 'bills' 
    AND column_name IN ('procedure_code_id', 'bill_type', 'custom_title')
  `;
  console.log(`\n=== Verification: tenant_hopeeclinic.bills columns: ===`);
  for (const r of verify) console.log('  ✓', r['column_name']);

  const verifyMed = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'tenant_hopeeclinic' AND table_name = 'medicines' 
    AND column_name = 'deleted_at'
  `;
  console.log(`\n=== Verification: tenant_hopeeclinic.medicines.deleted_at: ===`);
  console.log(verifyMed.length > 0 ? '  ✓ deleted_at EXISTS' : '  ✗ deleted_at STILL MISSING');

  await sql.end();
  console.log('\n🎉 Done!');
}

diagnoseAndFix().catch(e => { console.error(e); process.exit(1); });
