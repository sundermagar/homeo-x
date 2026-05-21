/**
 * Seed: Import extracted remedy chart data into tenant_demo (V9 - DATE FIX)
 *
 * Run: pnpm --filter @mmc/database tsx src/seeds/seed-remedy-tree-nodes.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');

dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env['DATABASE_URL']!;
const dataPath = path.resolve(__dirname, '../../../../apps/api/scripts/remedy_chart_data.json');

function isValidDate(d: any) {
  if (!d) return false;
  const date = new Date(d);
  return date instanceof Date && !isNaN(date.getTime());
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 20 });
  const schema = 'tenant_demo';

  console.log('🔌 Connected to database');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file not found:', dataPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📋 Loading ${data.length} records into ${schema}.remedy_tree_nodes`);

  // Clear existing data
  await sql.unsafe(`TRUNCATE TABLE "${schema}"."remedy_tree_nodes" RESTART IDENTITY CASCADE`);

  // Transform data
  const rows = data.map((row: any) => ({
    id: parseInt(row.id),
    label: row.label,
    parent_id: row.parent_id ? parseInt(row.parent_id) : 0,
    hindi_label: row.hindi_label,
    gujrati_label: row.gujrati_label,
    punjabi_label: row.punjabi_label,
    malyalum_label: row.malyalum_label,
    kannad_label: row.kannad_label,
    bengali_label: row.bengali_label,
    marathi_label: row.marathi_label,
    french_label: row.french_label,
    german_label: row.german_label,
    spanish_label: row.spanish_label,
    created_at: isValidDate(row.created_at) ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: isValidDate(row.updated_at) ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }));

  // Parallel inserts
  const concurrency = 50;
  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    await Promise.all(chunk.map((r: any) => 
      sql.unsafe(`
        INSERT INTO "${schema}"."remedy_tree_nodes" 
        (id, label, parent_id, hindi_label, gujrati_label, punjabi_label, malyalum_label, kannad_label, bengali_label, marathi_label, french_label, german_label, spanish_label, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.label, r.parent_id, r.hindi_label, r.gujrati_label, r.punjabi_label, r.malyalum_label, r.kannad_label, r.bengali_label, r.marathi_label, r.french_label, r.german_label, r.spanish_label, r.created_at, r.updated_at
      ])
    ));
    console.log(`  ✅ Processed ${Math.min(i + concurrency, rows.length)} / ${rows.length}`);
  }

  // Adjust sequence
  await sql.unsafe(`SELECT setval('"${schema}".remedy_tree_nodes_id_seq', (SELECT MAX(id) FROM "${schema}"."remedy_tree_nodes"))`);

  await sql.end();
  console.log('\n🎉 Seeding complete!');
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
