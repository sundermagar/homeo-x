import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../../.env') });
import { createDbClient } from '@mmc/database';
import { sql } from 'drizzle-orm';

async function main() {
  const db = createDbClient(process.env.DATABASE_URL!, 'public');
  const rows = await db.execute(sql`SELECT DISTINCT schemaname FROM pg_tables WHERE schemaname LIKE 'tenant_%' ORDER BY schemaname`);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
