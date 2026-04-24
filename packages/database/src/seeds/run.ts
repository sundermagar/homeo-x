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
import { seedGrowthReferences } from './growth-references';
import { seedRemedyChart } from './remedy-chart-seed';
import { seedPlatform } from './platform-seed';
import { seedTestData } from './test-data-seed';
import { seedDoctorStaff } from './doctor-staff-seed';
import { seedStaffRegistry } from './staff-registry-seed';
import { seedRbac } from './rbac-seed';
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

  // 1. Seed Global Platform (Public Schema)
  try {
    const publicDb = createDbClient(dbUrl); // default to public schema
    await seedPlatform(publicDb);
  } catch (err) {
    console.error('[Seed] ❌ Failed to seed global platform data:', err);
  }

  // 2. Seed Individual Tenants
  const tenants = TenantRegistry.getAll();
  console.log(`[Seed] Found ${tenants.length} tenants to seed.`);

  for (const tenant of tenants) {
    try {
      console.log(`[Seed] Seeding for tenant: ${tenant.displayName} (${tenant.schemaName})...`);
      const db = createDbClient(dbUrl, tenant.schemaName);
      const runSeed = async (name: string, fn: (db: any) => Promise<void>) => {
        try {
          await fn(db);
        } catch (err: any) {
          console.error(`  [Seed: ${name}] ❌ Failed: ${err.message}`);
        }
      };

      await runSeed('Users', seedUsers);
      await runSeed('Catalog', seedCatalog);
      await runSeed('Dispensaries', seedDispensaries);
      await runSeed('Packages', seedPackages);
      await runSeed('Couriers', seedCouriers);
      await runSeed('Referrals', seedReferrals);
      await runSeed('Stickers', seedStickers);
      await runSeed('CMS', seedCms);
      await runSeed('FAQs', seedFaqs);
      await runSeed('PDF Settings', seedPdfSettings);
      await runSeed('Growth References', seedGrowthReferences);
      await runSeed('Remedy Chart', seedRemedyChart);
      await runSeed('Doctor Staff', seedDoctorStaff);
      await runSeed('Staff Registry', seedStaffRegistry);
      await runSeed('RBAC', seedRbac);
      await runSeed('Test Data', seedTestData);
    } catch (err) {
      console.error(`[Seed] ❌ Failed to seed tenant ${tenant.displayName} (${tenant.schemaName}):`, err);
    }
  }
  
  console.log('[Seed] All multi-tenant seeding completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Seeding failed:', err);
  process.exit(1);
});
