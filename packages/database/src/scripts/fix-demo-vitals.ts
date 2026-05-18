import { createDbClient } from '../index.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env['DATABASE_URL']!;
const db = createDbClient(DATABASE_URL, 'tenant_demo');

async function fix() {
  console.log('Fixing tenant_demo vitals table...');
  
  await db.execute(sql`SET search_path TO tenant_demo`);
  
  // Add regid column if missing
  try {
    await db.execute(sql`ALTER TABLE vitals ADD COLUMN IF NOT EXISTS regid INTEGER`);
    console.log('  ✅ regid column ensured');
  } catch (e: any) {
    console.log('  ⚠️ regid:', e.message);
  }

  // Make visit_id nullable
  try {
    await db.execute(sql`ALTER TABLE vitals ALTER COLUMN visit_id DROP NOT NULL`);
    console.log('  ✅ visit_id made nullable');
  } catch (e: any) {
    console.log('  ⚠️ visit_id:', e.message);
  }

  // Backfill regid from appointments
  try {
    await db.execute(sql`UPDATE vitals v SET regid = a.patient_id FROM appointments a WHERE v.visit_id = a.id AND v.regid IS NULL`);
    console.log('  ✅ backfilled regid from appointments');
  } catch (e: any) {
    console.log('  ⚠️ backfill:', e.message);
  }

  // Drop unique constraint on visit_id if exists
  try {
    const result = await db.execute(sql`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE t.relname = 'vitals'
        AND n.nspname = 'tenant_demo'
        AND c.contype = 'u'
    `);
    for (const row of result as any[]) {
      await db.execute(sql.raw(`ALTER TABLE vitals DROP CONSTRAINT IF EXISTS ${row.conname}`));
      console.log(`  ✅ Dropped constraint: ${row.conname}`);
    }
  } catch (e: any) {
    console.log('  ⚠️ constraint:', e.message);
  }

  console.log('Done!');
  process.exit(0);
}

fix();
