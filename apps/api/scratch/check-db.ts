import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function check() {
  const { Client } = pg;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to:', process.env.DATABASE_URL?.replace(/:[^:]+@/, ':****@'));
    await client.connect();
    console.log('Connected successfully');

    const schemas = await client.query("SELECT schema_name FROM information_schema.schemata");
    console.log('Schemas:', schemas.rows.map(r => r.schema_name).join(', '));

    const demoTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'tenant_demo'");
    console.log('Tables in tenant_demo:', demoTables.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.end();
  }
}

check();
