import { db } from '@mmc/database';
import { bills } from '@mmc/database/schema';
import { eq, isNull, inArray } from 'drizzle-orm';

async function run() {
  console.log('Connecting to db...');
  
  const allRegBills = await db.select().from(bills).where(eq(bills.billType, 'Registration'));
  console.log(`Found ${allRegBills.length} registration bills.`);

  if (allRegBills.length > 0) {
    const ids = allRegBills.map(b => b.id);
    await db.update(bills).set({ deletedAt: new Date() }).where(inArray(bills.id, ids));
    console.log(`Soft deleted ${ids.length} registration bills.`);
  }

  process.exit(0);
}

run().catch(console.error);
