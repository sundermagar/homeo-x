import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

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
  console.log(`Ensuring Communication tables in schema: ${tenantSchema}...`);

  try {
    // 1. sms_templates
    await sql`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        sms_type VARCHAR(100) DEFAULT 'General',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ sms_templates table verified.");

    // 2. sms_reports
    await sql`
      CREATE TABLE IF NOT EXISTS sms_reports (
        id SERIAL PRIMARY KEY,
        regid INTEGER NOT NULL,
        phone VARCHAR(20),
        message TEXT NOT NULL,
        sms_type VARCHAR(100) NOT NULL,
        send_date VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        gateway_ref VARCHAR(255),
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ sms_reports table verified.");

    // 3. whatsapp_logs
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        regid INTEGER,
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        deep_link VARCHAR(500),
        status VARCHAR(50) DEFAULT 'sent',
        send_date VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ whatsapp_logs table verified.");

    // 4. otps
    await sql`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        deleted_at TIMESTAMP
      );
    `;
    console.log("✅ otps table verified.");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    await sql.end();
    process.exit(1);
  }
}

main();
