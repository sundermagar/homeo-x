/**
 * run-pending-migrations.mjs
 * 
 * Runs migrations 0017–0020 on the Railway (live) DB in order.
 * These are all idempotent (IF NOT EXISTS / IF EXISTS) so safe to re-run.
 */
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from monorepo root
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
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

console.log(`🔌 Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
const sql = postgres(dbUrl, { max: 1, connect_timeout: 15 });

const migrationFiles = [
  '0017_ml_training_logs.sql',
  '0018_ml_training_embeddings.sql',
  '0019_add_fingerprint_hash.sql',
  '0020_split_ml_training_embeddings.sql',
];

async function run() {
  for (const file of migrationFiles) {
    const filePath = path.resolve(__dirname, '../src/migrations', file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (not found)`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    // Split on drizzle statement breakpoints
    const statements = content
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`\n📄 Running ${file} (${statements.length} statements)...`);
    for (let i = 0; i < statements.length; i++) {
      try {
        await sql.unsafe(statements[i]);
        console.log(`  ✅ Statement ${i + 1}/${statements.length} OK`);
      } catch (err) {
        console.error(`  ❌ Statement ${i + 1}/${statements.length} FAILED:`, err.message);
      }
    }
  }

  // Verify tables exist
  console.log('\n📋 Verifying tables...');
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('ml_training_logs', 'ml_training_embeddings')
    ORDER BY table_name
  `;
  for (const t of tables) {
    console.log(`  ✅ ${t.table_name} exists`);
  }

  await sql.end();
  console.log('\n🎉 Done!');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
