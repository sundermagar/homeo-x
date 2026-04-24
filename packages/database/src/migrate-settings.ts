import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TenantRegistry } from './tenant-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to this file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error("❌ No DATABASE_URL found in .env");
  process.exit(1);
}

const sql = postgres(connectionString);
const migrationsDir = path.resolve(__dirname, './migrations');

const migrationFiles = [
  'migrate_settings_final.sql',
  'migrate_settings_v2.sql',
  '20260413_add_dispensary_columns.sql'
];

async function run() {
  const allDatabaseSchemas = await sql`SELECT schema_name FROM information_schema.schemata`.then(rows => rows.map(r => r['schema_name']));
  
  const tenants = TenantRegistry.getAll().filter(t => allDatabaseSchemas.includes(t.schemaName));
  const publicExists = allDatabaseSchemas.includes('public');

  console.log(`🚀 Starting migration for ${tenants.length} existing tenants + public schema...`);

  const runFiles = async (schemaName: string) => {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      try {
        await sql.unsafe(`SET search_path TO ${schemaName}; ${content}`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
      }
    }
  };

  // 1. Run on Public Schema
  if (publicExists) {
    try {
      console.log("\n📦 Migrating: public");
      await runFiles('public');
      console.log("✅ Public schema updated.");
    } catch (e: any) {
      console.error("❌ Error in public schema:", e.message);
    }
  }

  // 2. Loop through all Clinical Tenants
  for (const tenant of tenants) {
    try {
      console.log(`\n🏥 Migrating: ${tenant.displayName} (${tenant.schemaName})`);
      await runFiles(tenant.schemaName);
      console.log(`✅ ${tenant.schemaName} updated successfully.`);
    } catch (e: any) {
      console.warn(`⚠️ Skip ${tenant.schemaName}: ${e.message}`);
    }
  }

  console.log("\n✨ All migrations finished!");
  await sql.end();
}

run();
