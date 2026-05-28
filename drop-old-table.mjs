import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    await client`DROP TABLE IF EXISTS "ai_credit_wallets" CASCADE`;
    console.log("Successfully dropped old ai_credit_wallets table");
  } catch (error) {
    console.error("Error dropping table:", error);
  } finally {
    await client.end();
  }
}

main();
