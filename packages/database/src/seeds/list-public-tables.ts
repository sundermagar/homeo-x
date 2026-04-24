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
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('Tables in public schema:');
  console.log((tables as any[]).map(t => t.table_name).join(', '));
}
main().catch(console.error);
