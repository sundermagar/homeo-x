import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl);

async function main() {
  // Check which schemas have the notifications table
  const schemas = await sql`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name = 'notifications'
  `;
  console.log('Notifications table found in schemas:', JSON.stringify(schemas, null, 2));

  // Check rows in tenant_demo schema
  try {
    const rows = await sql`SELECT * FROM tenant_demo.notifications LIMIT 5`;
    console.log('\ntenant_demo.notifications rows:', rows.length);
    if (rows.length > 0) console.log(rows);
  } catch(e) { console.log('tenant_demo.notifications error:', e.message); }

  // Check rows in public schema
  try {
    const rows = await sql`SELECT * FROM public.notifications LIMIT 5`;
    console.log('\npublic.notifications rows:', rows.length);
    if (rows.length > 0) console.log(rows);
  } catch(e) { console.log('public.notifications error:', e.message); }

  // Also check which user we inserted the test notification for
  try {
    const users = await sql`SELECT id, email, name FROM tenant_demo.users LIMIT 3`;
    console.log('\nFirst 3 users in tenant_demo:', users);
  } catch(e) { console.log('tenant_demo.users error:', e.message); }

  await sql.end();
}
main().catch(console.error);
