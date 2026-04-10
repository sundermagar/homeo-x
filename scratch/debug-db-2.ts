import { createDbClient } from './packages/database/src/client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function debug() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  
  // Test with tenant_demo schema
  const db = createDbClient(url, 'tenant_demo');
  
  try {
    const path = await db.execute(sql`SHOW search_path`);
    console.log('Current search_path:', path);
    
    const doctorsCount = await db.execute(sql`SELECT count(*) FROM public.doctors`);
    console.log('Doctors in public.doctors:', doctorsCount);

    const familyGroupsCount = await db.execute(sql`SELECT count(*) FROM familygroups`);
    console.log('Family groups count:', familyGroupsCount);

  } catch (err: any) {
    console.error('Debug Error:', err);
  }
}

debug().catch(console.error);
