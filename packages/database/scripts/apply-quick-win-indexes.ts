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
type IndexDef = {
  name: string;
  table: string;
  columns: string;
  condition?: string;
  using?: string; // 'btree' (default) or 'gin'
  requiresExtension?: 'pg_trgm';
};

const INDEX_DEFINITIONS: IndexDef[] = [
  // ─── Original dashboard set ────────────────────────────────────────────────
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

  // ─── Appointment list / slot lookup hot paths ─────────────────────────────
  {
    name: 'idx_appointments_doctor_date',
    table: 'appointments',
    columns: '(doctor_id, booking_date)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_appointments_clinic_status_date',
    table: 'appointments',
    columns: '(clinic_id, status, booking_date)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_appointments_clinic_id_desc',
    table: 'appointments',
    columns: '(clinic_id, id DESC)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_appointments_patient_date_desc',
    table: 'appointments',
    columns: '(patient_id, booking_date DESC)',
    condition: 'WHERE deleted_at IS NULL',
  },

  // ─── Patient list / search hot paths ──────────────────────────────────────
  {
    name: 'idx_patients_clinic_id_desc',
    table: 'case_datas',
    columns: '(clinic_id, id DESC)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_patients_mobile1',
    table: 'case_datas',
    columns: '(mobile1)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_patients_phone',
    table: 'case_datas',
    columns: '(phone)',
    condition: 'WHERE deleted_at IS NULL',
  },

  // ─── Waitlist hot paths ───────────────────────────────────────────────────
  {
    name: 'idx_waitlist_patient_date_status',
    table: 'waitlist',
    columns: '(patient_id, date, status)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_waitlist_doctor_date_status',
    table: 'waitlist',
    columns: '(doctor_id, date, status)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_waitlist_date_waitnum',
    table: 'waitlist',
    columns: '(date, waiting_number)',
    condition: 'WHERE deleted_at IS NULL',
  },

  // ─── Pending appointments (next-visit follow-ups) ─────────────────────────
  {
    name: 'idx_pending_appts_regid',
    table: 'pending_appointments',
    columns: '(regid)',
  },
  {
    name: 'idx_pending_appts_next_date',
    table: 'pending_appointments',
    columns: '(next_date)',
  },

  // ─── Tokens (daily token-number issuance) ────────────────────────────────
  {
    name: 'idx_tokens_date_tokenno',
    table: 'tokens',
    columns: '(date, token_no)',
    condition: 'WHERE deleted_at IS NULL',
  },

  // ─── Bills (waitlist patient_finances CTE: GROUP BY regid) ────────────────
  {
    name: 'idx_bills_regid_active',
    table: 'bills',
    columns: '(regid)',
    condition: 'WHERE deleted_at IS NULL',
  },

  // ─── Dashboard hot paths ──────────────────────────────────────────────────
  {
    name: 'idx_bills_billdate_regid_active',
    table: 'bills',
    columns: '(bill_date, regid)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_bills_billdate_charges_regid',
    table: 'bills',
    columns: '(bill_date, charges DESC, regid)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_bills_created_active',
    table: 'bills',
    columns: '(created_at DESC)',
    condition: 'WHERE deleted_at IS NULL',
  },
  {
    name: 'idx_receipt_created_regid_active',
    table: 'receipt',
    columns: '(created_at, regid)',
    condition: "WHERE deleted_at IS NULL OR deleted_at::text = ''",
  },
  {
    name: 'idx_receipt_created_desc_active',
    table: 'receipt',
    columns: '(created_at DESC)',
    condition: "WHERE deleted_at IS NULL OR deleted_at::text = ''",
  },
  {
    name: 'idx_expenses_clinic_date_active',
    table: 'expenses',
    columns: '(clinic_id, exp_date)',
    condition: "WHERE deleted_at IS NULL OR deleted_at::text = ''",
  },
  {
    name: 'idx_waitlist_clinic_date_wait',
    table: 'waitlist',
    columns: '(clinic_id, date)',
    condition: 'WHERE called_at IS NOT NULL AND checked_in_at IS NOT NULL AND deleted_at IS NULL',
  },

  // ─── Trigram GIN indexes for ILIKE %search% on patient + appointment lists
  // (skipped automatically if pg_trgm is unavailable on the server)
  {
    name: 'idx_appointments_patient_name_trgm',
    table: 'appointments',
    columns: '(patient_name gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
  },
  {
    name: 'idx_appointments_phone_trgm',
    table: 'appointments',
    columns: '(phone gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
  },
  {
    name: 'idx_patients_first_name_trgm',
    table: 'case_datas',
    columns: '(first_name gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
  },
  {
    name: 'idx_patients_surname_trgm',
    table: 'case_datas',
    columns: '(surname gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
  },
  {
    name: 'idx_patients_mobile1_trgm',
    table: 'case_datas',
    columns: '(mobile1 gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
  },
  {
    name: 'idx_patients_phone_trgm',
    table: 'case_datas',
    columns: '(phone gin_trgm_ops)',
    using: 'gin',
    requiresExtension: 'pg_trgm',
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
    // ─── Step 0: Ensure pg_trgm extension (best-effort) ───────────────────
    console.log('\n🧩 Ensuring pg_trgm extension...');
    let trgmAvailable = false;
    try {
      await sql.unsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      trgmAvailable = true;
      console.log('   ✅ pg_trgm available — trigram indexes will be created');
    } catch (err: any) {
      console.warn(`   ⚠️  pg_trgm unavailable (${err?.message || err}). Trigram indexes will be skipped.`);
    }

    // Re-check in case extension was already installed by superuser earlier
    if (!trgmAvailable) {
      const check = await sql`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`;
      trgmAvailable = check.length > 0;
    }

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
        // Skip trigram indexes if pg_trgm is unavailable
        if (idx.requiresExtension === 'pg_trgm' && !trgmAvailable) {
          console.log(`   ⏩ SKIP  ${idx.name} — requires pg_trgm extension`);
          totalSkipped++;
          continue;
        }

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
        const usingClause = idx.using ? `USING ${idx.using} ` : '';
        const conditionClause = idx.condition ? ` ${idx.condition}` : '';
        const rawSql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}" ON "${schemaName}"."${idx.table}" ${usingClause}${idx.columns}${conditionClause}`;

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
