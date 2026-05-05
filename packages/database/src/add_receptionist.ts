import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env['DATABASE_URL'];
const sql = postgres(connectionString!);

async function run() {
  const email = 'receptionist@kreed.health';
  const password = 'password123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  try {
    // Check if exists
    const existing = await sql`SELECT id FROM tenant_demo.users WHERE email = ${email}`;
    if (existing.length > 0) {
      console.log('User already exists, updating password...');
      await sql`UPDATE tenant_demo.users SET password = ${hash} WHERE email = ${email}`;
    } else {
      console.log('Creating new user...');
      // Insert with some default values. We'll copy from the reception user if it exists.
      const baseUser = await sql`SELECT * FROM tenant_demo.users WHERE email = 'reception@kreed.health' LIMIT 1`;
      
      if (baseUser.length > 0) {
        const u = baseUser[0]!;
        await sql`INSERT INTO tenant_demo.users
          (name, email, password, type, context_id, role_id, is_active, created_at, updated_at)
          VALUES
          (${u['name']}, ${email}, ${hash}, ${u['type']}, ${u['context_id']}, ${u['role_id']}, true, NOW(), NOW())`;
      } else {
        // Fallback defaults
        await sql`INSERT INTO tenant_demo.users 
          (name, email, password, type, context_id, is_active, created_at, updated_at) 
          VALUES 
          ('Receptionist', ${email}, ${hash}, 'Receptionist', 1, true, NOW(), NOW())`;
      }
    }
    console.log('✅ User receptionist@kreed.health prepared successfully.');
  } catch (e: any) {
    console.error('❌ Error:', e.message);
  }
  await sql.end();
}
run();
