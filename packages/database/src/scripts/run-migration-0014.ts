/**
 * Migration runner for 0014_add_vitals_regid_fix_images.sql
 * 
 * Usage: npx tsx packages/database/src/scripts/run-migration-0014.ts
 * 
 * This script:
 * 1. Adds `regid` column to `vitals` table (backfills from appointments)
 * 2. Makes `visit_id` nullable in `vitals`
 * 3. Adds `regid` column to `soap_notes` table (backfills from appointments)
 * 4. Fixes NULL `created_at` in `case_images` and `case_notes`
 * 
 * Safe to re-run. Does NOT delete any data.
 */

import { createDbClient, TenantRegistry } from '../index.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting migration 0014: vitals regid + fix images...\n');

  // Read the SQL file
  const sqlPath = path.resolve(process.cwd(), 'packages/database/src/migrations/0014_add_vitals_regid_fix_images.sql');
  const migrationSql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons and filter empty statements
  const statements = migrationSql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Run on public schema first
  const publicDb = createDbClient(DATABASE_URL!);

  // Initialize tenant registry
  if (typeof (TenantRegistry as any).initialize === 'function') {
    await (TenantRegistry as any).initialize(publicDb);
  }

  // Get all tenant schemas
  const tenants = TenantRegistry.getAll();
  const schemas = ['public', ...tenants.map((t: any) => t.schemaName).filter(Boolean)];

  for (const schemaName of schemas) {
    console.log(`\n📦 Running migration on schema: ${schemaName}`);
    
    try {
      const db = schemaName === 'public' 
        ? publicDb 
        : createDbClient(DATABASE_URL!, schemaName);

      // Set search path
      await db.execute(sql.raw(`SET search_path TO ${schemaName}`));

      // Execute the full SQL as a single block
      await db.execute(sql.raw(migrationSql));

      console.log(`  ✅ Schema ${schemaName} migrated successfully`);
    } catch (err: any) {
      console.error(`  ❌ Error on schema ${schemaName}:`, err.message);
    }
  }

  console.log('\n✅ Migration 0014 complete!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
