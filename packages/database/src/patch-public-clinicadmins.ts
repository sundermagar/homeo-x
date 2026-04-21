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
    console.log('Creating clinicadmins table in public schema...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.clinicadmins (
        id serial PRIMARY KEY,
        name text NOT NULL,
        password text,
        designation text DEFAULT 'Clinic Administrator',
        gender text DEFAULT 'Male',
        mobile text DEFAULT '',
        mobile2 text DEFAULT '',
        email text NOT NULL,
        dept integer DEFAULT 4,
        city text DEFAULT '',
        address text DEFAULT '',
        about text DEFAULT '',
        date_birth date,
        date_left date,
        salary_cur integer DEFAULT 0,
        packages text,
        clinic_id integer,
        deleted_at timestamp,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    console.log('Successfully created clinicadmins table.');
  } catch (err) {
    console.error('Failed to create table:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
