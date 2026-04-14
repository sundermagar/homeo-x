import { createDbClient } from '../packages/database/src/client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listSchemas() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  
  const db = createDbClient(url, 'public');
  
  console.log('--- DB Schemas ---');
  const schemas = await db.execute(sql`
    SELECT schema_name 
    FROM information_schema.schemata;
  `);
  console.log(schemas.map((s: any) => s.schema_name).join(', '));
}

listSchemas().catch(console.error);
