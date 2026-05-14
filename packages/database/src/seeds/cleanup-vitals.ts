import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function cleanupVitals() {
  const url = process.env['DATABASE_URL'];
  if (!url) return;
  const sql = postgres(url);
  
  console.log('--- Cleaning up duplicates in tenant_demo.vitals ---');
  
  // Find all duplicates
  const duplicates = await sql`
    SELECT visit_id 
    FROM tenant_demo.vitals 
    WHERE visit_id IS NOT NULL
    GROUP BY visit_id 
    HAVING count(*) > 1
  `;
  
  console.log(`Found ${duplicates.length} visit_ids with duplicates.`);
  
  for (const dup of duplicates) {
    const visitId = dup['visit_id'];
    // Keep the one with highest ID
    const rows = await sql`
      SELECT id FROM tenant_demo.vitals 
      WHERE visit_id = ${visitId} 
      ORDER BY id DESC
    `;
    
    const idsToDelete = rows.slice(1).map(r => r['id'] as number);
    if (idsToDelete.length > 0) {
      console.log(`Deleting duplicates for visit_id ${visitId}: IDs ${idsToDelete.join(', ')}`);
      await sql`
        DELETE FROM tenant_demo.vitals 
        WHERE id IN ${sql(idsToDelete)}
      `;
    }
  }
  
  console.log('✅ Cleanup complete.');
  process.exit(0);
}

cleanupVitals().catch(console.error);
