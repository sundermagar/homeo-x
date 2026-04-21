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
    console.log('Adding columns to organizations table...');
    await sql.unsafe(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_email text DEFAULT ''`);
    await sql.unsafe(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_password text DEFAULT ''`);
    await sql.unsafe(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS assigned_to integer DEFAULT 1`);
    
    // Also remove the columns the user deleted from schema
    console.log('Removing outdated columns from organizations table...');
    await sql.unsafe(`ALTER TABLE organizations DROP COLUMN IF EXISTS profile_image`);
    await sql.unsafe(`ALTER TABLE organizations DROP COLUMN IF EXISTS profile`);
    
    console.log('Successfully patched organizations table.');
  } catch (err) {
    console.error('Failed to patch table:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
