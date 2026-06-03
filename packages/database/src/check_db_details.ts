import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const sql = postgres(dbUrl as string, { max: 1 });
  
  console.log('=== Migrations in tenant_demo ===');
  try {
    const migrations = await sql`SELECT * FROM tenant_demo.__drizzle_migrations`;
    console.log(migrations);
  } catch (err: any) {
    console.error('Error fetching migrations:', err.message);
  }

  console.log('\n=== Columns in tenant_demo.wa_ai_settings ===');
  try {
    const columns = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'tenant_demo' AND table_name = 'wa_ai_settings'
    `;
    console.log(columns);
  } catch (err: any) {
    console.error('Error fetching columns:', err.message);
  }

  console.log('\n=== All wa_ tables in tenant_demo ===');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'tenant_demo' AND table_name LIKE 'wa_%'
    `;
    console.log(tables.map(r => r['table_name']));
  } catch (err: any) {
    console.error('Error fetching tables:', err.message);
  }

  await sql.end();
}

main().catch(console.error);
