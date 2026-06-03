import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const sql = postgres(dbUrl as string, { max: 1 });
  
  const tables = ['wa_ai_settings', 'wa_chatbots', 'wa_training_sources', 'wa_training_chunks', 'wa_training_qa_pairs'];
  
  for (const table of tables) {
    console.log(`\n=== Columns in tenant_demo.${table} ===`);
    try {
      const columns = await sql`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'tenant_demo' AND table_name = ${table}
        ORDER BY ordinal_position
      `;
      console.log(columns);
    } catch (err: any) {
      console.error(`Error fetching columns for ${table}:`, err.message);
    }
  }

  await sql.end();
}

main().catch(console.error);
