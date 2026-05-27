import { Client } from 'pg';
const client = new Client("postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway");
await client.connect();
const res = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'tenant_demo'
  AND table_name = 'case_vaccins';
`);
console.log(res.rows);
await client.end();
