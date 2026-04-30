/**
 * Migration: Add bill_type, custom_title to all tenant bills tables
 * and registration_fee to public.organizations
 *
 * Run: pnpm --filter @mmc/database tsx src/scripts/add-billing-columns.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');

dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env['DATABASE_URL']!;
console.log('Using DATABASE_URL:', DATABASE_URL ? 'FOUND' : 'NOT FOUND');

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log('🔌 Connected to database');

  // 1. Add registration_fee to public.organizations (if not exists)
  try {
    await sql`
      ALTER TABLE public.organizations
        ADD COLUMN IF NOT EXISTS registration_fee integer NOT NULL DEFAULT 0;
    `;
    console.log('✅ Added registration_fee to public.organizations');
  } catch (e: any) {
    console.warn('⚠️  organizations:', e.message);
  }

  // 2. Get all tenant schemas
  const schemas = await sql<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;

  console.log(`📋 Found ${schemas.length} tenants: ${schemas.map(s => s.schema_name).join(', ')}`);

  for (const { schema_name } of schemas) {
    try {
      // Add bill_type column
      await sql.unsafe(`
        ALTER TABLE "${schema_name}".bills
          ADD COLUMN IF NOT EXISTS bill_type varchar(30) NOT NULL DEFAULT 'Consultation';
      `);

      // Add custom_title column
      await sql.unsafe(`
        ALTER TABLE "${schema_name}".bills
          ADD COLUMN IF NOT EXISTS custom_title varchar(255);
      `);

      // Create bill_no_seq sequence if not exists (for race-condition-free numbering)
      await sql.unsafe(`
        DO $$
        DECLARE
          max_bill_no integer;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = '${schema_name}' AND sequencename = 'bill_no_seq') THEN
            EXECUTE 'CREATE SEQUENCE "${schema_name}".bill_no_seq';
            SELECT MAX(bill_no) INTO max_bill_no FROM "${schema_name}".bills;
            IF max_bill_no > 0 THEN
              EXECUTE format('SELECT setval(''%I.bill_no_seq'', %L)', '${schema_name}', max_bill_no);
            END IF;
          END IF;
        END;
        $$;
      `);

      // Update stocks table
      await sql.unsafe(`
        ALTER TABLE "${schema_name}".stocks
          ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 0,
          ADD COLUMN IF NOT EXISTS unit_price real DEFAULT 0,
          ADD COLUMN IF NOT EXISTS batch_number varchar(100),
          ADD COLUMN IF NOT EXISTS category varchar(100);
      `);

      console.log(`  ✅ ${schema_name}: bill_type, custom_title, bill_no_seq, stocks updated`);
    } catch (e: any) {
      console.warn(`  ⚠️  ${schema_name}: ${e.message}`);
    }
  }

  await sql.end();
  console.log('\n🎉 Migration complete!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
