import 'dotenv/config';
import { db } from '@mmc/database';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding regid to soap_notes...');
  try {
    await db.execute(sql`ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS regid INTEGER;`);
    await db.execute(sql`ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_visit_id_unique;`);
    console.log('Successfully altered soap_notes.');
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
