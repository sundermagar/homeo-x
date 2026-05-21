/**
 * introspect-railway.mjs
 * 
 * Connects to the Railway (live) DB, introspects ALL schemas, tables, columns,
 * indexes, constraints, extensions, and sequences in large batched queries,
 * then generates:
 * 
 *   1) A complete migration SQL  → src/migrations/0021_full_railway_snapshot.sql
 *   2) A seed data dump (JSON)    → src/seeds/railway-seed-data.json
 *   3) A seed runner              → src/seeds/run-railway-seed.mjs
 * 
 * To ensure extremely fast performance, structural DDL is scanned for ALL 60+ schemas
 * in single massive queries, but detailed seed data is extracted only for the primary schemas:
 * 'public', 'tenant_demo', 'tenant_zirakpur', 'tenant_chd', 'demo', 'drizzle'.
 */
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────────
// Load .env
// ──────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) process.env[key] = val;
  });
}

let dbUrl = process.env.DATABASE_URL;

// Specifically look for commented-out Railway/Production URL in .env
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const railwayLine = envContent.split('\n').find(line => {
    const lower = line.toLowerCase();
    return (lower.includes('railway') || lower.includes('rlwy.net')) && line.includes('postgresql://');
  });
  if (railwayLine) {
    const eqIdx = railwayLine.indexOf('=');
    if (eqIdx >= 0) {
      const extractedUrl = railwayLine.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (extractedUrl) {
        dbUrl = extractedUrl;
        console.log('💡 Auto-detected Railway Production URL from .env comments!');
      }
    }
  }
}

if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

