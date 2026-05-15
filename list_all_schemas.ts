import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function check() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const schemas = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`;
    console.log('Schemas:', schemas.map(s => s.schema_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

check();
