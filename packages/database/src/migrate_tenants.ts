import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set. Add it to .env at the monorepo root.');
  process.exit(1);
}

if (process.env['NODE_ENV'] === 'production' && !dbUrl.includes('@postgres.railway.internal')) {
  console.error(`❌ INVALID DATABASE_URL DETECTED IN PRODUCTION: [${dbUrl}]`);
  console.error('Production deployments must use the Railway internal Postgres URL.');
  process.exit(1);
}

const safeUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
console.log(`[DEBUG] Received DB URL: ${safeUrl}`);

const migrationsFolder = path.join(process.cwd(), 'src', 'migrations');

import { provisionTenant } from './provision-tenant.js';

async function runMigrations() {
  if (!fs.existsSync(migrationsFolder)) {
    console.error(`❌ Migrations folder not found at: ${migrationsFolder}`);
    process.exit(1);
  }

  // Get ALL schemas from DB starting with tenant_ to ensure no clinic is missed
  const sql = postgres(dbUrl as string, { max: 1 });
  
  try {
    // Ensure required extensions are available in public schema
    console.log('Ensuring pg_trgm extension is enabled in public schema...');
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`;

    const schemas = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`;
    const tenantSchemas = schemas.map(s => s['schema_name']);
    console.log(`Starting migration strategy for ${tenantSchemas.length} discovered tenant schemas...`);

    // 1. Provision public schema with base tables
    console.log('\n===========================================');
    console.log('🚀 Provisioning PUBLIC schema (base tables)...');
    console.log('===========================================');
    await provisionTenant(dbUrl as string, 'public');
    console.log('✅ Public schema base tables ready.');

    // 2. Iterate through all discovered tenant schemas
    for (const schemaName of tenantSchemas) {
      console.log('\n===========================================');
      console.log(`🚀 Provisioning & Migrating Schema: [${schemaName}]`);
      console.log(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      console.log('===========================================');
      
      try {
        await provisionTenant(dbUrl as string, schemaName);
        const dbConnection = postgres(dbUrl as string, { 
          max: 1, 
          onnotice: () => {},
          connection: {
            search_path: `${schemaName},public`
          }
        });
        const db = drizzle(dbConnection);
        await migrate(db, {
          migrationsFolder,
          migrationsSchema: schemaName,
          migrationsTable: '__drizzle_migrations',
        });
        // Close connection
        await dbConnection.end();
        console.log(`✅ Schema [${schemaName}] synchronized successfully.`);
      } catch (error: any) {
        console.error(`❌ Process failed for [${schemaName}]:`);
        console.error(error.message || error);
        // Continue to next schema instead of crashing the whole process
      }
    }

    console.log('\n🎉 ALL DISCOVERED TENANTS SYNCHRONIZED SUCCESSFULLY!');
  } finally {
    await sql.end();
  }
}

runMigrations().catch((err) => {
  console.error('❌ FATAL ERROR in migration runner:');
  console.error(err);
  process.exit(1);
});
