import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnv });

const DATABASE_URL = process.env['DATABASE_URL']!;

async function main() {
  const sql = postgres(DATABASE_URL);
  
  const schemas = await sql`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
  `;
  
  let total = 0;
  for (const { schema_name } of schemas) {
    try {
      const rows = await sql.unsafe(`SELECT count(*) FROM "${schema_name}"."remedy_tree_nodes"`);
      const count = rows[0]?.['count'];
      total += Number(count || 0);
      console.log(`- ${schema_name}: ${count}`);
    } catch (e) {}
  }
  
  console.log(`\nTotal nodes: ${total}`);
  await sql.end();
}

main();
