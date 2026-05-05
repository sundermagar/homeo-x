/**
 * apply-quick-win-indexes.ts
 *
 * Applies critical composite indexes to ALL tenant schemas for dashboard
 * performance optimization.
 *
 * IMPORTANT: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
 * This script uses raw postgres-js queries (no Drizzle, no transactions).
 *
 * Usage (from monorepo root):
 *   pnpm -C packages/database exec tsx scripts/apply-quick-win-indexes.ts
 */

import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

// ─── Load .env from monorepo root ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (let dir = __dirname, i = 0; i < 6; i++, dir = path.dirname(dir)) {
  const envPath = path.join(dir, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment. Aborting.');
  process.exit(1);
}

// ─── Index Definitions ───────────────────────────────────────────────────────
const INDEX_DEFINITIONS: Array<{ name: string; table: string; columns: string; condition: string }> = [
  {
    name: 'idx_appointments_dashboard',
    table: 'appointments',
    columns: '(clinic_id, booking_date)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_appointments_followup',
    table: 'appointments',
    columns: '(clinic_id, visit_type, booking_date)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_waitlist_dashboard',
    table: 'waitlist',
    columns: '(clinic_id, date, status)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_waitlist_appointment_id',
    table: 'waitlist',
    columns: '(appointment_id)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_patients_kpi',
    table: 'case_datas',
    columns: '(clinic_id, created_at)',
    condition: 'WHERE deleted_at IS NULL',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 Connecting to PostgreSQL...');
  console.log(`   URL: ${DATABASE_URL!.replace(/\/\/.*@/, '//***@')}`);

  const sql = postgres(DATABASE_URL!, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 15,
  });

  try {
    // ─── Step 1: Discover all tenant schemas ──────────────────────────────
    console.log('\n📂 Discovering tenant schemas...');

    const schemas = await sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name ASC
    `;

    // Include public + all tenant schemas
    const allSchemas = ['public', ...schemas.map((r) => r.schema_name as string)];
    const uniqueSchemas = [...new Set(allSchemas)];

    console.log(`   Found ${uniqueSchemas.length} schema(s): ${uniqueSchemas.join(', ')}`);

    // ─── Step 2: Apply indexes per schema ─────────────────────────────────
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const schemaName of uniqueSchemas) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📌 Schema: ${schemaName}`);
      console.log('═'.repeat(60));

      for (const idx of INDEX_DEFINITIONS) {
        // Check if the target table exists in this schema
        const tableCheck = await sql`
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = ${schemaName}
            AND table_name = ${idx.table}
          LIMIT 1
        `;

        if (tableCheck.length === 0) {
          console.log(`   ⏩ SKIP  ${idx.name} — table "${schemaName}".${idx.table} does not exist`);
          totalSkipped++;
          continue;
        }

        // Build the raw SQL — schema-qualified table name
        // We use a unique index name per schema to avoid conflicts:
        //   e.g. idx_appointments_dashboard becomes the same name per-schema since
        //   PostgreSQL indexes are schema-scoped.
        const rawSql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}" ON "${schemaName}"."${idx.table}" ${idx.columns} ${idx.condition}`;

        try {
          const start = Date.now();
          await sql.unsafe(rawSql);
          const elapsed = Date.now() - start;
          console.log(`   ✅ OK    ${idx.name} (${elapsed}ms)`);
          totalCreated++;
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (msg.includes('already exists')) {
            console.log(`   🔵 EXISTS ${idx.name} — already present`);
            totalSkipped++;
          } else {
            console.error(`   ❌ FAIL  ${idx.name} — ${msg}`);
            totalFailed++;
          }
        }
      }
    }

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(60)}`);
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Schemas processed : ${uniqueSchemas.length}`);
    console.log(`   Indexes created   : ${totalCreated}`);
    console.log(`   Already existed   : ${totalSkipped}`);
    console.log(`   Failed            : ${totalFailed}`);
    console.log('═'.repeat(60));

    if (totalFailed > 0) {
      console.warn('\n⚠️  Some indexes failed. Review the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All indexes applied successfully!');
    }
  } finally {
    await sql.end();
    console.log('🔌 Connection closed.');
  }
}

main().catch((err) => {
  console.error('💥 Script crashed:', err);
  process.exit(1);
});
