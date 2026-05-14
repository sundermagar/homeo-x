import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function createTableManually() {
  const url = process.env['DATABASE_URL'];
  if (!url) return;
  const sql = postgres(url);
  
  console.log('--- Creating consent_records in tenant_demo ---');
  await sql`SET search_path TO tenant_demo`;
  
  await sql`
    CREATE TABLE IF NOT EXISTS "consent_records" (
      "id" serial PRIMARY KEY NOT NULL,
      "patient_regid" integer NOT NULL,
      "consent_type" varchar(50) NOT NULL,
      "purpose" text NOT NULL,
      "granted" boolean DEFAULT false NOT NULL,
      "granted_at" timestamp,
      "revoked_at" timestamp,
      "ip_address" varchar(45),
      "user_agent" text,
      "consent_version" integer DEFAULT 1,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;
  
  console.log('✅ Done');
  process.exit(0);
}

createTableManually().catch(console.error);
