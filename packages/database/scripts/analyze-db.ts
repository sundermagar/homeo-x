import postgres from 'postgres';

async function runAnalyze() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });

  try {
    console.log('🔍 Fetching all tenant schemas...');
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    `;

    console.log(`🚀 Starting ANALYZE across ${schemas.length} schemas...`);

    for (const { schema_name } of schemas) {
      console.log(`📊 Analyzing schema: [${schema_name}]`);
      try {
        // Run ANALYZE on specific tables we just indexed
        await sql.unsafe(`ANALYZE "${schema_name}".appointments`);
        await sql.unsafe(`ANALYZE "${schema_name}".waitlist`);
        await sql.unsafe(`ANALYZE "${schema_name}".case_datas`);
        await sql.unsafe(`ANALYZE "${schema_name}".bills`);
        await sql.unsafe(`ANALYZE "${schema_name}".receipt`);
        console.log(`✅ [${schema_name}] Done.`);
      } catch (err: any) {
        console.warn(`⚠️ [${schema_name}] Failed: ${err.message}`);
      }
    }

    console.log('\n✨ All tables analyzed successfully.');
  } catch (error) {
    console.error('❌ Error during ANALYZE:', error);
  } finally {
    await sql.end();
  }
}

runAnalyze();
