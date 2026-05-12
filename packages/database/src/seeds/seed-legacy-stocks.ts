import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

const JSON_DATA_PATH = path.resolve(__dirname, '../../../../apps/api/scripts/legacy-data.json');

async function seed() {
  if (!fs.existsSync(JSON_DATA_PATH)) {
    console.error(`❌ JSON data not found at: ${JSON_DATA_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // Determine target schema. 
  // For dev/demo, we usually target 'tenant_demo' or 'public'.
  // User wants it integrated into "his project", so I'll target 'tenant_demo' as a baseline.
  const schema = 'tenant_demo';

  console.log(`🚀 Seeding legacy medicine data into schema: [${schema}]`);

  // 1. Seed Potencies
  if (data.potencies?.length) {
    console.log(`📦 Seeding ${data.potencies.length} potencies...`);
    for (const p of data.potencies) {
      try {
        await client.unsafe(`
          INSERT INTO "${schema}"."potencies" (id, name, created_at)
          VALUES (${p.id}, '${String(p.name).replace(/'/g, "''")}', NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `);
      } catch (e: any) {
        console.warn(`  ⚠️ Potency ${p.name}: ${e.message}`);
      }
    }
  }

  // 2. Seed Frequencies
  if (data.frequencies?.length) {
    console.log(`⏰ Seeding ${data.frequencies.length} frequencies...`);
    for (const f of data.frequencies) {
      try {
        await client.unsafe(`
          INSERT INTO "${schema}"."case_frequency" (id, title, frequency, created_at)
          VALUES (${f.id}, '${String(f.frequency).replace(/'/g, "''")}', '${String(f.frequency).replace(/'/g, "''")}', NOW())
          ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, frequency = EXCLUDED.frequency
        `);
      } catch (e: any) {
        console.warn(`  ⚠️ Frequency ${f.frequency}: ${e.message}`);
      }
    }
  }

  // 3. Seed Stocks (Medicine Inventory)
  if (data.stocks?.length) {
    console.log(`💊 Seeding ${data.stocks.length} stock items...`);
    const chunkSize = 100;
    for (let i = 0; i < data.stocks.length; i += chunkSize) {
      const chunk = data.stocks.slice(i, i + chunkSize);
      const values = chunk.map((s: any) => {
        const name = String(s.name || '').replace(/'/g, "''");
        const desc = String(s.description || '').replace(/'/g, "''");
        const potency = String(s.potency || '').replace(/'/g, "''");
        return `(${s.id}, '${name}', '${desc}', '${potency}', NOW())`;
      }).join(', ');

      try {
        await client.unsafe(`
          INSERT INTO "${schema}"."stocks" (id, name, description, potency, created_at)
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            potency = EXCLUDED.potency
        `);
      } catch (e: any) {
        console.error(`  ❌ Stock Batch failed at ${i}:`, e.message);
      }
    }
  }

  // Reset sequences
  await client.unsafe(`SELECT setval(pg_get_serial_sequence('"${schema}"."stocks"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${schema}"."stocks"))`);
  await client.unsafe(`SELECT setval(pg_get_serial_sequence('"${schema}"."potencies"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${schema}"."potencies"))`);
  await client.unsafe(`SELECT setval(pg_get_serial_sequence('"${schema}"."case_frequency"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${schema}"."case_frequency"))`);

  console.log('✅ Seeding complete!');
  await client.end();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
