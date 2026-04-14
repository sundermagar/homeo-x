import { createDbClient } from '../client';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Manual .env loader
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

  const db = createDbClient(dbUrl, 'public');
  
  const tables = ['appointments', 'receipt', 'case_reminder', 'vitals', 'tokens', 'case_datas'];
  
  for (const table of tables) {
    console.log(`Inspecting ${table} columns...`);
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${table}
    `);
    console.log(`${table}: ${JSON.stringify((columns as any[]).map(c => c.column_name))}`);
  }
}

main().catch(console.error);
