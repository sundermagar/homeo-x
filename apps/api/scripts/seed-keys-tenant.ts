import('@mmc/database').then(async ({ createDbClient }) => {
  const db = createDbClient('postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway');
  try {
    await db.execute(`
      INSERT INTO tenant_demo.ai_api_keys (tenant_id, provider, label, encrypted_key, masked_key, status, created_at, last_rotated)
      VALUES 
      ('demo', 'openai', 'Production GPT-4', 'enc_xxx123', 'sk-...xYzA', 'active', now(), now() - interval '30 days'),
      ('demo', 'anthropic', 'Claude 3 Opus Key', 'enc_yyy456', 'sk-ant-...aBcD', 'active', now(), now() - interval '15 days')
      ON CONFLICT DO NOTHING;
    `);
    console.log('Seeded API keys in tenant_demo schema');
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}).catch(console.error);
