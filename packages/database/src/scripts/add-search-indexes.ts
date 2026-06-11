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
      // Create indexes for search columns (case_insensitive search)
      await sql.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_case_datas_first_name_search ON "${schema_name}".case_datas(LOWER(first_name));
        CREATE INDEX IF NOT EXISTS idx_case_datas_surname_search ON "${schema_name}".case_datas(LOWER(surname));
        CREATE INDEX IF NOT EXISTS idx_case_datas_phone_search ON "${schema_name}".case_datas(phone);
      `);
      console.log(`  ✅ ${schema_name}: Search indexes created`);
    } catch (e: any) {
      console.warn(`  ⚠️  ${schema_name}: ${e.message}`);
    }
  }

  await sql.end();
  console.log('\n🎉 Index creation complete!');
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
