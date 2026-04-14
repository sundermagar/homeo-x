import { createDbClient } from '../client';
import { seedUsers } from './user-seed';
import { seedCatalog } from './catalog-seed';
import { seedDispensaries } from './dispensary-seed';
import { seedPackages } from './package-seed';
import { seedCouriers } from './courier-seed';
import { seedReferrals } from './referral-seed';
import { seedStickers } from './sticker-seed';
import { seedCms } from './cms-seed';
import { seedFaqs } from './faq-seed';
import { seedPdfSettings } from './pdf-seed';
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
    console.error('[Seed] DATABASE_URL not found in environment');
    process.exit(1);
  }

  const tenants = TenantRegistry.getAll();
  console.log(`[Seed] Found ${tenants.length} tenants to seed.`);

  for (const tenant of tenants) {
    try {
      console.log(`[Seed] Seeding for tenant: ${tenant.displayName} (${tenant.schemaName})...`);
      const db = createDbClient(dbUrl, tenant.schemaName);
      await seedUsers(db);
      await seedCatalog(db);
      await seedDispensaries(db);
      await seedPackages(db);
      await seedCouriers(db);
      await seedReferrals(db);
      await seedStickers(db);
      await seedCms(db);
      await seedFaqs(db);
      await seedPdfSettings(db);
    } catch (err) {
      console.error(`[Seed] ❌ Failed to seed tenant ${tenant.schemaName}:`, err);
    }
  }
  
  console.log('[Seed] All multi-tenant seeding completed.');
}

main().catch((err) => {
  console.error('[Seed] Seeding failed:', err);
  process.exit(1);
});
