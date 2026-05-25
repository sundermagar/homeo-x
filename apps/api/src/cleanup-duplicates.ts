import { drizzle } from 'drizzle-orm/node-postgres';
// @ts-ignore
import pkg from 'pg';
const { Client } = pkg;
import * as schema from '../../../packages/database/src/schema/billing.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });

  console.log("Searching for Jyoti Sharma...");
  console.log("Searching for duplicate Registration bills in the database...");
  const allRegBills = await db.select()
    .from(schema.bills)
    .where(and(eq(schema.bills.billType, 'Registration'), sql`deleted_at IS NULL`))
    .orderBy(desc(schema.bills.id));

  const dupGroups: Record<string, any[]> = {};
  for (const b of allRegBills) {
    // Only care about recent bills (e.g., ID > 80 to avoid old data)
    if (b.id < 50) continue;
    const key = `${b.regid}-${b.billDate}`;
    if (!dupGroups[key]) dupGroups[key] = [];
    dupGroups[key].push(b);
  }

  for (const [key, bills] of Object.entries(dupGroups)) {
    if (bills.length > 1) {
      console.log(`Found duplicate Registration bills for RegID-Date: ${key}`);
      for (const b of bills) {
        console.log(`  - ID: ${b.id}, Charges: ${b.charges}`);
      }
      // Sort to keep the highest charge (or highest ID if equal)
      bills.sort((a, b) => b.charges - a.charges || b.id - a.id);
      const keep = bills[0];
      const deleteIds = bills.slice(1).map(b => b.id);
      console.log(`  -> KEEPING ID: ${keep.id}`);
      for (const delId of deleteIds) {
        console.log(`  -> DELETING ID: ${delId}`);
        await db.update(schema.bills).set({ deletedAt: new Date() }).where(eq(schema.bills.id, delId));
        console.log(`  -> DELETED ID ${delId}`);
      }
    }
  }

  await client.end();
  process.exit(0);
}

main().catch(console.error);
