import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { TenantRegistry } from './tenant-registry';

// Load the root `.env` file
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

async function ensureTablesForTenant(schemaName: string) {
  console.log(`\n--- Ensuring Billing/Payment tables in schema: ${schemaName} ---`);
  
  const sqlClient = postgres(connectionString!);

  try {
    // 0. Ensure schema exists
    await sqlClient`CREATE SCHEMA IF NOT EXISTS ${sqlClient(schemaName)}`;

    // 1. bills table
    await sqlClient`
      CREATE TABLE IF NOT EXISTS ${sqlClient(schemaName + '.bills')} (
        id SERIAL PRIMARY KEY,
        regid INTEGER,
        bill_no INTEGER,
        bill_date DATE,
        charges REAL DEFAULT 0 NOT NULL,
        received REAL DEFAULT 0 NOT NULL,
        balance REAL DEFAULT 0 NOT NULL,
        payment_mode VARCHAR(50),
        treatment VARCHAR(255),
        disease VARCHAR(255),
        from_date DATE,
        to_date DATE,
        charge_id INTEGER,
        doctor_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log(`✅ bills table verified in ${schemaName}`);

    // 2. payments table
    await sqlClient`
      CREATE TABLE IF NOT EXISTS ${sqlClient(schemaName + '.payments')} (
        id SERIAL PRIMARY KEY,
        regid INTEGER,
        bill_id INTEGER,
        order_id VARCHAR(255),
        payment_id VARCHAR(255),
        signature TEXT,
        amount REAL NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
        status VARCHAR(50) NOT NULL,
        payment_mode VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log(`✅ payments table verified in ${schemaName}`);

    await sqlClient.end();
  } catch (error) {
    console.error(`❌ Error provisioning ${schemaName}:`, error);
    await sqlClient.end();
  }
}

async function main() {
  const tenants = TenantRegistry.getAll();
  console.log(`Starting dynamic provisioning for ${tenants.length} tenants...`);

  for (const tenant of tenants) {
    await ensureTablesForTenant(tenant.schemaName);
  }

  console.log("\n--- Provisioning Complete ---");
  process.exit(0);
}

main();
