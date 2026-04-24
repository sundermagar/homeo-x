
import '../shared/config/load-env';
import { createDbClient } from '@mmc/database';
import { organizations } from '@mmc/database/schema';

async function check() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const db = createDbClient(process.env.DATABASE_URL);
  
  const all = await db.select().from(organizations);
  console.log('--- Organization Logos ---');
  all.forEach((o: any) => {
    console.log(`Org: ${o.name} | Logo: ${o.logo}`);
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
