
import { db } from '../infrastructure/database/db';
import { organizations } from '../infrastructure/database/schema/platform';

async function check() {
  const all = await db.select().from(organizations);
  console.log('--- Organization Logos ---');
  all.forEach(o => {
    console.log(`Org: ${o.name} | Logo: ${o.logo}`);
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
