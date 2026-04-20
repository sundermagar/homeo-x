import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Load .env manually
const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DATABASE_URL'); process.exit(1); }

// Connect with search_path set to tenant_demo
const sql = postgres(dbUrl, {
  connection: { search_path: 'tenant_demo, public' }
});

async function main() {
  // Check columns
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'tenant_demo' AND table_name = 'users' ORDER BY ordinal_position`;
  console.log('tenant_demo.users columns (' + cols.length + '):');
  cols.forEach(c => console.log(' ', c.column_name));

  // Check users
  const users = await sql`SELECT id, email, name, type FROM users LIMIT 5`;
  console.log('\nUsers (' + users.length + '):');
  users.forEach(u => console.log(' ', u.id, u.email, u.name, u.type));

  await sql.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
