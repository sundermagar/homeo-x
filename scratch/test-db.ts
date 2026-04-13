import { createDbClient } from './packages/database/src/client';
import { caseDatasLegacy, religionLegacy, occupationLegacy, refrencetypeLegacy } from './packages/database/src/schema/legacy/index';
import { isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function test() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not found in .env');
    return;
  }

  console.log('Testing connection to:', url.replace(/:[^:]*@/, ':****@'));
  
  // Test with tenant_demo schema
  const db = createDbClient(url, 'tenant_demo');

  try {
    console.log('--- Testing case_datas ---');
    const patients = await db.select().from(caseDatasLegacy).limit(1);
    console.log('Success: Found', patients.length, 'patients');
  } catch (err: any) {
    console.error('FAILED case_datas:', err.message);
  }

  try {
    console.log('--- Testing metadata tables ---');
    const [rel, occ, ref] = await Promise.all([
      db.select().from(religionLegacy).limit(1),
      db.select().from(occupationLegacy).limit(1),
      db.select().from(refrencetypeLegacy).where(isNull(refrencetypeLegacy.deletedAt)).limit(1),
    ]);
    console.log('Success: Found metadata');
  } catch (err: any) {
    console.error('FAILED metadata:', err.message);
  }
}

test().catch(console.error);
