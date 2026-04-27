import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load .env from apps/api
config({ path: resolve(__dirname, 'apps/api/.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is missing in apps/api/.env');
    return;
  }

  const sqlClient = postgres(connectionString);
  const db = drizzle(sqlClient);

  try {
    const res = await db.execute(sql`SELECT id, email, password FROM tenant_demo.users LIMIT 10;`);
    console.log("TENANT DEMO USERS:", res);
  } catch (err) {
    console.error(err);
  } finally {
    await sqlClient.end();
  }
}

main();
