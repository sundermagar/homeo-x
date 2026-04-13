const { createClient } = require('redis');
async function test() {
  const client = createClient();
  await client.connect();
  await client.flushAll();
  process.exit(0);
}
test();
