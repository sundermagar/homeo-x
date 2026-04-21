import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function patch() {
  const schemas = ['tenant_vismedicos', 'tenant_amanmedical'];

  for (const schema of schemas) {
    console.log(`Patching FAQ table in ${schema}...`);
    try {
      // Add missing columns if they don't exist
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ADD COLUMN IF NOT EXISTS "name" text`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ADD COLUMN IF NOT EXISTS "detail" text`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`);
      
      // Fix constraints and set defaults
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ALTER COLUMN "ques" SET NOT NULL`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ALTER COLUMN "ans" SET NOT NULL`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ALTER COLUMN "deleted_at" DROP NOT NULL`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ALTER COLUMN "created_at" SET DEFAULT now()`);
      await sql.unsafe(`ALTER TABLE ${schema}.faqs ALTER COLUMN "updated_at" SET DEFAULT now()`);
      
      console.log(`✅ Patch success for ${schema}`);
    } catch (e: any) {
      console.error(`❌ Patch failed for ${schema}: ${e.message}`);
    }
  }

  await sql.end();
}

patch();
