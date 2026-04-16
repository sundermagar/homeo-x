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
if (!dbUrl) {
  console.error("❌ No DATABASE_URL found.");
  process.exit(1);
}

const migrationsFolder = path.join(process.cwd(), 'src', 'migrations');

async function migrateTenant(schemaName: string) {
  console.log(`\n===========================================`);
  console.log(`🚀 Provisioning Schema: [${schemaName}]`);
  console.log(`===========================================`);

  // Force postgres client isolation with search_path mapping in the connection options
  const connection = postgres(dbUrl as string, { 
    max: 1,
    onnotice: () => {}, // suppress notices for clean logs
    connection: {
      search_path: schemaName
    }
  });
  
  // Create schema if it doesn't already exist prior to migrations
  await connection`CREATE SCHEMA IF NOT EXISTS ${connection(schemaName)}`;
  
  const db = drizzle(connection);

  try {
    // Execute Drizzle Migrator passing the schema name so that the migrations 
    // metadata log (__drizzle_migrations) is stored INSIDE the tenant schema!
    await migrate(db, { 
      migrationsFolder, 
      migrationsSchema: schemaName 
    });
    console.log(`✅ Schema [${schemaName}] synchronized successfully.`);
  } catch (error: any) {
    console.error(`❌ Migration failed for [${schemaName}]:`);
    console.error(error);
  } finally {
    // Release the underlying socket pool securely
    await connection.end();
  }
}

async function main() {
  if (!fs.existsSync(migrationsFolder)) {
    console.error(`❌ Migrations folder not found at: ${migrationsFolder}`);
    process.exit(1);
  }

  const tenants = TenantRegistry.getAll();
  console.log(`Starting migration strategy for ${tenants.length} tenants...`);

  // Process sequentially to avoid aggressive connection pooling bottlenecks
  for (const tenant of tenants) {
    await migrateTenant(tenant.schemaName);
  }

  console.log(`\n🎉 Full multi-tenant provisioning lifecycle complete!`);
  process.exit(0);
}

main();