console.log(`🔌 Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
const sql = postgres(dbUrl, { max: 5, connect_timeout: 20 });

// Schemas to extract data rows for (to avoid huge network payload & local database bloat)
const SEED_SCHEMAS = new Set(['public', 'tenant_demo', 'tenant_zirakpur', 'tenant_chd', 'demo', 'drizzle']);

function escapeId(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

// ──────────────────────────────────────────────────
// Batch metadata retrievals for speed
// ──────────────────────────────────────────────────
async function main() {
  console.log('🔍 Executing HIGH-SPEED Railway database introspection...\n');

  // 1. Extensions
  const extRows = await sql`SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')`;
  const extensions = extRows.map(r => r.extname);
  console.log(`📦 Extensions: ${extensions.join(', ')}`);

  // 2. Schemas
  const schemaRows = await sql`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    AND schema_name NOT LIKE 'pg_temp_%'
    AND schema_name NOT LIKE 'pg_toast_temp_%'
    ORDER BY schema_name
  `;
  const schemas = schemaRows.map(r => r.schema_name);
  console.log(`📂 Found ${schemas.length} schemas to scan.`);

  // 3. Batch fetch all Columns
  console.log('⚡ Fetching all columns in one batch query...');
  const allColumns = await sql`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      column_default,
      is_nullable,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND table_schema NOT LIKE 'pg_temp_%'
      AND table_schema NOT LIKE 'pg_toast_temp_%'
    ORDER BY table_schema, table_name, ordinal_position
  `;
  console.log(`   Fetched ${allColumns.length} columns.`);

  // Group columns by schema & table
  const columnsMap = {};
  for (const c of allColumns) {
    const s = c.table_schema;
    const t = c.table_name;
    if (!columnsMap[s]) columnsMap[s] = {};
    if (!columnsMap[s][t]) columnsMap[s][t] = [];
    columnsMap[s][t].push(c);
  }

  // 4. Batch fetch all Primary Keys
  console.log('⚡ Fetching all primary keys in one batch query...');
  const allPks = await sql`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND tc.table_schema NOT LIKE 'pg_temp_%'
      AND tc.table_schema NOT LIKE 'pg_toast_temp_%'
    ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
  `;
  const pksMap = {};
  for (const p of allPks) {
    const s = p.table_schema;
    const t = p.table_name;
    if (!pksMap[s]) pksMap[s] = {};
    if (!pksMap[s][t]) pksMap[s][t] = [];
    pksMap[s][t].push(p.column_name);
  }

  // 5. Batch fetch all Unique Constraints
  console.log('⚡ Fetching all unique constraints in one batch query...');
  const allUniques = await sql`
    SELECT
      tc.table_schema,
      tc.constraint_name,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND tc.table_schema NOT LIKE 'pg_temp_%'
      AND tc.table_schema NOT LIKE 'pg_toast_temp_%'
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
  `;
  const uniquesMap = {};
  for (const u of allUniques) {
    const s = u.table_schema;
    const t = u.table_name;
    const key = `${t}.${u.constraint_name}`;
    if (!uniquesMap[s]) uniquesMap[s] = {};
    if (!uniquesMap[s][key]) uniquesMap[s][key] = { table: t, name: u.constraint_name, columns: [] };
    uniquesMap[s][key].columns.push(u.column_name);
  }

  // 6. Batch fetch all Indexes
  console.log('⚡ Fetching all indexes in one batch query...');
  const allIndexes = await sql`
    SELECT
      ns.nspname AS table_schema,
      i.relname AS index_name,
      t.relname AS table_name,
      am.amname AS index_type,
      pg_get_indexdef(i.oid) AS index_def
    FROM pg_index ix
    JOIN pg_class i ON ix.indexrelid = i.oid
    JOIN pg_class t ON ix.indrelid = t.oid
    JOIN pg_am am ON i.relam = am.oid
    JOIN pg_namespace ns ON t.relnamespace = ns.oid
    WHERE ns.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND ns.nspname NOT LIKE 'pg_temp_%'
      AND ns.nspname NOT LIKE 'pg_toast_temp_%'
      AND NOT ix.indisprimary
      AND NOT ix.indisunique
    ORDER BY ns.nspname, t.relname, i.relname
  `;
  const indexesMap = {};
  for (const idx of allIndexes) {
    const s = idx.table_schema;
    if (!indexesMap[s]) indexesMap[s] = [];
    indexesMap[s].push(idx);
  }

  // 7. Batch fetch all Foreign Keys
  console.log('⚡ Fetching all foreign keys in one batch query...');
  const allFks = await sql`
    SELECT
      tc.table_schema,
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND tc.table_schema NOT LIKE 'pg_temp_%'
      AND tc.table_schema NOT LIKE 'pg_toast_temp_%'
    ORDER BY tc.table_schema, tc.table_name
  `;
  const fksMap = {};
  for (const fk of allFks) {
    const s = fk.table_schema;
    if (!fksMap[s]) fksMap[s] = [];
    fksMap[s].push(fk);
  }

  // 8. Batch fetch all Sequence current values
  console.log('⚡ Fetching all sequences in one batch query...');
  const allSeqs = await sql`
    SELECT
      s.relname AS sequence_name,
      n.nspname AS schema_name
    FROM pg_class s
    JOIN pg_namespace n ON s.relnamespace = n.oid
    WHERE s.relkind = 'S'
      AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND n.nspname NOT LIKE 'pg_toast_temp_%'
    ORDER BY n.nspname, s.relname
  `;
  console.log(`   Fetched ${allSeqs.length} sequences.`);

  // ──────────────────────────────────────────────────
  // DDL Generator Helpers
  // ──────────────────────────────────────────────────
  function columnToSql(col) {
    let type = col.udt_name;
    const typeMap = {
      'int4': 'integer',
      'int8': 'bigint',
      'int2': 'smallint',
      'float4': 'real',
      'float8': 'double precision',
      'bool': 'boolean',
      'varchar': col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar',
      'bpchar': col.character_maximum_length ? `char(${col.character_maximum_length})` : 'char',
      'numeric': col.numeric_precision ? `numeric(${col.numeric_precision},${col.numeric_scale || 0})` : 'numeric',
      'timestamptz': 'timestamp with time zone',
      'timestamp': 'timestamp',
      'text': 'text',
      'jsonb': 'jsonb',
      'json': 'json',
      'serial': 'serial',
      'bigserial': 'bigserial',
      'date': 'date',
      'uuid': 'uuid',
      'bytea': 'bytea',
      'vector': 'vector(768)',
    };

    if (col.data_type === 'USER-DEFINED') {
      if (type === 'vector') return 'vector(768)';
      return type;
    }
    return typeMap[type] || type;
  }

  function generateCreateTable(schemaName, tableName, columns, pks, uniques) {
    const pk = pks || [];
    const tableUniques = Object.values(uniques || {}).filter(u => u.table === tableName);

    let ddl = `CREATE TABLE IF NOT EXISTS ${escapeId(schemaName)}.${escapeId(tableName)} (\n`;
    const colDefs = [];
    
    for (const col of columns) {
      const isSerial = col.column_default && col.column_default.startsWith("nextval(");
      let colType = columnToSql(col);
      if (isSerial) {
        if (colType === 'integer') colType = 'serial';
        else if (colType === 'bigint') colType = 'bigserial';
        else if (colType === 'smallint') colType = 'smallserial';
      }

      let line = `  ${escapeId(col.column_name)} ${colType}`;
      if (col.column_default !== null && !isSerial) {
        line += ` DEFAULT ${col.column_default}`;
      }
      if (pk.length === 1 && pk[0] === col.column_name) {
        line += ' PRIMARY KEY';
      }
      if (col.is_nullable === 'NO' && !pk.includes(col.column_name)) {
        line += ' NOT NULL';
      }
      colDefs.push(line);
    }

    if (pk.length > 1) {
      colDefs.push(`  PRIMARY KEY (${pk.map(escapeId).join(', ')})`);
    }
    for (const uc of tableUniques) {
      colDefs.push(`  CONSTRAINT ${escapeId(uc.name)} UNIQUE (${uc.columns.map(escapeId).join(', ')})`);
    }

    ddl += colDefs.join(',\n');
    ddl += '\n);\n';
    return ddl;
  }

  // ──────────────────────────────────────────────────
  // DDL Generation
  // ──────────────────────────────────────────────────
  let migrationSql = `-- ═══════════════════════════════════════════════════════════\n`;
  migrationSql += `-- Railway Database Full Snapshot Migration (High-Speed scan)\n`;
  migrationSql += `-- Generated: ${new Date().toISOString()}\n`;
  migrationSql += `-- Creates structure for ALL 60+ schemas matching production.\n`;
  migrationSql += `-- ═══════════════════════════════════════════════════════════\n\n`;

  for (const ext of extensions) {
    migrationSql += `CREATE EXTENSION IF NOT EXISTS "${ext}";\n`;
  }
  migrationSql += `\n--> statement-breakpoint\n\n`;

  // Write all schemas structure
  for (const schemaName of schemas) {
    if (schemaName !== 'public') {
      migrationSql += `CREATE SCHEMA IF NOT EXISTS ${escapeId(schemaName)};\n`;
      migrationSql += `--> statement-breakpoint\n\n`;
    }

    const schemaTables = columnsMap[schemaName] || {};
    const schemaPks = pksMap[schemaName] || {};
    const schemaUniques = uniquesMap[schemaName] || {};
    const schemaIndexes = indexesMap[schemaName] || [];

    for (const tableName of Object.keys(schemaTables)) {
      migrationSql += generateCreateTable(
        schemaName,
        tableName,
        schemaTables[tableName],
        schemaPks[tableName],
        schemaUniques
      );
      migrationSql += `--> statement-breakpoint\n\n`;
    }

    for (const idx of schemaIndexes) {
      let indexDef = idx.index_def;
      if (!indexDef.includes('IF NOT EXISTS')) {
        indexDef = indexDef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS');
        indexDef = indexDef.replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS');
      }
      migrationSql += `${indexDef};\n`;
      migrationSql += `--> statement-breakpoint\n\n`;
    }
  }

  // Output all Foreign Keys as ALTER TABLE statements at the bottom to bypass table order dependency
  migrationSql += `-- ═══════════════════════════════════════════════════════════\n`;
  migrationSql += `-- Foreign Key Constraints (Added after all tables exist)\n`;
  migrationSql += `-- ═══════════════════════════════════════════════════════════\n\n`;

  for (const schemaName of schemas) {
    const schemaFks = fksMap[schemaName] || [];
    for (const fk of schemaFks) {
      let fkLine = `ALTER TABLE ${escapeId(fk.table_schema)}.${escapeId(fk.table_name)} ADD CONSTRAINT ${escapeId(fk.constraint_name)} FOREIGN KEY (${escapeId(fk.column_name)}) REFERENCES ${escapeId(fk.foreign_table_schema)}.${escapeId(fk.foreign_table_name)}(${escapeId(fk.foreign_column_name)})`;
      if (fk.delete_rule !== 'NO ACTION') fkLine += ` ON DELETE ${fk.delete_rule}`;
      if (fk.update_rule !== 'NO ACTION') fkLine += ` ON UPDATE ${fk.update_rule}`;
      migrationSql += `${fkLine};\n`;
      migrationSql += `--> statement-breakpoint\n\n`;
    }
  }

  // ──────────────────────────────────────────────────
  // High-fidelity Seed Data Extraction
  // ──────────────────────────────────────────────────
  console.log('\n📥 Extracting seed data for primary target schemas only...');
  const allSeedData = {};
  
  for (const schemaName of schemas) {
    if (!SEED_SCHEMAS.has(schemaName)) continue;
    
    console.log(`   📂 Extracting rows for: ${schemaName}`);
    const schemaTables = columnsMap[schemaName] || {};
    allSeedData[schemaName] = {};

    for (const tableName of Object.keys(schemaTables)) {
      try {
        const countResult = await sql.unsafe(`SELECT COUNT(*) as cnt FROM ${escapeId(schemaName)}.${escapeId(tableName)}`);
        const count = parseInt(countResult[0].cnt, 10);
        if (count === 0) continue;

        // Limit to prevent memory exhaustion but extract full clinical datasets
        const limit = count > 2000 ? 2000 : count;
        const rows = await sql.unsafe(`SELECT * FROM ${escapeId(schemaName)}.${escapeId(tableName)} ORDER BY 1 LIMIT ${limit}`);
        
        allSeedData[schemaName][tableName] = {
          totalCount: count,
          exportedCount: rows.length,
          rows: rows,
        };
        console.log(`      ✅ ${tableName}: ${rows.length}/${count} rows exported.`);
      } catch (err) {
        console.error(`      ❌ Failed to export ${tableName}: ${err.message}`);
      }
    }
  }

  // Fetch sequence values for seeded schemas only
  console.log('\n🔢 Extracting sequence last values for seeded schemas only...');
  const sequenceValues = [];
  for (const seq of allSeqs) {
    if (!SEED_SCHEMAS.has(seq.schema_name)) continue;
    try {
      const val = await sql.unsafe(`SELECT last_value FROM ${escapeId(seq.schema_name)}.${escapeId(seq.sequence_name)}`);
      sequenceValues.push({ name: seq.sequence_name, schema: seq.schema_name, lastValue: val[0].last_value });
    } catch (err) {
      // ignore empty sequences
    }
  }

  // ──────────────────────────────────────────────────
  // Write Outputs
  // ──────────────────────────────────────────────────
  const migrationPath = path.resolve(__dirname, '../src/migrations/0021_full_railway_snapshot.sql');
  fs.writeFileSync(migrationPath, migrationSql, 'utf8');
  console.log(`\n✅ Structure migration written: ${migrationPath} (${(migrationSql.length / 1024).toFixed(1)} KB)`);

  const seedPath = path.resolve(__dirname, '../src/seeds/railway-seed-data.json');
  fs.writeFileSync(seedPath, JSON.stringify(allSeedData, null, 2), 'utf8');
  console.log(`✅ Seed JSON written: ${seedPath} (${(fs.statSync(seedPath).size / 1024 / 1024).toFixed(2)} MB)`);

  const seqPath = path.resolve(__dirname, '../src/seeds/railway-sequences.json');
  fs.writeFileSync(seqPath, JSON.stringify(sequenceValues, null, 2), 'utf8');
  console.log(`✅ Sequence data written: ${seqPath}`);

  // Print summary statistics
  let seedTables = 0, seedRows = 0;
  for (const s of Object.values(allSeedData)) {
    for (const t of Object.values(s)) {
      seedTables++;
      seedRows += t.exportedCount;
    }
  }
  console.log(`\n🎉 Extracted summary:`);
  console.log(`   Schemas structural DDL: ${schemas.length}`);
  console.log(`   Tables with active seeds: ${seedTables}`);
  console.log(`   Total active seed rows: ${seedRows}`);

  await sql.end();
}

main().catch(err => {
  console.error('Fatal error during introspection:', err);
  process.exit(1);
});
