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
const sql = postgres(dbUrl, { connection: { search_path: 'tenant_demo, public' } });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "clinic_id" integer,
      "type" varchar(50) NOT NULL,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "is_read" boolean DEFAULT false NOT NULL,
      "deleted_at" timestamp,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `;
  console.log('Notifications table created');
  
  // Also run the test insert
  const users = await sql`SELECT id FROM users LIMIT 1`;
  if (users.length > 0) {
    const userId = users[0].id;
    await sql`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (${userId}, 'GENERAL', 'Welcome to Notifications', 'This is a test notification.')
    `;
    console.log(`Successfully inserted test notification for user ${userId}`);
  }
  
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
