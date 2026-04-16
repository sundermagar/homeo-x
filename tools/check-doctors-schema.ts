import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function checkDoctorsSchema() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Set search path to tenant_demo
    await client.query('SET search_path TO tenant_demo');
    console.log('Switched to schema: tenant_demo');

    // Get column information for doctors table
    const res = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'tenant_demo'
      AND table_name = 'doctors'
      ORDER BY ordinal_position
    `);

    console.log(`\nDoctors table columns in tenant_demo schema (${res.rowCount} columns):`);
    console.log('='.repeat(80));
    res.rows.forEach(row => {
      console.log(`- ${row.column_name.padEnd(30)} | ${row.data_type.padEnd(15)} | NULL: ${row.is_nullable.padEnd(5)} | Default: ${row.column_default || 'none'}`);
    });
    console.log('='.repeat(80));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDoctorsSchema();
