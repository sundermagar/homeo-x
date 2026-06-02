import { createDbClient } from '../client.js';
import { seedRbac } from './rbac-seed.js';
import { TenantRegistry } from '../tenant-registry.js';
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
  if (!dbUrl) {
    console.error('[Seed] DATABASE_URL not found');
    process.exit(1);
  }

  const tenants = TenantRegistry.getAll();
  console.log(`[Seed] Found ${tenants.length} tenants. Running RBAC seed only...`);

  for (const tenant of tenants) {
    try {
      console.log(`[Seed] Seeding RBAC for tenant: ${tenant.displayName} (${tenant.schemaName})...`);
      const db = createDbClient(dbUrl, tenant.schemaName);
      await seedRbac(db);
    } catch (err) {
      console.error(`[Seed] ❌ Failed to seed RBAC for ${tenant.schemaName}:`, err);
    }
  }
  
  console.log('[Seed] All RBAC seeding completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Seeding failed:', err);
  process.exit(1);
});
