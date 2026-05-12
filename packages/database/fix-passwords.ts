import { createDbClient } from './src/client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fix() {
  const db = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');
  const emails = ['doctor@kreed.health', 'admin@kreed.health', 'reception@kreed.health', 'clinicadmin@kreed.health'];
  
  const hash = '$2a$10$1ChhskXKK67s0g9p4q.sAuHA/RNLPdRvKRh3LSCtYqE7yqYFbi.8S'; // hash for 'password123'
  
  for (const email of emails) {
    await db.execute(sql`UPDATE tenant_demo.users SET password = ${hash} WHERE email = ${email}`);
    console.log(`Updated password for ${email}`);
  }
}

fix().catch(console.error);
