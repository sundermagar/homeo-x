import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  try {
    console.log('Updating legacy organizations with administrator emails...');
    
    // Vismedicos
    await sql`
      UPDATE public.organizations 
      SET admin_email = 'vis@kreed.health', admin_password = 'password123'
      WHERE name ILIKE '%vismedicos%'
    `;
    
    // Aman Medical
    await sql`
      UPDATE public.organizations 
      SET admin_email = 'aman@kreed.health', admin_password = 'password123'
      WHERE name ILIKE '%amanmedical%' OR name ILIKE '%aman medical%'
    `;
    
    console.log('Successfully updated organization admin fields.');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
