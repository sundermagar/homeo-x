import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { TenantRegistry } from './tenant-registry';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

async function fixTenant(schemaName: string) {
  console.log(`\n--- Fixing Payments Schema for: ${schemaName} ---`);
  
  const sqlClient = postgres(connectionString!);

  try {
    // Check if table exists
    const [tableExists] = await sqlClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${schemaName} AND table_name = 'payments'
      );
    `;

    if (!tableExists || !tableExists['exists']) {
      console.log(`payments table does not exist in ${schemaName}, skipping...`);
      return;
    }

    // Alter column types, casting text to integer/timestamp safely
    await sqlClient`
      ALTER TABLE ${sqlClient(schemaName + '.payments')}
      ALTER COLUMN regid TYPE integer USING CASE WHEN regid::text ~ '^[0-9]+$' THEN regid::text::integer ELSE NULL END,
      ALTER COLUMN payment_date TYPE timestamp without time zone USING CASE 
        WHEN payment_date::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN payment_date::text::timestamp without time zone 
        ELSE NULL 
      END;
    `;
    
    console.log(`✅ fixed regid and payment_date in ${schemaName}`);
  } catch (error: any) {
    console.error(`❌ Error fixing ${schemaName}:`);
    console.error(error.message);
  } finally {
    await sqlClient.end();
  }
}

async function main() {
  const tenants = TenantRegistry.getAll();
  console.log(`Starting schema fix for ${tenants.length} tenants...`);

  for (const tenant of tenants) {
    await fixTenant(tenant.schemaName);
  }

  console.log("\n--- Fix Complete ---");
  process.exit(0);
}

main();
