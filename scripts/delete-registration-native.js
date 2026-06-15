import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/homeox' });
  await client.connect();
  
  const res = await client.query(`UPDATE bills SET deleted_at = NOW() WHERE bill_type = 'Registration'`);
  console.log('Deleted Registration bills:', res.rowCount);

  await client.end();
}

run().catch(console.error);
