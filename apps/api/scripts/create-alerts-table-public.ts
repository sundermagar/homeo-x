import('@mmc/database').then(async ({ createDbClient }) => {
  const db = createDbClient('postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway');
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS public.ai_budget_alerts (
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
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('Table created successfully in public schema');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}).catch(console.error);
