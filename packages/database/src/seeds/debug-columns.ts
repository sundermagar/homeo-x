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

  const db = createDbClient(dbUrl, 'public'); // Or the tenant schema
  
  console.log('Inspecting case_datas columns...');
  const columns = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'case_datas'
  `);
  
  console.log(JSON.stringify(columns, null, 2));
}

main().catch(console.error);
