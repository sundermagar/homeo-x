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
const sql = postgres(dbUrl, { connection: { search_path: 'tenant_demo, public' } });

async function main() {
  // First, find a user
  const users = await sql`SELECT id FROM users LIMIT 1`;
  if (users.length === 0) {
    console.log("No users found");
    process.exit(1);
  }
  const userId = users[0].id;
  
  // Insert a mock notification
  await sql`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (${userId}, 'GENERAL', 'Welcome to Notifications', 'This is a test notification.')
  `;
  console.log(`Successfully inserted test notification for user ${userId}`);
  
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
