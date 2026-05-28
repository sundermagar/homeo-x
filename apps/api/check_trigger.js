import { Client } from 'pg';
const client = new Client("postgresql://postgres:kUaJUiAKeechYXrdvXJObGHNMRDNUusL@shinkansen.proxy.rlwy.net:26313/railway");
await client.connect();
const res = await client.query(`
  SELECT trigger_name, action_statement
  FROM information_schema.triggers
  WHERE event_object_table = 'case_vaccins';
`);
console.log(res.rows);
await client.end();
