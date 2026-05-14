import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'] || 'postgresql://postgres:instep123@localhost:5432/homeo_x';

async function applyGlobalFix() {
  const sql = postgres(dbUrl);
  
  try {
    // 1. Get all schemas that have a 'users' table
    const schemas = await sql`
      SELECT table_schema 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `;
    
    console.log(`Found ${schemas.length} schemas with 'users' table.`);

    for (const row of schemas) {
      const table_schema = row['table_schema'];
      console.log(`Applying fix to ${table_schema}.users...`);
      
      // We have to use raw strings for identifiers in ALTER TABLE
      await sql.unsafe(`ALTER TABLE "${table_schema}"."users" ADD COLUMN IF NOT EXISTS reset_otp TEXT`);
      await sql.unsafe(`ALTER TABLE "${table_schema}"."users" ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP`);
      
      console.log(`✅ Success for ${table_schema}`);
    }
    
    console.log('Global fix completed!');
  } catch (err: any) {
    console.error('❌ Failed to apply global fix:', err.message);
  } finally {
    await sql.end();
  }
}

applyGlobalFix();
