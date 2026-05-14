import { createDbClient } from '../client.js';
import { doctorsLegacy, users } from '../schema/index.js';
import { isNull, eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function fixAllDoctors() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) return;
  const db = createDbClient(dbUrl, 'tenant_demo');
  
  console.log('--- Checking for doctors with missing clinic_id ---');
  const docs = await db.select({
    id: doctorsLegacy.id,
    name: doctorsLegacy.name,
    userContextId: users.contextId
  })
  .from(doctorsLegacy)
  .leftJoin(users, eq(doctorsLegacy.id, users.id))
  .where(isNull(doctorsLegacy.clinicId));

  console.log(`Found ${docs.length} doctors with missing clinic_id`);

  for (const doc of docs) {
    if (doc.userContextId) {
      console.log(`Fixing ${doc.name} (ID: ${doc.id}) -> Clinic ID: ${doc.userContextId}`);
      await db.update(doctorsLegacy)
        .set({ clinicId: doc.userContextId })
        .where(eq(doctorsLegacy.id, doc.id));
    }
  }
  
  process.exit(0);
}

fixAllDoctors().catch(console.error);
