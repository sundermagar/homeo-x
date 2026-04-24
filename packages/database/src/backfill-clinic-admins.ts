import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  try {
    console.log('Fetching all organizations to backfill global admins...');
    const orgs = await sql`SELECT id, name, admin_email, admin_password FROM public.organizations WHERE deleted_at IS NULL`;
    
    for (const org of orgs) {
      if (!org['admin_email']) {
        console.log(`Skipping ${org['name']} (no admin email)`);
        continue;
      }

      console.log(`Processing ${org['name']} (${org['admin_email']})...`);

      // Check if already in global registry
      const [existing] = await sql`SELECT id FROM public.clinicadmins WHERE email = ${org['admin_email']} LIMIT 1`;
      
      if (existing) {
        console.log(`Admin ${org['admin_email']} already in global registry. Skipping.`);
        continue;
      }

      // Hash password (cost 10, same as MMC/StaffRepo)
      const hashedPassword = org['admin_password'] 
        ? await bcrypt.hash(org['admin_password'], 10) 
        : '';

      // Create in global registry
      await sql`
        INSERT INTO public.clinicadmins (
          name, 
          email, 
          password, 
          designation, 
          gender, 
          clinic_id,
          created_at,
          updated_at
        ) VALUES (
          ${org['name'] + ' Admin'}, 
          ${org['admin_email']}, 
          ${hashedPassword}, 
          'Clinic Administrator', 
          'Male', 
          ${org['id']},
          NOW(),
          NOW()
        )
      `;
      
      console.log(`Successfully backfilled admin for ${org['name']}.`);
    }
    console.log('Backfill completed successfully.');
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await sql.end();
  }
}

main();
