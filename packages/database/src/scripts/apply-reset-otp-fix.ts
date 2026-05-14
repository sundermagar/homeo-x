import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'] || 'postgresql://postgres:instep123@localhost:5432/homeo_x';

async function applyFix() {
  const sql = postgres(dbUrl);
  
  console.log('Applying Reset OTP columns to users table...');
  
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp TEXT`;
    console.log('✅ Added reset_otp column');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP`;
    console.log('✅ Added reset_otp_expiry column');
    
    console.log('Done!');
  } catch (err: any) {
    console.error('❌ Failed to apply fix:', err.message);
  } finally {
    await sql.end();
  }
}

applyFix();
