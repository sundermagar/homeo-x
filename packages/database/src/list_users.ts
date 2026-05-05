import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env['DATABASE_URL'];
const sql = postgres(connectionString!);

async function run() {
  try {
    const users = await sql`SELECT id, email, type, is_active FROM tenant_demo.users`;
    console.log('Users in tenant_demo:', JSON.stringify(users, null, 2));
  } catch (e: any) {
    console.error('Error fetching users:', e.message);
  }
  await sql.end();
}
run();
