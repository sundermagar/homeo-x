import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';
import { TenantRegistry } from './tenant-registry';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];

if (!dbUrl || !dbUrl.includes('@postgres.railway.internal')) {
  console.error(`❌ INVALID DATABASE_URL DETECTED IN RAILWAY: [${dbUrl}]`);
  console.error("The deployment is reading this as empty, or the URL contains invalid invisible spaces/newlines that break the connection string.");
  process.exit(1);
}

const safeUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
console.log(`[DEBUG] Received DB URL: ${safeUrl}`);

const migrationsFolder = path.join(process.cwd(), 'src', 'migrations');

import { provisionTenant } from './provision-tenant';

async function migrateTenant(schemaName: string) {
  console.log(`\n===========================================`);
  console.log(`🚀 Provisioning & Migrating Schema: [${schemaName}]`);
  console.log(`===========================================`);

  try {
    // 1. Provision Baseline Tables (Legacy Parity)
    // This ensures all 150+ tables from tenant_demo are present
    await provisionTenant(dbUrl as string, schemaName);
    
    // 2. Run Modern Migrations
    const connection = postgres(dbUrl as string, { 
      max: 1,
      onnotice: () => {}, 
      connection: {
        search_path: schemaName
      }
    });
    
    const db = drizzle(connection);
    await migrate(db, { 
      migrationsFolder, 
      migrationsSchema: schemaName 
    });
    
    await connection.end();
    console.log(`✅ Schema [${schemaName}] synchronized successfully.`);
  } catch (error: any) {
    console.error(`❌ Process failed for [${schemaName}]:`);
    console.error(error);
    if (error.query) {
      console.error(`❌ FAILING QUERY WAS:`, error.query);
    }
    process.exit(1);
  }
}

async function main() {
  if (!fs.existsSync(migrationsFolder)) {
    console.error(`❌ Migrations folder not found at: ${migrationsFolder}`);
    process.exit(1);
  }

  const tenants = TenantRegistry.getAll();
  console.log(`Starting migration strategy for ${tenants.length} tenants...`);

  // 1. Provision public schema with base tables
  console.log('\n===========================================');
  console.log('🚀 Provisioning PUBLIC schema (base tables)...');
  console.log('===========================================');
  try {
    await provisionTenant(dbUrl as string, 'public');
    console.log('✅ Public schema base tables ready.');
  } catch (e: any) {
    console.error('❌ Public schema provisioning failed:', e.message);
    throw e;
  }

  // Optional: Force wipe schemas once to fix the primary key serial issue
  if (process.env['FORCE_RESET_SCHEMAS'] === 'true') {
    console.log('⚠️ FORCE_RESET_SCHEMAS DETECTED! Wiping all tenant schemas...');
    const dropSql = postgres(dbUrl as string);
    for (const tenant of tenants) {
      console.log(`Killing ${tenant.schemaName}...`);
      await dropSql.unsafe(`DROP SCHEMA IF EXISTS "${tenant.schemaName}" CASCADE`);
    }
    await dropSql.end();
    console.log('✅ Wiped. Now regenerating correctly...');
  }

  // Process sequentially to avoid aggressive connection pooling bottlenecks
  for (const tenant of tenants) {
    await migrateTenant(tenant.schemaName);
  }

  console.log(`\n🎉 Full multi-tenant provisioning lifecycle complete!`);
  process.exit(0);
}

main();
