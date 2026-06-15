import { createDbClient } from '../../packages/database/dist/client.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
async function fixAllDates() {
  const dbMain = createDbClient(process.env.DATABASE_URL, 'public');
  const schemasRes = await dbMain.rawClient`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_toast', 'pg_catalog', 'information_schema')`;
  const schemas = schemasRes.map(r => r.schema_name);
  let fixedCount = 0;
  for (const s of schemas) {
    try {
      const db = createDbClient(process.env.DATABASE_URL, s);
      const res = await db.rawClient`SELECT id, booking_date FROM appointments WHERE booking_date NOT LIKE '202%'`;
      for (const row of res) {
        let d = row.booking_date;
        if (!d) continue;
        let newDate = null;
        if (d.includes('/')) {
          const p = d.split('/');
          if (p.length === 3) newDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        } else if (d.includes('-')) {
          const p = d.split('-');
          if (p.length === 3 && p[0].length !== 4) newDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }
        if (newDate) {
          await db.rawClient`UPDATE appointments SET booking_date = ${newDate} WHERE id = ${row.id}`;
          fixedCount++;
          console.log(`Fixed ${row.id}: ${d} -> ${newDate} in ${s}`);
        }
      }
    } catch(e) {}
  }
  console.log('Total Fixed:', fixedCount);
  process.exit(0);
}
fixAllDates();
