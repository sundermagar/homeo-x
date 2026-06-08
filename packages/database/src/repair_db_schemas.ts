import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

// All WhatsApp/AI tables to ensure exist
const WA_TABLES = [
  {
    name: 'wa_contacts',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_contacts" (
      "id" serial PRIMARY KEY,
      "clinic_id" integer,
      "phone" varchar(20) NOT NULL,
      "name" varchar(200),
      "email" varchar(200),
      "tags" jsonb DEFAULT '[]'::jsonb,
      "metadata" jsonb DEFAULT '{}'::jsonb,
      "status" text DEFAULT 'active',
      "created_at" timestamp DEFAULT NOW() NOT NULL,
      "updated_at" timestamp DEFAULT NOW() NOT NULL,
      CONSTRAINT "wa_contact_phone_clinic_unique_{{SCHEMA}}" UNIQUE("phone", "clinic_id")
    )`,
  },
  {
    name: 'wa_contact_groups',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_contact_groups" (
      "id" serial PRIMARY KEY,
      "clinic_id" integer,
      "name" text NOT NULL,
      "description" text,
      "created_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_contact_group_members',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_contact_group_members" (
      "id" serial PRIMARY KEY,
      "contact_id" integer REFERENCES "{{SCHEMA}}"."wa_contacts"("id") ON DELETE CASCADE,
      "group_id" integer REFERENCES "{{SCHEMA}}"."wa_contact_groups"("id") ON DELETE CASCADE
    )`,
  },
  {
    name: 'wa_media',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_media" (
      "id" serial PRIMARY KEY,
      "clinic_id" integer,
      "name" text NOT NULL,
      "media_id" text,
      "type" text NOT NULL,
      "mime_type" text,
      "url" text,
      "size" integer,
      "created_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_chatbots',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_chatbots" (
      "id" serial PRIMARY KEY,
      "clinic_id" integer,
      "uuid" text NOT NULL UNIQUE,
      "title" text NOT NULL,
      "welcome_message" text,
      "instructions" text,
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT NOW() NOT NULL,
      "updated_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_training_data',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_training_data" (
      "id" serial PRIMARY KEY,
      "chatbot_id" integer REFERENCES "{{SCHEMA}}"."wa_chatbots"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "title" text,
      "content" text,
      "metadata" jsonb,
      "created_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_ai_settings',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_ai_settings" (
      "id" serial PRIMARY KEY,
      "channel_id" integer REFERENCES "{{SCHEMA}}"."wa_channels"("id") ON DELETE CASCADE,
      "provider" text NOT NULL DEFAULT 'openai',
      "api_key" text NOT NULL,
      "model" text NOT NULL DEFAULT 'gpt-4o-mini',
      "endpoint" text DEFAULT 'https://api.openai.com/v1',
      "temperature" text DEFAULT '0.7',
      "max_tokens" text DEFAULT '500',
      "is_active" boolean DEFAULT false,
      "trigger_words" jsonb DEFAULT '[]'::jsonb,
      "system_prompt" text,
      "escalation_rules" jsonb DEFAULT '{}'::jsonb,
      "response_config" jsonb DEFAULT '{"tone":"Friendly","length":"Medium (~200 words)","fallback":"I''m sorry, I don''t have the information you''re looking for."}'::jsonb,
      "train_from_kb" boolean DEFAULT false,
      "created_at" timestamp DEFAULT NOW() NOT NULL,
      "updated_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_training_sources',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_training_sources" (
      "id" serial PRIMARY KEY,
      "channel_id" integer REFERENCES "{{SCHEMA}}"."wa_channels"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "name" text NOT NULL,
      "url" text,
      "content" text,
      "status" text NOT NULL DEFAULT 'pending',
      "error_message" text,
      "chunk_count" integer DEFAULT 0,
      "created_at" timestamp DEFAULT NOW() NOT NULL,
      "updated_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_training_chunks',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_training_chunks" (
      "id" serial PRIMARY KEY,
      "source_id" integer NOT NULL REFERENCES "{{SCHEMA}}"."wa_training_sources"("id") ON DELETE CASCADE,
      "channel_id" integer REFERENCES "{{SCHEMA}}"."wa_channels"("id") ON DELETE CASCADE,
      "content" text NOT NULL,
      "embedding" jsonb,
      "metadata" jsonb DEFAULT '{}'::jsonb,
      "created_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
  {
    name: 'wa_training_qa_pairs',
    ddl: `CREATE TABLE IF NOT EXISTS "{{SCHEMA}}"."wa_training_qa_pairs" (
      "id" serial PRIMARY KEY,
      "channel_id" integer REFERENCES "{{SCHEMA}}"."wa_channels"("id") ON DELETE CASCADE,
      "question" text NOT NULL,
      "answer" text NOT NULL,
      "category" text DEFAULT 'general',
      "embedding" jsonb,
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT NOW() NOT NULL,
      "updated_at" timestamp DEFAULT NOW() NOT NULL
    )`,
  },
];

async function main() {
  console.log('🔌 Connecting to database...');
  const sql = postgres(dbUrl as string, { max: 5 });

  try {
    // 1. Fetch all schemas from the database
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    `.then((rows) => rows.map((r) => r['schema_name']));

    console.log(`🔍 Discovered ${schemas.length} schemas to repair.`);

    for (const schema of schemas) {
      console.log(`\n===========================================`);
      console.log(`🛠️  Repairing schema: [${schema}]`);
      console.log(`===========================================`);

      // A. Create all missing tables
      for (const table of WA_TABLES) {
        try {
          const ddl = table.ddl.replace(/\{\{SCHEMA\}\}/g, schema);
          await sql.unsafe(ddl);
          console.log(`  ✅ Table ensured: [${schema}.${table.name}]`);
        } catch (err: any) {
          console.error(`  ❌ Error ensuring table [${table.name}]:`, err.message);
        }
      }

      // B. Ensure columns and schema alignment in wa_ai_settings
      try {
        console.log(`  🔨 Aligning columns for [${schema}.wa_ai_settings]...`);

        await sql.unsafe(`
          ALTER TABLE "${schema}"."wa_ai_settings" 
          ADD COLUMN IF NOT EXISTS "response_config" jsonb DEFAULT '{"tone":"Friendly","length":"Medium (~200 words)","fallback":"I''m sorry, I don''t have the information you''re looking for."}'::jsonb,
          ADD COLUMN IF NOT EXISTS "train_from_kb" boolean DEFAULT false
        `);
        console.log(`    ✅ wa_ai_settings columns response_config & train_from_kb aligned.`);
      } catch (err: any) {
        console.error(`    ❌ Error aligning wa_ai_settings columns:`, err.message);
      }

      // C. Ensure metadata and channel_id in wa_training_chunks
      try {
        console.log(`  🔨 Aligning columns for [${schema}.wa_training_chunks]...`);

        await sql.unsafe(`
          ALTER TABLE "${schema}"."wa_training_chunks" 
          ADD COLUMN IF NOT EXISTS "channel_id" integer REFERENCES "${schema}"."wa_channels"(id) ON DELETE CASCADE,
          ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb
        `);
        console.log(`    ✅ wa_training_chunks columns aligned.`);
      } catch (err: any) {
        console.error(`    ❌ Error aligning wa_training_chunks columns:`, err.message);
      }
    }

    console.log('\n✨ Database schema repair complete across all tenant schemas!');
  } catch (err: any) {
    console.error('❌ Critical system error during repair:', err.message);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
