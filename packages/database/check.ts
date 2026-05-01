import { createDbClient } from './src/client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
  const db = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');
  const result = await db.execute(sql`SELECT id, email, password FROM tenant_demo.users WHERE email = 'admin@kreed.health'`);
  console.log(result);
}

check().catch(console.error);
