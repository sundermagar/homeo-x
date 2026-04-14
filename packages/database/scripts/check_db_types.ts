import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  process.exit(1);
}

async function check() {
  const sql = postgres(connectionString!);
  try {
    const res = await sql`
      SELECT table_schema, table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' AND column_name = 'regid'
      LIMIT 10;
    `;
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

check();
