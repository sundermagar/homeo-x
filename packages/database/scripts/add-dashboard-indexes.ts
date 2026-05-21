/// <reference types="node" />

/**
 * add-dashboard-indexes.ts
 * ─────────────────────────
 * One-shot migration that adds critical performance indexes to every tenant
 * schema for the tables most-queried by dashboard, queue, billing, and
 * analytics use-cases.
 *
 * Usage:
 *   npx tsx packages/database/scripts/add-dashboard-indexes.ts
 *
 * Safe to re-run — all statements use IF NOT EXISTS.
 */

// @ts-ignore - pg is installed in the monorepo root
import pg from 'pg';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const INDEX_DEFINITIONS = [
  // ── appointments ──────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_appt_booking_date   ON appointments(booking_date)',
  'CREATE INDEX IF NOT EXISTS idx_appt_clinic_date    ON appointments(clinic_id, booking_date)',
  'CREATE INDEX IF NOT EXISTS idx_appt_doctor         ON appointments(doctor_id)',
  'CREATE INDEX IF NOT EXISTS idx_appt_patient        ON appointments(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_appt_created        ON appointments(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_appt_visit_type     ON appointments(visit_type)',

  // ── bills ─────────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_bills_date           ON bills(bill_date)',
  'CREATE INDEX IF NOT EXISTS idx_bills_clinic_date    ON bills(clinic_id, bill_date)',
  'CREATE INDEX IF NOT EXISTS idx_bills_regid          ON bills(regid)',
  'CREATE INDEX IF NOT EXISTS idx_bills_created        ON bills(created_at)',

  // ── receipt ───────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_receipt_created      ON receipt(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_receipt_regid        ON receipt(regid)',

  // ── waitlist ──────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_waitlist_date        ON waitlist(date)',
  'CREATE INDEX IF NOT EXISTS idx_waitlist_doctor_date ON waitlist(doctor_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_waitlist_appt        ON waitlist(appointment_id)',
  'CREATE INDEX IF NOT EXISTS idx_waitlist_clinic      ON waitlist(clinic_id)',

  // ── vitals ────────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_vitals_visit         ON vitals(visit_id)',
  'CREATE INDEX IF NOT EXISTS idx_vitals_recorded      ON vitals(visit_id, recorded_at DESC)',

  // ── case_datas (supplement existing idx_patients_kpi) ─────────────────────
  'CREATE INDEX IF NOT EXISTS idx_patients_regid       ON case_datas(regid)',
  'CREATE INDEX IF NOT EXISTS idx_patients_dob_mmdd    ON case_datas(dob)',

  // ── case_reminder ─────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_reminder_status      ON case_reminder(status)',
  'CREATE INDEX IF NOT EXISTS idx_reminder_patient     ON case_reminder(patient_id)',

  // ── expenses ──────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(exp_date)',
  'CREATE INDEX IF NOT EXISTS idx_expenses_clinic      ON expenses(clinic_id)',
];

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  console.log('🔍 Discovering tenant schemas…');

  const schemaResult = await pool.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name"
  );

  const schemas = schemaResult.rows.map((r: any) => r.schema_name as string);
  if (schemas.length === 0) {
    console.warn('⚠ No tenant schemas found — applying indexes to current search_path only.');
    schemas.push('');
  }

  console.log(`📋 Found ${schemas.length} tenant schema(s): ${schemas.join(', ') || '(default)'}`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const schema of schemas) {
    console.log(`\n─── ${schema || 'default'} ───`);

    for (const ddl of INDEX_DEFINITIONS) {
      // Qualify table names with schema prefix when running cross-schema
      const qualifiedDdl = schema
        ? ddl.replace(/ ON (\w+)\(/g, ` ON ${schema}.$1(`)
              .replace(/IF NOT EXISTS (idx_\w+)/g, `IF NOT EXISTS ${schema.replace(/\W/g, '_')}_$1`)
        : ddl;

      try {
        await pool.query(qualifiedDdl);
        totalCreated++;
        const idxName = qualifiedDdl.match(/IF NOT EXISTS (\S+)/)?.[1] || '?';
        console.log(`  ✅ ${idxName}`);
      } catch (err: any) {
        totalSkipped++;
        if (!err?.message?.includes('already exists') && !err?.message?.includes('does not exist')) {
          const idxName = qualifiedDdl.match(/IF NOT EXISTS (\S+)/)?.[1] || '?';
          console.warn(`  ⚠ ${idxName}: ${err?.message}`);
        }
      }
    }
  }

  console.log(`\n✅ Done. Created/verified: ${totalCreated}, Skipped: ${totalSkipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
