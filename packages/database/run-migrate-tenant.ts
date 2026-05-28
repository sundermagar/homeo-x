import postgres from 'postgres';

const dbUrl = 'postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway';

async function main() {
  const sql = postgres(dbUrl, { max: 1 });

  try {
    console.log('Creating AI Ops tables directly in tenant_demo schema...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_request_logs (
        id serial PRIMARY KEY,
        tenant_id text NOT NULL,
        user_id text NOT NULL,
        session_id text,
        feature text NOT NULL,
        model_id text NOT NULL,
        provider_id text NOT NULL,
        is_fallback boolean DEFAULT false,
        input_tokens integer DEFAULT 0,
        output_tokens integer DEFAULT 0,
        audio_minutes real,
        credits_deducted integer DEFAULT 0,
        cost_inr real DEFAULT 0,
        prompt_text text,
        response_text text,
        latency_ms integer,
        status text NOT NULL,
        error_code text,
        created_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_credit_wallets (
        id serial PRIMARY KEY,
        tenant_id text NOT NULL UNIQUE,
        total_allocated integer DEFAULT 0,
        consumed integer DEFAULT 0,
        cycle_start timestamp NOT NULL,
        cycle_end timestamp NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_credit_transactions (
        id serial PRIMARY KEY,
        tenant_id text NOT NULL,
        type text NOT NULL,
        amount integer NOT NULL,
        balance_after integer,
        description text,
        reference_id text,
        created_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_model_registry (
        id text PRIMARY KEY,
        provider text NOT NULL,
        display_name text NOT NULL,
        context_window integer,
        cost_per_input_token real,
        cost_per_output_token real,
        status text DEFAULT 'active',
        capabilities jsonb,
        created_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_routing_rules (
        id serial PRIMARY KEY,
        tenant_id text NOT NULL,
        feature text NOT NULL,
        primary_model text NOT NULL,
        fallback_models jsonb DEFAULT '[]'::jsonb,
        budget_daily integer,
        budget_monthly integer,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_demo.ai_api_keys (
        id serial PRIMARY KEY,
        tenant_id text NOT NULL,
        provider text NOT NULL,
        label text NOT NULL,
        encrypted_key text NOT NULL,
        masked_key text NOT NULL,
        expires_at timestamp,
        status text DEFAULT 'active',
        last_rotated timestamp,
        created_by text,
        created_at timestamp DEFAULT now()
      );
    `;

    console.log('Successfully created AI Ops tables!');
  } catch (err) {
    console.error('Failed to create tables:', err);
  } finally {
    await sql.end();
  }
  process.exit(0);
}

main();
