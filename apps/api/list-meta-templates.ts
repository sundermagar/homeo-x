import * as dotenv from 'dotenv';
import * as path from 'path';
import { createDbClient } from '@mmc/database';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });

async function main() {
  const db = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');

  console.log('Fetching WABA credentials from wa_channels...');
  const channels = await db.execute(sql`
    SELECT id, phone_number_id, access_token, whatsapp_business_account_id, name FROM wa_channels WHERE is_active = true LIMIT 1
  `);

  if (channels.length === 0) {
    console.error('❌ No active WhatsApp channel found in wa_channels.');
    return;
  }

  const channel = channels[0] as any;
  const accessToken = channel.access_token || process.env.WHATSAPP_TOKEN;
  const wabaId = channel.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.META_API_VERSION || 'v22.0';

  console.log(`Using WABA ID: ${wabaId}`);
  console.log(`Using API Version: ${apiVersion}`);

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?limit=100`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('❌ Failed to fetch templates from Meta:', data);
    return;
  }

  console.log('\n================ META TEMPLATES ================');
  console.log(JSON.stringify(data.data || [], null, 2));
}

main().catch(console.error);
