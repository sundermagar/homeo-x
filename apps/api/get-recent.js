import { createDbClient } from '../../packages/database/dist/client.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
async function getRecent() {
  const dbMain = createDbClient(process.env.DATABASE_URL, 'public');
  const schemasRes = await dbMain.rawClient`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_toast', 'pg_catalog', 'information_schema')`;
  const schemas = schemasRes.map(r => r.schema_name);
  for (const s of schemas) {
    try {
      const db = createDbClient(process.env.DATABASE_URL, s);
      const res = await db.rawClient`SELECT id, patient_name, booking_date, status, updated_at FROM appointments ORDER BY updated_at DESC NULLS LAST LIMIT 1`;
      if (res.length > 0) {
        console.log(`Schema ${s} most recently updated:`, res[0]);
      }
    } catch(e) {}
  }
  process.exit(0);
}
getRecent();
