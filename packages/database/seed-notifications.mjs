import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl);

async function main() {
  // The login uses public.users for authentication
  // JWT user.id = public.users.id  
  // tenantDb search_path = 'tenant_demo, public'
  // So: INSERT into notifications WITH public.users IDs  
  //     Query in tenantDb will find them (since search_path includes public)

  console.log('=== Public users ===');
  const pubUsers = await sql`SELECT id, email, name, type FROM public.users ORDER BY id LIMIT 20`;
  pubUsers.forEach(u => console.log(`  ID: ${u.id} | ${u.email} | ${u.name} | ${u.type}`));

  // First check if notifications table exists in public schema
  const tables = await sql`
    SELECT table_schema FROM information_schema.tables 
    WHERE table_name = 'notifications'
  `;
  console.log('\nNotifications table in schemas:', tables.map(t => t.table_schema));

  // Seed notifications in public.notifications for public.users IDs
  console.log('\n=== Seeding notifications in public.notifications for all public.users ===');
  for (const user of pubUsers) {
    try {
      await sql`
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (${user.id}, 'GENERAL', 'Welcome to HomeoX Notifications', 
                ${'Hello ' + user.name + '! Your notification system is now active.'})
      `;
      console.log(`  ✅ public schema: user ${user.id} (${user.email})`);
    } catch(e) { console.log(`  ❌ public: user ${user.id}: ${e.message}`); }
  }

  // Also seed in tenant_demo for tenant_demo users
  console.log('\n=== Seeding in tenant_demo.notifications for all tenant_demo.users ===');
  const tenantUsers = await sql`SELECT id, email, name FROM tenant_demo.users ORDER BY id LIMIT 20`;
  for (const user of tenantUsers) {
    try {
      await sql`
        INSERT INTO tenant_demo.notifications (user_id, type, title, message)
        VALUES (${user.id}, 'GENERAL', 'Welcome to HomeoX Notifications',
                ${'Hello ' + user.name + '! Your notification system is now active.'})
      `;
      console.log(`  ✅ tenant_demo: user ${user.id} (${user.email})`);
    } catch(e) { console.log(`  ❌ tenant_demo: user ${user.id}: ${e.message}`); }
  }

  console.log('\n=== Final notification counts ===');
  const pubCount = await sql`SELECT count(*) as c FROM public.notifications`;
  const tenCount = await sql`SELECT count(*) as c FROM tenant_demo.notifications`;
  console.log('public.notifications:', pubCount[0].c);
  console.log('tenant_demo.notifications:', tenCount[0].c);

  await sql.end();
}
main().catch(console.error);
