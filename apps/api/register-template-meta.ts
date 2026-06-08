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

  if (!accessToken || !wabaId) {
    console.error('❌ Missing WhatsApp Token or WABA ID in database and .env');
    return;
  }

  console.log(`Using WABA ID: ${wabaId}`);
  console.log(`Using API Version: ${apiVersion}`);
  console.log(`Token (first 15 chars): ${accessToken.substring(0, 15)}...`);

  // Define template payload
  const templateName = 'thank_you_for_reference_v3';

  console.log(`\nDeleting existing template "${templateName}" from Meta...`);
  const deleteUrl = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${templateName}`;
  const deleteResponse = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const deleteData = (await deleteResponse.json()) as any;
  console.log('Delete Response:', JSON.stringify(deleteData, null, 2));

  const body = {
    name: templateName,
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, thank you for referring {{2}} to us. We appreciate your trust and support.',
        example: {
          body_text: [['Ramesh Kumar', 'MMC HomeoTech']],
        },
      },
    ],
  };

  console.log(`\nRegistering template "${templateName}" on Meta WABA...`);
  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as any;
  console.log(`Response Status: ${response.status} ${response.statusText}`);
  console.log('Response Body:', JSON.stringify(data, null, 2));

  if (response.ok) {
    console.log(`\n✅ Template "${templateName}" registered successfully on Meta!`);
    console.log(`Update template status in database...`);
    await db.execute(sql`
      UPDATE wa_templates
      SET name = ${templateName}, whatsapp_template_id = ${data.id || 'registered'}, status = 'approved', body = 'Hello {{1}}, thank you for referring {{2}} to us. We appreciate your trust and support.'
      WHERE name = 'thank_you_for_reference' OR name = ${templateName}
    `);
    console.log('✅ Local database updated successfully.');
  } else {
    console.error(`\n❌ Failed to register template on Meta.`);
    if (data.error?.message?.includes('already exists')) {
      console.log(
        'It seems the template already exists on Meta but is not updated in our local database.',
      );
      console.log('Updating local status to approved...');
      await db.execute(sql`
        UPDATE wa_templates
        SET name = ${templateName}, status = 'approved', body = 'Hello {{1}}, thank you for referring {{2}} to us. We appreciate your trust and support.'
        WHERE name = 'thank_you_for_reference' OR name = ${templateName}
      `);
      console.log('✅ Local database status updated to approved.');
    }
  }
}

main().catch(console.error);
