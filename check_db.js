import { Client } from 'pg';
const client = new Client("postgres://postgres:postgres@localhost:5432/homeox");
await client.connect();
const res = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'tenant_demo'
  AND table_name = 'case_vaccins';
`);
console.log(res.rows);
await client.end();
