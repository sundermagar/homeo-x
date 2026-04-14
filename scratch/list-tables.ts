import { createDbClient } from './packages/database/src/client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function listTables() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  
  const db = createDbClient(url, 'public');
  
  console.log('--- Tables in Public Schema ---');
  const publicTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log(publicTables.map((t: any) => t.table_name).join(', '));

  console.log('\n--- Tables in tenant_demo Schema ---');
  const tenantTables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'tenant_demo'
    ORDER BY table_name;
  `);
  console.log(tenantTables.map((t: any) => t.table_name).join(', '));
}

listTables().catch(console.error);
