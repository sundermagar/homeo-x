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

  // Get all tenant schemas
  const schemas = await sql<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;

  for (const { schema_name } of schemas) {
    try {
      await sql.unsafe(`
        DO $$
        BEGIN
          -- Add notes column if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '${schema_name}' AND table_name = 'case_vaccins' AND column_name = 'notes') THEN
            ALTER TABLE "${schema_name}".case_vaccins ADD COLUMN notes text;
          END IF;

          -- Rename reg_id to regid if reg_id exists and regid does not
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '${schema_name}' AND table_name = 'case_vaccins' AND column_name = 'reg_id') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = '${schema_name}' AND table_name = 'case_vaccins' AND column_name = 'regid') THEN
              ALTER TABLE "${schema_name}".case_vaccins RENAME COLUMN reg_id TO regid;
            END IF;
          END IF;
        END $$;
      `);
      console.log(`  ✅ ${schema_name}: case_vaccins schema verified (notes and regid)`);
    } catch (e: any) {
      console.warn(`  ⚠️  ${schema_name}: ${e.message}`);
    }
  }

  await sql.end();
  console.log('\n🎉 Migration complete!');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
