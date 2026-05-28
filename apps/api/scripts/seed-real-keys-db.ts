import { createDbClient } from '@mmc/database';
import { encryptApiKey, maskApiKey } from '../src/infrastructure/ai/crypto.util.js';

const keys = [
  { provider: 'Google AI', label: 'Primary Gemini Key', key: 'AIzaSyA2-ePk7boLzHU3PIr3arJaS_kKBRn_1ks' },
  { provider: 'Groq', label: 'Fast Inference Groq', key: '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' },
  { provider: 'OpenRouter', label: 'OpenRouter Fallback', key: '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' },
  { provider: 'Anthropic', label: 'Claude 3.5 Sonnet/Opus', key: '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' }
];

async function seed() {
  const db = createDbClient('postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway');
  
  for (const k of keys) {
    const encryptedKey = encryptApiKey(k.key);
    const maskedKeyStr = maskApiKey(k.key);
    
    await db.execute(`
      INSERT INTO tenant_demo.ai_api_keys (tenant_id, provider, label, encrypted_key, masked_key, status, created_at, last_rotated)
      VALUES 
      ('demo', '${k.provider}', '${k.label}', '${encryptedKey}', '${maskedKeyStr}', 'active', now(), now() - interval '2 days')
      ON CONFLICT DO NOTHING;
    `);
    console.log('Seeded key for:', k.provider);
  }
  process.exit(0);
}

seed().catch(console.error);
