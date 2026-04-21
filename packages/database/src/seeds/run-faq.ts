import { createDbClient } from '../client';
import { seedFaqs } from './faq-seed';
import { TenantRegistry } from '../tenant-registry';
import fs from 'fs';
import path from 'path';

// Manual .env loader to avoid dependency issues
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
    console.error('[Seed:FAQ] DATABASE_URL not found in environment');
    process.exit(1);
  }

  const publicDb = createDbClient(dbUrl); // default to public schema
  
  // 1. Initialize TenantRegistry from the database to include all active clinics
  console.log('[Seed:FAQ] Initializing Tenant Registry...');
  await TenantRegistry.initialize(publicDb);

  // 2. Seed Individual Tenants
  const tenants = TenantRegistry.getAll();
  console.log(`[Seed:FAQ] Found ${tenants.length} tenants to seed.`);

  for (const tenant of tenants) {
    try {
      console.log(`[Seed:FAQ] Seeding FAQs for tenant: ${tenant.displayName} (${tenant.schemaName})...`);
      const db = createDbClient(dbUrl, tenant.schemaName);
      
      await seedFaqs(db);
      
      console.log(`  [Seed:FAQ] ✓ Success for ${tenant.slug}`);
    } catch (err: any) {
      console.error(`  [Seed:FAQ] ❌ Failed for ${tenant.displayName}: ${err.message}`);
    }
  }
  
  console.log('[Seed:FAQ] Targeted FAQ seeding completed for all tenants.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed:FAQ] Seeding failed:', err);
  process.exit(1);
});
