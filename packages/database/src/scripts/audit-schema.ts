/**
 * Deep Schema Audit: Extracts ALL columns from ALL Drizzle schema files
 * and compares them against actual PostgreSQL columns in tenant_demo.
 * Reports every single missing column.
 *
 * Run: pnpm --filter @mmc/database exec tsx src/scripts/audit-schema.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DATABASE_URL = process.env['DATABASE_URL']!;

// Parse a Drizzle schema file and extract table name + column definitions
function extractColumnsFromFile(filePath: string): Map<string, string[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tables = new Map<string, string[]>();

  // Match pgTable('table_name', { ... })
  const tableRegex = /pgTable\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{([\s\S]*?)\}\s*[,)]/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1]!;
    const body = match[2]!;
    const columns: string[] = [];

    // Match column definitions like:  columnName: type('db_column_name')
    const colRegex = /['"]([^'"]+)['"]\s*\)/g;
    // Better: match the actual DB column name from integer('col'), text('col'), etc.
    const colDefRegex = /(?:serial|integer|text|varchar|date|timestamp|boolean|real|decimal|bigint|jsonb|json)\s*\(\s*['"]([^'"]+)['"]/g;
    let colMatch;

    while ((colMatch = colDefRegex.exec(body)) !== null) {
      columns.push(colMatch[1]!);
    }

    // Also check for vector columns
    const vectorRegex = /customType.*?\(\s*['"]([^'"]+)['"]/g;
    while ((colMatch = vectorRegex.exec(body)) !== null) {
      columns.push(colMatch[1]!);
    }

    if (columns.length > 0) {
      tables.set(tableName, columns);
    }
  }

  return tables;
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log('🔌 Connected to database\n');

  // 1. Scan ALL schema files
  const schemaDir = path.resolve(__dirname, '../schema');
  const legacyDir = path.resolve(schemaDir, 'legacy');

  const allTables = new Map<string, Set<string>>();

  // Scan main schema files
  for (const file of fs.readdirSync(schemaDir)) {
    if (!file.endsWith('.ts') || file === 'index.ts' || file.includes('legacy-schema')) continue;
    const filePath = path.join(schemaDir, file);
    const tables = extractColumnsFromFile(filePath);
    for (const [table, cols] of tables) {
      if (!allTables.has(table)) allTables.set(table, new Set());
      cols.forEach(c => allTables.get(table)!.add(c));
    }
  }

  // Scan legacy schema files
  if (fs.existsSync(legacyDir)) {
    for (const file of fs.readdirSync(legacyDir)) {
      if (!file.endsWith('.ts') || file === 'index.ts') continue;
      const filePath = path.join(legacyDir, file);
      const tables = extractColumnsFromFile(filePath);
      for (const [table, cols] of tables) {
        if (!allTables.has(table)) allTables.set(table, new Set());
        cols.forEach(c => allTables.get(table)!.add(c));
      }
    }
  }

  console.log(`📋 Found ${allTables.size} tables defined in Drizzle schemas\n`);

  // 2. Compare against tenant_demo
  const schemaName = 'tenant_demo';
  const allMissing: Array<{ table: string; column: string }> = [];

  for (const [tableName, expectedCols] of allTables) {
    // Check if table exists
    const tableExists = await sql`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema=${schemaName} AND table_name=${tableName}
    `;
    
    if (tableExists.length === 0) {
      // Also check public schema for platform tables
      const publicExists = await sql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema=${'public'} AND table_name=${tableName}
      `;
      if (publicExists.length === 0) {
        console.log(`  ⚠️  Table "${tableName}" does not exist in ${schemaName} or public`);
        continue;
      }
      // Check public schema columns
      const existingCols = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema=${'public'} AND table_name=${tableName}
      `;
      const existingSet = new Set(existingCols.map(r => r['column_name'] as string));
      const missing = [...expectedCols].filter(c => !existingSet.has(c));
      if (missing.length > 0) {
        console.log(`  ❌ public.${tableName}: missing ${missing.length} columns → ${missing.join(', ')}`);
        missing.forEach(c => allMissing.push({ table: `public.${tableName}`, column: c }));
      } else {
        console.log(`  ✅ public.${tableName}: all ${expectedCols.size} columns present`);
      }
      continue;
    }

    const existingCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema=${schemaName} AND table_name=${tableName}
    `;
    const existingSet = new Set(existingCols.map(r => r['column_name'] as string));
    const missing = [...expectedCols].filter(c => !existingSet.has(c));

    if (missing.length > 0) {
      console.log(`  ❌ ${tableName}: missing ${missing.length} columns → ${missing.join(', ')}`);
      missing.forEach(c => allMissing.push({ table: tableName, column: c }));
    } else {
      console.log(`  ✅ ${tableName}: all ${expectedCols.size} columns present`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`TOTAL: ${allMissing.length} missing columns across ${new Set(allMissing.map(m => m.table)).size} tables`);
  
  if (allMissing.length > 0) {
    console.log(`\nMissing columns detail:`);
    const grouped = new Map<string, string[]>();
    for (const m of allMissing) {
      if (!grouped.has(m.table)) grouped.set(m.table, []);
      grouped.get(m.table)!.push(m.column);
    }
    for (const [table, cols] of grouped) {
      console.log(`  ${table}: ${cols.join(', ')}`);
    }
  }

  await sql.end();
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
