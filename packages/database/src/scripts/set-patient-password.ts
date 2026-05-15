import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const sql = postgres(process.env['DATABASE_URL'] as string);

async function main() {
  // Find patients with email
  const rows = await sql`SELECT id, regid, first_name, surname, email, phone, mobile1 FROM tenant_demo.case_datas WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL LIMIT 5`;
  console.log('Patients with email:', JSON.stringify(rows, null, 2));

  if (rows.length > 0) {
    // Set password for the first patient
    const hash = bcrypt.hashSync('patient123', 10);
    const target = rows[0] as any;
    await sql`UPDATE tenant_demo.case_datas SET password_hash = ${hash} WHERE id = ${target['id']}`;
    console.log(`\n✅ Password set for: ${target['first_name']} ${target['surname']} (${target['email']})`);
    console.log(`   Login: email=${target['email']}, password=patient123`);
  } else {
    console.log('No patients with email found. Creating a test entry...');
    const hash = bcrypt.hashSync('patient123', 10);
    await sql`UPDATE tenant_demo.case_datas SET email = 'test@patient.com', password_hash = ${hash} WHERE id = (SELECT id FROM tenant_demo.case_datas WHERE deleted_at IS NULL LIMIT 1)`;
    console.log('✅ Set test@patient.com / patient123 on first patient record');
  }

  await sql.end();
}
main().catch(console.error);
