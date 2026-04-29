/**
 * Seed: Import extracted remedy chart data into tenant_demo
 *
 * Run: pnpm --filter @mmc/database tsx src/seeds/seed-remedy-chart.ts
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

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const schema = 'tenant_demo';

  console.log('🔌 Connected to database');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Data file not found:', dataPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📋 Loading ${data.length} records into ${schema}.remedy_chart`);

  // Clear existing data (optional, but good for idempotency during dev)
  await sql.unsafe(`TRUNCATE TABLE "${schema}"."remedy_chart" RESTART IDENTITY CASCADE`);

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const values = batch.map((row: any) => ({
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
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));

    // We use raw SQL because we want to preserve IDs for parent-child relationship
    for (const v of values) {
        await sql.unsafe(`
            INSERT INTO "${schema}"."remedy_chart" 
            (id, label, parent_id, hindi_label, gujrati_label, punjabi_label, malyalum_label, kannad_label, bengali_label, marathi_label, french_label, german_label, spanish_label, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO NOTHING
        `, [
            v.id, v.label, v.parent_id, v.hindi_label, v.gujrati_label, v.punjabi_label, v.malyalum_label, v.kannad_label, v.bengali_label, v.marathi_label, v.french_label, v.german_label, v.spanish_label, v.created_at, v.updated_at
        ]);
    }
    
    console.log(`  ✅ Processed ${Math.min(i + batchSize, data.length)} / ${data.length}`);
  }

  // Adjust sequence
  await sql.unsafe(`SELECT setval('"${schema}".remedy_chart_id_seq', (SELECT MAX(id) FROM "${schema}"."remedy_chart"))`);

  await sql.end();
  console.log('\n🎉 Seeding complete!');
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
