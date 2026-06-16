const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/homeo_x' });
async function run() {
  const res = await pool.query("SELECT id, patient_id, doctor_id, assistant_doctor, booking_date FROM tenant_demo.appointments WHERE booking_date = '2026-06-15'");
  console.log('Appointments today:', res.rows);
  const docs = await pool.query("SELECT id, name FROM tenant_demo.doctors");
  console.log('Doctors:', docs.rows);
  const users = await pool.query("SELECT id, name FROM tenant_demo.users WHERE type IN ('Doctor', 'doctor')");
  console.log('Users:', users.rows);
  process.exit(0);
}
run();
