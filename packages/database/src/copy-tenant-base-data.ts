import postgres from 'postgres';

export async function copyTenantBaseData(dbUrl: string, targetSchema: string) {
  console.log(`[Provisioning] Copying base configuration data from demo to ${targetSchema}...`);
  const sql = postgres(dbUrl, { max: 1 });
  
  const tablesToCopy = [
    'daycharges',
    'expenseshead',
    'potencies',
    'potencies1',
    'remedy_tree_nodes',
    'remedy_alternatives',
    'clinical_codes',
    'vaccines'
  ];

  for (const table of tablesToCopy) {
    try {
      // Disable triggers temporarily to avoid FK issues
      await sql.unsafe(`ALTER TABLE "${targetSchema}"."${table}" DISABLE TRIGGER ALL`);
      
      // Clear target table first
      await sql.unsafe(`TRUNCATE TABLE "${targetSchema}"."${table}" RESTART IDENTITY CASCADE`);
      
      // Get columns to avoid inserting into generated columns
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'tenant_demo' AND table_name = ${table}
          AND is_generated = 'NEVER'
      `;
      const colNames = columns.map((c: any) => `"${c.column_name}"`).join(', ');

      if (colNames) {
        await sql.unsafe(`
          INSERT INTO "${targetSchema}"."${table}" (${colNames})
          SELECT ${colNames} FROM "tenant_demo"."${table}"
        `);
      } else {
        await sql.unsafe(`
          INSERT INTO "${targetSchema}"."${table}"
          SELECT * FROM "tenant_demo"."${table}"
        `);
      }
      
      // Re-enable triggers
      await sql.unsafe(`ALTER TABLE "${targetSchema}"."${table}" ENABLE TRIGGER ALL`);

      // Sync sequences
      try {
        await sql.unsafe(`
          SELECT setval(
            pg_get_serial_sequence('"${targetSchema}"."${table}"', 'id'), 
            (SELECT COALESCE(MAX(id), 1) FROM "${targetSchema}"."${table}")
          )
        `);
      } catch (seqErr: any) {
        // Ignored, table might not have a sequence
      }

      console.log(`✅ Copied base data for ${table} to ${targetSchema}`);
    } catch (err: any) {
      console.error(`❌ Failed to copy ${table} to ${targetSchema}: ${err.message}`);
    }
  }
  await sql.end();
}
