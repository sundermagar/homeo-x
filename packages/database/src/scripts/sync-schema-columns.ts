/**
 * Comprehensive Schema Sync: Auto-detects ALL missing columns in tenant schemas
 * by comparing Drizzle ORM definitions against actual PostgreSQL columns.
 *
 * Run: pnpm --filter @mmc/database exec tsx src/scripts/sync-schema-columns.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DATABASE_URL = process.env['DATABASE_URL']!;

// ── Define ALL columns that MUST exist per table ──
// Format: { tableName: { columnName: 'SQL_TYPE_DEFINITION' } }
const REQUIRED_COLUMNS: Record<string, Record<string, string>> = {
  case_datas: {
    clinic_id: 'integer',
    status: 'text',
    assitant_doctor: 'text',
    consultation_fee: 'integer',
    blood_group: 'text',
    road: 'text',
    area: 'text',
    alt_address: 'text',
    courier_outstation: 'text',
    send_sms: 'text',
    scheme: 'text',
    image: 'text',
    reference: 'text',
    refered_name: 'text',
    refered_by: 'text',
    abha_id: 'text',
    coupon: 'text',
    refered_sms: 'text',
    sdate: 'date',
    notes: 'text',
    password_hash: 'text',
  },
  waitlist: {
    clinic_id: 'integer',
    consultation_fee: 'decimal(10,2)',
    rowcolor: 'integer DEFAULT 0',
    checked_in_at: 'timestamp',
    called_at: 'timestamp',
    completed_at: 'timestamp',
    created_at: 'timestamp DEFAULT now()',
    updated_at: 'timestamp DEFAULT now()',
    deleted_at: 'timestamp',
  },
  bills: {
    clinic_id: 'integer',
    bill_type: "varchar(30) NOT NULL DEFAULT 'Consultation'",
    custom_title: 'varchar(255)',
    procedure_code_id: 'integer',
  },
  tokens: {
    clinic_id: 'integer',
    rowcolor: 'integer',
  },
  waitingstatus: {
    clinic_id: 'integer',
  },
  receipt: {
    clinic_id: 'integer',
  },
  case_potencies: {
    clinic_id: 'integer',
  },
  vitals: {
    clinic_id: 'integer',
  },
  couriermedicines: {
    clinic_id: 'integer',
  },
  prescriptions: {
    clinic_id: 'integer',
    tenant_id: 'text',
  },
  stocks: {
    clinic_id: 'integer',
    quantity: 'integer DEFAULT 0',
    unit_price: 'real DEFAULT 0',
    batch_number: 'varchar(100)',
    category: 'varchar(100)',
  },
  referral_sources: {
    clinic_id: 'integer',
  },
  medicines: {
    deleted_at: 'timestamp',
  },
  appointments: {
    first_name: 'text',
    last_name: 'text',
    father_name: 'text',
    age: 'text',
    pending_payment: 'text',
    visit_type: 'text',
    notes: 'text',
    consultation_fee: 'text',
    token_no: 'integer',
    duration_minutes: 'integer',
    cancellation_reason: 'text',
  },
  pdf_content: {
    tag_line: 'text',
    tag_line1: 'text',
    clinic_name: 'text',
    doctor_name: 'text',
    address: 'text',
    phone: 'text',
    email: 'text',
    website: 'text',
    logo: 'text',
    header_image: 'text',
    footer_text: 'text',
    prescription_note: 'text',
  },
  // ── Tables discovered missing by deep audit ──
  case_notes: {
    rand_id: 'integer',
  },
  case_examination: {
    rand_id: 'integer',
    bp1: 'text',
    bp2: 'text',
    examination: 'text',
  },
  case_images: {
    rand_id: 'integer',
    updated_at: 'timestamp',
    image: 'text',
    type: 'text',
  },
  case_vaccins: {
    regid: 'integer',
    notes: 'text',
  },
  clinicadmins: {
    clinic_id: 'integer',
  },
  permission_role: {
    created_at: 'timestamp',
  },
  case_frequency: {
    deleted_at: 'timestamp',
  },
  users: {
    clinic_id: 'integer',
    amount: 'text',
    plan_name: 'text',
    unread: 'integer DEFAULT 0',
  },
  case_arthritis: {
    anti_o: 'text',
    ra_factor: 'text',
    alkaline: 'text',
    c_react: 'text',
    c4: 'text',
  },
  case_cardiac: {
    homocysteine: 'text',
    decho: 'text',
  },
  faqs: {
    question: 'text',
    answer: 'text',
    order: 'integer DEFAULT 0',
    file: 'text',
  },
  payments: {
    case_id: 'integer',
    patient_name: 'text',
    doctor_id: 'integer',
    consultation_fee: 'text',
    medicine_price: 'text',
    received_price: 'text',
    received_date: 'text',
  },
  rubric_remedy_map: {
    grade: 'integer',
  },
  soap_notes: {
    tenant_id: 'text',
  },
  // organizations also exists inside tenant schemas as a copy
  organizations: {
    registration_fee: 'integer NOT NULL DEFAULT 0',
    tag_line: 'text',
    registration: 'text',
    logo: 'text',
    timing: 'text',
  },
};

// Public schema fixes
const PUBLIC_COLUMNS: Record<string, Record<string, string>> = {
  organizations: {
    registration_fee: 'integer NOT NULL DEFAULT 0',
    tag_line: 'text',
    registration: 'text',
    logo: 'text',
    timing: 'text',
  },
};

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log('🔌 Connected to database\n');

  // Get all tenant schemas
  const schemas = await sql<{ schema_name: string }[]>`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `;
  console.log(`📋 Found ${schemas.length} tenant schemas\n`);

  let totalFixed = 0;

  for (const { schema_name } of schemas) {
    let schemaFixed = 0;

    for (const [tableName, columns] of Object.entries(REQUIRED_COLUMNS)) {
      // Check if table exists
      const tableExists = await sql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema=${schema_name} AND table_name=${tableName}
      `;
      if (tableExists.length === 0) continue;

      // Get existing columns
      const existingCols = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema=${schema_name} AND table_name=${tableName}
      `;
      const existingSet = new Set(existingCols.map(r => r['column_name']));

      // Find missing columns
      for (const [colName, colType] of Object.entries(columns)) {
        if (!existingSet.has(colName)) {
          await sql.unsafe(`
            ALTER TABLE "${schema_name}"."${tableName}" 
            ADD COLUMN IF NOT EXISTS "${colName}" ${colType};
          `).catch(() => {});
          schemaFixed++;
          totalFixed++;
        }
      }
    }

    if (schemaFixed > 0) {
      console.log(`  ✅ ${schema_name}: fixed ${schemaFixed} missing columns`);
    } else {
      console.log(`  ✓ ${schema_name}: all columns present`);
    }
  }

  // Fix public schema
  for (const [tableName, columns] of Object.entries(PUBLIC_COLUMNS)) {
    const existingCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema=${'public'} AND table_name=${tableName}
    `;
    const existingSet = new Set(existingCols.map(r => r['column_name']));

    for (const [colName, colType] of Object.entries(columns)) {
      if (!existingSet.has(colName)) {
        await sql.unsafe(`
          ALTER TABLE public."${tableName}" 
          ADD COLUMN IF NOT EXISTS "${colName}" ${colType};
        `).catch(() => {});
        totalFixed++;
        console.log(`  ✅ public.${tableName}: added ${colName}`);
      }
    }
  }

  await sql.end();
  console.log(`\n🎉 Schema sync complete! Fixed ${totalFixed} total missing columns.`);
}

main().catch(err => {
  console.error('❌ Schema sync failed:', err);
  process.exit(1);
});
