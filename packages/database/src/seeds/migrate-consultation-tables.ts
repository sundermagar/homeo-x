// ─── Direct SQL Migration: Consultation Extended Tables ───────────────────────
// Creates new tables and alters existing legacy tables to add missing columns.
// Uses raw SQL to avoid drizzle-kit interactive prompts with the legacy schema.

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Manual .env loader
const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function main() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('[Migration] DATABASE_URL not found');
    process.exit(1);
  }

  console.log('[Migration] Connecting to database...');
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 10 });

  try {
    // ─── 1. Remedies table ───
    console.log('[Migration] 1/7 remedies...');
    await sql`
      CREATE TABLE IF NOT EXISTS remedies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        common_name VARCHAR(200),
        abbreviation VARCHAR(20),
        kingdom VARCHAR(30),
        mental_keywords JSONB DEFAULT '[]',
        modalities JSONB DEFAULT '[]',
        generals JSONB DEFAULT '[]',
        keynotes JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_remedies_abbr ON remedies(abbreviation)`;
    // Unique index on name - may fail if dupes exist
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_remedies_name ON remedies(name)`;
    } catch { console.log('  [skip] idx_remedies_name already exists or dupes'); }
    console.log('  ✅ remedies');

    // ─── 2. Remedy profiles ───
    console.log('[Migration] 2/7 remedy_profiles...');
    await sql`
      CREATE TABLE IF NOT EXISTS remedy_profiles (
        id SERIAL PRIMARY KEY,
        remedy_id INTEGER NOT NULL,
        thermal_type VARCHAR(30),
        constitution_type VARCHAR(100),
        miasm VARCHAR(50),
        common_potencies JSONB DEFAULT '["30C","200C","1M"]',
        mental_essence TEXT,
        physical_essence TEXT
      )`;
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_remedy ON remedy_profiles(remedy_id)`;
    } catch { console.log('  [skip] idx_profile_remedy'); }
    console.log('  ✅ remedy_profiles');

    // ─── 3. Rubrics - ALTER existing legacy table with new columns ───
    console.log('[Migration] 3/7 rubrics (alter)...');
    const rubricsCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'rubrics' AND table_schema = 'public'`;
    const existingRubricCols = rubricsCols.map((r: any) => r.column_name);

    if (!existingRubricCols.includes('chapter')) {
      await sql`ALTER TABLE rubrics ADD COLUMN chapter VARCHAR(100) DEFAULT 'UNKNOWN'`;
    }
    if (!existingRubricCols.includes('category')) {
      await sql`ALTER TABLE rubrics ADD COLUMN category VARCHAR(30) DEFAULT 'GENERAL'`;
    }
    if (!existingRubricCols.includes('description')) {
      await sql`ALTER TABLE rubrics ADD COLUMN description VARCHAR(500)`;
    }
    if (!existingRubricCols.includes('importance')) {
      await sql`ALTER TABLE rubrics ADD COLUMN importance INTEGER DEFAULT 2`;
    }
    if (!existingRubricCols.includes('created_at')) {
      await sql`ALTER TABLE rubrics ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`;
    }
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_rubrics_chapter ON rubrics(chapter)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_rubrics_category ON rubrics(category)`;
    } catch { console.log('  [skip] rubrics indexes'); }
    console.log('  ✅ rubrics');

    // ─── 4. Rubric-remedy map ───
    console.log('[Migration] 4/7 rubric_remedy_map (alter)...');
    const rrmExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'rubric_remedy_map' AND table_schema = 'public'`;
    if (rrmExists.length > 0) {
      // Ensure grade column exists
      const rrmCols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'rubric_remedy_map' AND table_schema = 'public'`;
      const existingRrmCols = rrmCols.map((r: any) => r.column_name);
      if (!existingRrmCols.includes('grade')) {
        await sql`ALTER TABLE rubric_remedy_map ADD COLUMN grade INTEGER DEFAULT 1`;
      }
      if (!existingRrmCols.includes('rubric_id')) {
        await sql`ALTER TABLE rubric_remedy_map ADD COLUMN rubric_id INTEGER`;
      }
      if (!existingRrmCols.includes('remedy_id')) {
        await sql`ALTER TABLE rubric_remedy_map ADD COLUMN remedy_id INTEGER`;
      }
    } else {
      await sql`
        CREATE TABLE rubric_remedy_map (
          id SERIAL PRIMARY KEY,
          rubric_id INTEGER NOT NULL,
          remedy_id INTEGER NOT NULL,
          grade INTEGER NOT NULL DEFAULT 1
        )`;
    }
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_rrm_rubric ON rubric_remedy_map(rubric_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_rrm_remedy ON rubric_remedy_map(remedy_id)`;
    } catch { console.log('  [skip] rrm indexes'); }
    console.log('  ✅ rubric_remedy_map');

    // ─── 5. SOAP notes ───
    console.log('[Migration] 5/7 soap_notes...');
    const soapExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'soap_notes' AND table_schema = 'public'`;
    if (soapExists.length > 0) {
      // Alter existing - add missing columns
      const soapCols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'soap_notes' AND table_schema = 'public'`;
      const existingSoapCols = soapCols.map((r: any) => r.column_name);
      const soapNewCols: [string, string][] = [
        ['tenant_id', 'VARCHAR(50)'],
        ['visit_id', 'VARCHAR(50)'],
        ['subjective', 'TEXT'],
        ['objective', 'TEXT'],
        ['assessment', 'TEXT'],
        ['plan', 'TEXT'],
        ['advice', 'TEXT'],
        ['follow_up', 'VARCHAR(200)'],
        ['icd_codes', "JSONB DEFAULT '[]'"],
        ['specialty_data', 'JSONB'],
        ['doctor_approved', 'BOOLEAN DEFAULT false'],
        ['approved_at', 'TIMESTAMP'],
        ['ai_generated', 'BOOLEAN DEFAULT false'],
        ['confidence', 'REAL'],
        ['audit_log_id', 'VARCHAR(100)'],
        ['created_at', 'TIMESTAMP DEFAULT NOW()'],
        ['updated_at', 'TIMESTAMP DEFAULT NOW()'],
      ];
      for (const [col, type] of soapNewCols) {
        if (!existingSoapCols.includes(col)) {
          await sql.unsafe(`ALTER TABLE soap_notes ADD COLUMN ${col} ${type}`);
        }
      }
    } else {
      await sql`
        CREATE TABLE soap_notes (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(50),
          visit_id VARCHAR(50) NOT NULL,
          subjective TEXT,
          objective TEXT,
          assessment TEXT,
          plan TEXT,
          advice TEXT,
          follow_up VARCHAR(200),
          icd_codes JSONB DEFAULT '[]',
          specialty_data JSONB,
          doctor_approved BOOLEAN DEFAULT false,
          approved_at TIMESTAMP,
          ai_generated BOOLEAN DEFAULT false,
          confidence REAL,
          audit_log_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`;
    }
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_soap_tenant ON soap_notes(tenant_id)`;
    } catch { console.log('  [skip] soap indexes'); }
    console.log('  ✅ soap_notes');

    // ─── 6. Prescriptions ───
    console.log('[Migration] 6/7 prescriptions...');
    const rxExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'prescriptions' AND table_schema = 'public'`;
    if (rxExists.length > 0) {
      const rxCols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'prescriptions' AND table_schema = 'public'`;
      const existingRxCols = rxCols.map((r: any) => r.column_name);
      const rxNewCols: [string, string][] = [
        ['tenant_id', 'VARCHAR(50)'],
        ['visit_id', 'VARCHAR(50)'],
        ['specialty', 'VARCHAR(50)'],
        ['notes', 'TEXT'],
        ['status', "VARCHAR(30) DEFAULT 'DRAFT'"],
        ['doctor_approved', 'BOOLEAN DEFAULT false'],
        ['approved_at', 'TIMESTAMP'],
        ['created_at', 'TIMESTAMP DEFAULT NOW()'],
        ['updated_at', 'TIMESTAMP DEFAULT NOW()'],
      ];
      for (const [col, type] of rxNewCols) {
        if (!existingRxCols.includes(col)) {
          await sql.unsafe(`ALTER TABLE prescriptions ADD COLUMN ${col} ${type}`);
        }
      }
    } else {
      await sql`
        CREATE TABLE prescriptions (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(50),
          visit_id VARCHAR(50) NOT NULL,
          specialty VARCHAR(50),
          notes TEXT,
          status VARCHAR(30) DEFAULT 'DRAFT',
          doctor_approved BOOLEAN DEFAULT false,
          approved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`;
    }
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_rx_tenant ON prescriptions(tenant_id)`;
    } catch { console.log('  [skip] rx indexes'); }
    console.log('  ✅ prescriptions');

    // ─── 7. Prescription Items ───
    console.log('[Migration] 7/7 prescription_items...');
    await sql`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER NOT NULL,
        medication_name VARCHAR(200) NOT NULL,
        generic_name VARCHAR(200),
        dosage VARCHAR(100),
        frequency VARCHAR(100),
        duration VARCHAR(100),
        route VARCHAR(50) DEFAULT 'Oral',
        instructions TEXT,
        quantity INTEGER,
        specialty_data JSONB,
        ai_suggested BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )`;
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_rxi_prescription ON prescription_items(prescription_id)`;
    } catch { console.log('  [skip] rxi indexes'); }
    console.log('  ✅ prescription_items');

    console.log('\n[Migration] ════════════════════════════════════════');
    console.log('[Migration] ✅ All 7 consultation tables ready!');
    console.log('[Migration] ════════════════════════════════════════');
  } catch (err: any) {
    console.error('[Migration] ❌ Failed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
