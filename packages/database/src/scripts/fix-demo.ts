import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');

dotenv.config({ path: rootEnv });
const DATABASE_URL = process.env['DATABASE_URL']!;

console.log('Path:', rootEnv);
console.log('DB URL found:', !!DATABASE_URL);

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL missing');
    return;
  }
  const sql = postgres(DATABASE_URL);
  try {
    await sql.unsafe(`
      ALTER TABLE tenant_demo.remedy_tree_nodes 
      ADD COLUMN IF NOT EXISTS gujrati_label text,
      ADD COLUMN IF NOT EXISTS punjabi_label text,
      ADD COLUMN IF NOT EXISTS malyalum_label text,
      ADD COLUMN IF NOT EXISTS kannad_label text,
      ADD COLUMN IF NOT EXISTS bengali_label text,
      ADD COLUMN IF NOT EXISTS marathi_label text,
      ADD COLUMN IF NOT EXISTS french_label text,
      ADD COLUMN IF NOT EXISTS german_label text,
      ADD COLUMN IF NOT EXISTS spanish_label text;
    `);
    console.log('✅ tenant_demo.remedy_tree_nodes fixed');
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  } finally {
    await sql.end();
  }
}
main();
