
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const connectionString = process.env['DATABASE_URL'] || 'postgresql://postgres:0709@localhost:5432/homeo_x';
const client = postgres(connectionString);
const db = drizzle(client);

const SQL_FILE_PATH = path.resolve(__dirname, '../../../../mmc-javascript/server/exports/smartb4q_mmc_demo_2026-03-19T05-02-44.sql');

async function ensureTables() {
  console.log('🏗️ Ensuring remedy tables exist...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS remedy_tree_nodes (
      id SERIAL PRIMARY KEY,
      parent_id INTEGER DEFAULT 0,
      label VARCHAR(255) NOT NULL,
      description TEXT,
      node_type VARCHAR(50) DEFAULT 'RUBRIC',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS remedy_alternatives (
      id SERIAL PRIMARY KEY,
      tree_id INTEGER NOT NULL,
      remedy VARCHAR(255),
      potency VARCHAR(100),
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function importLegacyData() {
  if (!fs.existsSync(SQL_FILE_PATH)) {
    console.error(`❌ SQL file not found at: ${SQL_FILE_PATH}`);
    process.exit(1);
  }

  await ensureTables();

  // --- 1. Import managetreedatas -> remedy_tree_nodes ---
  console.log('🌿 Importing Remedy Tree Nodes (managetreedatas)...');
  await importTable(
    'managetreedatas', 
    'remedy_tree_nodes', 
    ['id', 'label', 'parent_id', 'description', 'node_type', 'is_active'], 
    (vals) => ({
      id: Number(vals[0]),
      label: String(vals[1]).replace(/^'|'$/g, '').substring(0, 255),
      parentId: Number(vals[2] === 'NULL' ? 0 : vals[2]),
      description: (vals[3] && vals[3] !== 'NULL') ? String(vals[3]).replace(/^'|'$/g, '') : null,
      nodeType: 'RUBRIC',
      isActive: true
    })
  );

  // --- 2. Import medicine_others -> remedy_alternatives ---
  console.log('💊 Importing Remedy Alternatives (medicine_others)...');
  await importTable(
    'medicine_others',
    'remedy_alternatives',
    ['id', 'tree_id', 'remedy', 'potency', 'notes'],
    (vals) => ({
      id: Number(vals[0]),
      treeId: Number(vals[1]),
      remedy: String(vals[2]).replace(/^'|'$/g, '').substring(0, 255),
      potency: (vals[3] && vals[3] !== 'NULL') ? String(vals[3]).replace(/^'|'$/g, '') : null,
      notes: (vals[4] && vals[4] !== 'NULL') ? String(vals[4]).replace(/^'|'$/g, '') : null
    })
  );

  console.log('✅ Legacy data import complete!');
  await client.end();
}

async function importTable(sourceTable: string, targetTable: string, columns: string[], mapper: (vals: string[]) => any) {
  const fileStream = fs.createReadStream(SQL_FILE_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inBlock = false;
  let rows: any[] = [];
  const chunkSize = 500;

  console.log(`   Truncating table ${targetTable}...`);
  await db.execute(sql.raw(`TRUNCATE TABLE ${targetTable} RESTART IDENTITY CASCADE`));

  for await (const line of rl) {
    if (line.includes(`INSERT INTO \`${sourceTable}\``)) {
      inBlock = true;
      continue;
    }

    if (inBlock) {
      if (line.trim().startsWith('(')) {
        const cleaned = line.trim().replace(/^\(/, '').replace(/\),?|;?$/, '');
        const vals = splitByComma(cleaned);
        rows.push(mapper(vals));

        if (rows.length >= chunkSize) {
          await insertBatch(targetTable, columns, rows);
          rows = [];
        }
      }

      if (line.includes(';')) {
        inBlock = false;
      }
    }
  }

  if (rows.length > 0) {
    await insertBatch(targetTable, columns, rows);
  }

  // Sync sequence
  await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${targetTable}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${targetTable}))`));
}

async function insertBatch(table: string, columns: string[], rows: any[]) {
  const valuesSql = rows.map(row => {
    const vals = Object.values(row).map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return v;
    });
    return `(${vals.join(', ')})`;
  }).join(', ');

  await db.execute(sql.raw(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesSql}`));
}

function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "'" && !escaped) inString = !inString;
    if (char === "\\" && inString) escaped = !escaped; else escaped = false;
    
    if (char === ',' && !inString) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

importLegacyData().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
