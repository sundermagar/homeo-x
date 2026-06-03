import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  try {
    console.log('Adding HFR columns to organizations table...');
    await sql.unsafe(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hfr_id text`);
    await sql.unsafe(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hfr_token text`);
    console.log('Successfully patched organizations table.');
  } catch (err) {
    console.error('Failed to patch table:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
