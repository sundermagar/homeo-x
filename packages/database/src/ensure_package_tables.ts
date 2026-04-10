import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load the root `.env` file since that's where DATABASE_URL will be
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env['DATABASE_URL'];
const tenantSchema = process.env['TENANT_SCHEMA'] || 'tenant_demo';

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  connection: { search_path: tenantSchema },
});

async function main() {
  console.log(`Ensuring Packages tables exist in schema: ${tenantSchema}...`);

  try {
    // 1. package_plans
    await sql`
      CREATE TABLE IF NOT EXISTS package_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 30,
        color_code VARCHAR(20) DEFAULT '#2563EB',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ package_plans table verified.");

    // 2. patient_packages
    await sql`
      CREATE TABLE IF NOT EXISTS patient_packages (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        regid INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        bill_id INTEGER,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ patient_packages table verified.");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    await sql.end();
    process.exit(1);
  }
}

main();
