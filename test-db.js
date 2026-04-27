import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/cre_development' });
pool.query("SELECT id, name, type, role_id FROM demo.users WHERE name ILIKE '%aman%'", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
