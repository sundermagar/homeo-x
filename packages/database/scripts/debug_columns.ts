import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  try {
    const res = await sql`
      SELECT a.attname as "Column",
             pg_catalog.format_type(a.atttypid, a.atttypmod) as "Type"
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = 'tenant_demo.case_datas'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
    `;
    console.log("case_datas columns:");
    console.log(JSON.stringify(res, null, 2));

    const res2 = await sql`
      SELECT a.attname as "Column",
             pg_catalog.format_type(a.atttypid, a.atttypmod) as "Type"
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = 'tenant_demo.bills'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
    `;
    console.log("bills columns:");
    console.log(JSON.stringify(res2, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

check();
