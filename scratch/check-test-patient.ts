import { PatientRepositoryPg } from './apps/api/src/infrastructure/repositories/patient.repository.pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // Set schema to demo for search
    await client.query('SET search_path TO tenant_demo, public');
    const res = await client.query('SELECT * FROM case_datas ORDER BY regid DESC LIMIT 5');
    console.log('Last 5 patients:', res.rows.map(r => ({ regid: r.regid, name: r.first_name + ' ' + r.surname })));
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
