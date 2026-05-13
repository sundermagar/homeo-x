import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'] || 'postgresql://postgres:instep123@localhost:5432/homeo_x';

async function diagnose() {
  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
  console.log('Connecting to:', maskedUrl);
  
  const sql = postgres(dbUrl);
  
  try {
    const tableCheck = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `;
    console.log('Found "users" tables in schemas:', tableCheck);

    for (const table of tableCheck) {
      const ts = table['table_schema'];
      const tn = table['table_name'];
      console.log(`Checking columns for ${ts}.${tn}:`);
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = ${ts}
      `;
      console.table(columns);
    }
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.end();
  }
}

diagnose();
