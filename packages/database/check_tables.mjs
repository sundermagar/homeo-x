import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl);

async function main() {
  const tables = await sql`SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema IN ('public', 'tenant_demo') ORDER BY table_name`;
  console.log(tables.map(t => `${t.table_schema}.${t.table_name}`).join('\n'));
  await sql.end();
}
main().catch(console.error);
