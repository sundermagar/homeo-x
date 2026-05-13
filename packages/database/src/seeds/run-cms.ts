import { createDbClient } from '../client.js';
import { seedCms } from './cms-seed.js';
import { TenantRegistry } from '../tenant-registry.js';
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
  if (!dbUrl) {
    console.error('[Seed] DATABASE_URL not found in environment');
    process.exit(1);
  }

  const tenants = TenantRegistry.getAll();
  for (const tenant of tenants) {
    console.log(`[Seed] Seeding CMS for tenant: ${tenant.displayName}...`);
    const db = createDbClient(dbUrl, tenant.schemaName);
    await seedCms(db);
  }
  
  console.log('[Seed] CMS seeding completed for all tenants.');
  process.exit(0);
}

main().catch(err => {
  console.error('[Seed] CMS Seeding failed:', err);
  process.exit(1);
});
