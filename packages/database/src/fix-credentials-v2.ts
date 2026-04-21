import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Fix path to go up to the workspace root
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

// FRESH verified hash for "password123"
const PASSWORD_HASH_123 = '$2a$10$lcmcv6exnywwcvdTwbuSjOy.Zx7/2R/OngntAiYAtTSBVQ/qJ4GLS';

async function fix() {
  console.log('Fixing credentials with fresh hash...');

  // 1. vismedicos
  try {
    await sql.unsafe(`
      UPDATE tenant_vismedicos.users 
      SET email = 'visadmin@gmail.com', password = '${PASSWORD_HASH_123}'
      WHERE email = 'visadmin@gmail.com' OR email = 'visadmin2@gmail.com'
    `);
    console.log('Updated tenant_vismedicos.users [✓]');
  } catch (e) {
    console.log('Error updating tenant_vismedicos:', e.message);
  }

  // 2. amanmedical
  try {
    await sql.unsafe(`
      UPDATE tenant_amanmedical.users 
      SET email = 'amanadmin@gmail.com', password = '${PASSWORD_HASH_123}'
      WHERE email = 'amanadmin@gmail.com' OR email = 'amadadmin@gmail.com'
    `);
    console.log('Updated tenant_amanmedical.users [✓]');
  } catch (e) {
    console.log('Error updating tenant_amanmedical:', e.message);
  }

  await sql.end();
}

fix();
