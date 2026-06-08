import * as dotenv from 'dotenv';
import * as path from 'path';
import { createDbClient } from '@mmc/database';
import { sql } from 'drizzle-orm';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });

async function main() {
  const db = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');

  console.log(
    'Updating database template thank_you_for_reference to thank_you_for_reference_v3...',
  );
  await db.execute(sql`
    UPDATE wa_templates
    SET name = 'thank_you_for_reference_v3',
        whatsapp_template_id = '2017459985832042',
        status = 'approved',
        body = 'Hello {{1}}, thank you for referring {{2}} to us. We appreciate your trust and support.'
    WHERE id = 17
  `);

  console.log('✅ Local database updated successfully.');
}

main().catch(console.error);
