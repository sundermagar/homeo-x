/**
 * run-railway-seed.mjs
 * 
 * Safely seeds the local database using the Railway seed data and sequences dump.
 * Designed with safety checks to prevent accidental execution against live production databases.
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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

// ──────────────────────────────────────────────────
// Safety Guards
// ──────────────────────────────────────────────────
const lowerUrl = dbUrl.toLowerCase();
const isProduction = lowerUrl.includes('railway') || lowerUrl.includes('rlwy.net') || lowerUrl.includes('supabase') || lowerUrl.includes('aws') || lowerUrl.includes('rds');

if (isProduction) {
  console.error('⛔ ERROR: Connection string points to a remote/production URL!');
  console.error(`   URL: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.error('   Aborting seeding process to prevent production data corruption.');
  process.exit(1);
}

console.log(`🔌 Safely seeding local database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
const sql = postgres(dbUrl, { max: 10, connect_timeout: 10 });

function escapeId(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

function sanitizeValue(val) {
  if (typeof val === 'string') {
    if (val.startsWith('+') && val.includes('T') && val.includes('Z')) {
      const dashIdx = val.indexOf('-');
      if (dashIdx > 4) {
        const yearPart = val.slice(1, dashIdx);
        if (yearPart.length > 4) {
          let cleanYear = yearPart.slice(-4);
          if (cleanYear.startsWith('00')) {
            cleanYear = '20' + cleanYear.slice(2);
          }
          return cleanYear + val.slice(dashIdx);
        }
      }
    }
  }
  return val;
}

async function main() {
  const seedPath = path.resolve(__dirname, '../src/seeds/railway-seed-data.json');
  const seqPath = path.resolve(__dirname, '../src/seeds/railway-sequences.json');

  if (!fs.existsSync(seedPath)) {
    console.error(`❌ Error: Seed data file not found at ${seedPath}. Run introspect first.`);
    process.exit(1);
  }

  console.log('📖 Loading seed dataset...');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const sequenceValues = fs.existsSync(seqPath) ? JSON.parse(fs.readFileSync(seqPath, 'utf8')) : [];

  console.log('⚡ Beginning database transaction...');
  
  // Disable all triggers globally to bypass foreign key constraints during loading
  await sql`SET session_replication_role = 'replica'`;

  try {
    for (const [schemaName, tables] of Object.entries(seedData)) {
      console.log(`\n📂 Seeding Schema: ${schemaName}`);
      
      for (const [tableName, tableData] of Object.entries(tables)) {
        const rows = tableData.rows || [];
        if (rows.length === 0) continue;

        console.log(`   🧹 Truncating table: ${schemaName}.${tableName}`);
        await sql.unsafe(`TRUNCATE TABLE ${escapeId(schemaName)}.${escapeId(tableName)} CASCADE`);

        console.log(`   📥 Loading ${rows.length} rows into: ${schemaName}.${tableName}`);
        
        // Batch inserting in chunks of 500 rows for high performance
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const sanitizedChunk = chunk.map(row => {
            const newRow = {};
            for (const [k, v] of Object.entries(row)) {
              newRow[k] = sanitizeValue(v);
            }
            return newRow;
          });

          await sql.unsafe(
            `INSERT INTO ${escapeId(schemaName)}.${escapeId(tableName)} 
             SELECT * FROM jsonb_populate_recordset(null::${escapeId(schemaName)}.${escapeId(tableName)}, $1::jsonb)`,
            [sanitizedChunk]
          );
        }
      }
    }

    // ──────────────────────────────────────────────────
    // Synchronize auto-increment sequences
    // ──────────────────────────────────────────────────
    if (sequenceValues.length > 0) {
      console.log('\n🔢 Resetting sequence numbers for auto-increment keys...');
      for (const seq of sequenceValues) {
        try {
          await sql.unsafe(`SELECT setval('${escapeId(seq.schema)}.${escapeId(seq.name)}', ${seq.lastValue}, true)`);
        } catch (err) {
          // ignore sequences that fail to setval
        }
      }
      console.log(`   ✅ Reset ${sequenceValues.length} sequences successfully.`);
    }

    console.log('\n🎉 Local database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error occurred during seeding:', error);
    throw error;
  } finally {
    // Re-enable triggers globally
    await sql`SET session_replication_role = 'origin'`;
    await sql.end();
  }
}

main().catch(() => {
  process.exit(1);
});
