import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import { bills } from './packages/database/src/schema/billing.ts';
import { eq, inArray, isNull } from 'drizzle-orm';

async function run() {
  console.log('Connecting to postgres://postgres:postgres@localhost:5432/homeox');
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/homeox' });
  await client.connect();
  const db = drizzle(client);

  const allRegBills = await db.select().from(bills).where(eq(bills.billType, 'Registration'));
  console.log(`Found ${allRegBills.length} registration bills.`);

  if (allRegBills.length > 0) {
    const ids = allRegBills.map(b => b.id);
    await db.update(bills).set({ deletedAt: new Date() }).where(inArray(bills.id, ids));
    console.log(`Soft deleted ${ids.length} registration bills.`);
  }

  await client.end();
}

run().catch(console.error);
