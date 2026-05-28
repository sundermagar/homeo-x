import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

// ensure we grab from the root .env
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  
  const client = postgres(connectionString);

  try {
    console.log("Applying manual DDL fixes to ALL tenant schemas...");

    const schemas = await client`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'`;
    
    for (const row of schemas) {
      const schemaName = row.schema_name;
      console.log(`\n=== Migrating schema: ${schemaName} ===`);
      
      // We must execute the DDL explicitly targeting the schema or setting search_path
      await client`SET search_path TO ${client(schemaName)}, public`;

      // 1. Create ai_tenant_wallets if it does not exist
      await client`
        CREATE TABLE IF NOT EXISTS ai_tenant_wallets (
          id SERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL UNIQUE,
          balance_credits INTEGER DEFAULT 0,
          balance_inr REAL DEFAULT 0,
          total_credits_this_cycle INTEGER DEFAULT 0,
          cycle_start_day INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          last_topup_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // 2. Comprehensive add columns to ai_request_logs
      const requestLogCols = [
        'user_name TEXT', 'session_id TEXT', 'model_name TEXT', 'is_fallback BOOLEAN',
        'audio_seconds REAL', 'prompt_text TEXT', 'response_text TEXT',
        'latency_ms INTEGER', 'error_code TEXT', 'error_message TEXT'
      ];
      for (const col of requestLogCols) {
        try { await client`ALTER TABLE ai_request_logs ADD COLUMN IF NOT EXISTS ${client.unsafe(col)}`; } catch(e) {}
      }
      
      // 3. Create or Alter ai_routing_rules
      await client`
        CREATE TABLE IF NOT EXISTS ai_routing_rules (
          id SERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          feature TEXT NOT NULL,
          primary_model_id TEXT NOT NULL,
          fallback_model_id TEXT,
          daily_budget_credits INTEGER,
          monthly_budget_credits INTEGER,
          max_tokens_per_call INTEGER,
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      const routingCols = [
        'primary_model_id TEXT', 'fallback_model_id TEXT', 'daily_budget_credits INTEGER',
        'monthly_budget_credits INTEGER', 'max_tokens_per_call INTEGER', 'is_enabled BOOLEAN'
      ];
      for (const col of routingCols) {
        try { await client`ALTER TABLE ai_routing_rules ADD COLUMN IF NOT EXISTS ${client.unsafe(col)}`; } catch(e) {}
        try { await client`ALTER TABLE routing_rules ADD COLUMN IF NOT EXISTS ${client.unsafe(col)}`; } catch(e) {}
      }

      // Create ai_budget_alerts
      await client`
        CREATE TABLE IF NOT EXISTS ai_budget_alerts (
          id SERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          type TEXT NOT NULL,
          threshold INTEGER,
          in_app BOOLEAN DEFAULT true,
          email BOOLEAN DEFAULT false,
          sms BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      console.log(`Schema ${schemaName} updated successfully.`);
    }

    console.log("\nSuccessfully applied manual DDL fixes to all schemas!");
  } catch (error) {
    console.error("Error applying DDL:", error);
  } finally {
    await client.end();
  }
}

main();
