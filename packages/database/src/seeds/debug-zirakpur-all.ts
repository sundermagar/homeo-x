import { createDbClient } from '../client';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function main() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) throw new Error('DATABASE_URL not found');
  const db = createDbClient(dbUrl, 'zirakpur');
  
  const tables = ['case_datas', 'appointments', 'receipt', 'case_reminder', 'vitals'];
  
  for (const table of tables) {
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${table} AND table_schema = 'zirakpur'
    `);
    console.log(`Columns in zirakpur.${table}:`);
    console.log((columns as any[]).map(c => c.column_name).join(', '));
  }
}
main().catch(console.error);
