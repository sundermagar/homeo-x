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
  const db = createDbClient(dbUrl, 'public');
  const columns = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'case_datas'
  `);
  console.log('Columns in case_datas:');
  console.log((columns as any[]).map(c => c.column_name).join(', '));
}
main().catch(console.error);
