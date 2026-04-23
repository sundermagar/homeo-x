import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@mmc/database/schema/platform';
import { sql } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString!);
  const db = drizzle(client, { schema });

  const appts = await db.execute(sql`SELECT * FROM appointments ORDER BY id DESC LIMIT 5`);
  const wl = await db.execute(sql`SELECT * FROM waitlist ORDER BY id DESC LIMIT 5`);
  
  console.log("=== APPOINTMENTS ===");
  console.log(JSON.stringify((appts as any).slice(0,2), null, 2));
  console.log("=== WAITLIST ===");
  console.log(JSON.stringify((wl as any).slice(0,2), null, 2));
  process.exit(0);
}
main();
