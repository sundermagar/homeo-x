import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://kreed_user:kreed_password@localhost:5432/kreed_tenant_1' });
async function test() {
  const result = await pool.query("SELECT id, name, type, is_active FROM public.users LIMIT 10");
  console.log(result.rows);
  process.exit(0);
}
test();
