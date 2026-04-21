const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => {
    console.log('Connected, adding admin_email column...');
    return c.query('ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_email" text DEFAULT \'\'');
  })
  .then(() => {
    console.log('Adding admin_password column...');
    return c.query('ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "admin_password" text DEFAULT \'\'');
  })
  .then(() => {
    console.log('Done!');
    c.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    c.end();
    process.exit(1);
  });