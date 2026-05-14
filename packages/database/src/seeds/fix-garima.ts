import { createDbClient } from '../client.js';
import { doctorsLegacy } from '../schema/index.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function fixGarima() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }
  const db = createDbClient(dbUrl, 'tenant_demo');
  
  console.log('--- Fixing Garima in doctors table ---');
  // From previous check: User ID 40, Context ID 56
  const result = await db.update(doctorsLegacy)
    .set({ clinicId: 56 })
    .where(eq(doctorsLegacy.id, 40));
  
  console.log('Update result:', result);
  process.exit(0);
}

fixGarima().catch(console.error);
