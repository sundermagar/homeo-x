import { createDbClient } from '../src/infrastructure/database/client';
import { sql } from 'drizzle-orm';

async function diagnose() {
  require('dotenv').config();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('No DB URL'); return; }
  
  const db = createDbClient(dbUrl);
  
  console.log('--- PUBLIC USERS ---');
  const publicUsers = await db.execute(sql`SELECT id, name, email, type, context_id FROM users WHERE LOWER(email) = 'center@gmail.com'`);
  console.log(JSON.stringify(publicUsers, null, 2));

  console.log('\n--- PUBLIC CLINICADMINS ---');
  const publicAdmins = await db.execute(sql`SELECT id, name, email FROM clinicadmins WHERE LOWER(email) = 'center@gmail.com'`);
  console.log(JSON.stringify(publicAdmins, null, 2));

  console.log('\n--- ORGANIZATIONS ---');
  const orgs = await db.execute(sql`SELECT id, name, admin_email FROM organizations WHERE LOWER(admin_email) = 'center@gmail.com'`);
  console.log(JSON.stringify(orgs, null, 2));
}

diagnose().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
