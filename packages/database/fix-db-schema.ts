import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  
  const client = postgres(connectionString);

  try {
    console.log("Applying manual DDL fixes...");

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

    // 2. Add user_name to ai_request_logs
    await client`
      ALTER TABLE ai_request_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
    `;
    await client`
      ALTER TABLE ai_request_logs ADD COLUMN IF NOT EXISTS audio_seconds REAL;
    `;
    
    // 3. The API is querying "routing_rules" but the schema exports it as "ai_routing_rules".
    // Wait, the error is "column primary_model_id does not exist" on routing_rules. 
    // This means the API is still querying the old "routing_rules" table, or Drizzle schema is mapped to it.
    // Let's just add the column to routing_rules, AND create ai_routing_rules just in case.
    await client`
      ALTER TABLE ai_routing_rules ADD COLUMN IF NOT EXISTS primary_model_id TEXT;
    `;
    await client`
      ALTER TABLE ai_routing_rules ADD COLUMN IF NOT EXISTS fallback_model_id TEXT;
    `;
    await client`
      ALTER TABLE ai_routing_rules ADD COLUMN IF NOT EXISTS daily_budget_credits INTEGER;
    `;
    
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

    console.log("Successfully applied manual DDL fixes");
  } catch (error) {
    console.error("Error applying DDL:", error);
  } finally {
    await client.end();
  }
}

main();
