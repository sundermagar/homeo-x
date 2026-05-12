/**
 * Migration: Ensure remedy_tree_nodes table has all required columns in all tenant schemas
 *
 * Run: pnpm --filter @mmc/database tsx src/scripts/fix-remedy-tree-nodes.ts
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

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log('🔌 Connected to database');

  // Get all tenant schemas
  const schemas = await sql<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;

  console.log(`📋 Found ${schemas.length} tenants`);

  for (const { schema_name } of schemas) {
    try {
      // Create table if not exists
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS "${schema_name}"."remedy_tree_nodes" (
          "id" serial PRIMARY KEY,
          "label" varchar(255),
          "parent_id" integer
        );
      `);

      // Add missing columns
      const columns = [
        ['hindi_label', 'text'],
        ['gujrati_label', 'text'],
        ['punjabi_label', 'text'],
        ['malyalum_label', 'text'],
        ['kannad_label', 'text'],
        ['bengali_label', 'text'],
        ['marathi_label', 'text'],
        ['french_label', 'text'],
        ['german_label', 'text'],
        ['spanish_label', 'text'],
        ['image', 'varchar(255)'],
        ['description', 'text'],
        ['detail_image', 'varchar(255)'],
        ['node_type', "varchar(50) DEFAULT 'RUBRIC'"],
        ['sort_order', 'integer DEFAULT 0'],
        ['is_active', 'boolean DEFAULT true'],
        ['created_at', 'timestamp DEFAULT now()'],
        ['updated_at', 'timestamp DEFAULT now()'],
        ['deleted_at', 'timestamp']
      ];

      for (const [col, type] of columns) {
        await sql.unsafe(`
          ALTER TABLE "${schema_name}"."remedy_tree_nodes" 
          ADD COLUMN IF NOT EXISTS "${col}" ${type};
        `);
      }

      console.log(`  ✅ ${schema_name}: remedy_tree_nodes table fixed`);
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
