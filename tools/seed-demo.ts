
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { 
  doctorsLegacy, 
  employeesLegacy 
} from '../packages/database/src/schema/legacy/index';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:0709@localhost:5432/homeo_x';

async function seed() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database');
    const db = drizzle(client);

    // Set search path to tenant_demo
    await client.query('SET search_path TO tenant_demo');
    console.log('Switched to schema: tenant_demo');

    // --- Seed Doctors ---
    console.log('Seeding doctors...');
    const doctors = [
      {
        id: 1,
        name: 'Dr. Aryan Sharma',
        title: 'Dr',
        firstname: 'Aryan',
        surname: 'Sharma',
        qualification: 'BHMS, MD',
        designation: 'Senior Consultant',
        gender: 'Male',
        mobile: '9876543210',
        mobile2: '',
        email: 'aryan@demo.com',
        dept: 4,
        city: 'Chandigarh',
        address: 'Sector 17, Chandigarh',
        about: 'Expert in chronic cases.',
        dateBirth: '1985-05-15',
        dateLeft: '1990-01-01',
        salaryCur: 75000,
        consultationFee: '500'
      },
      {
        id: 2,
        name: 'Dr. Meera Iyer',
        title: 'Dr. (Mrs)',
        firstname: 'Meera',
        surname: 'Iyer',
        qualification: 'BHMS',
        designation: 'Homeopathic Physician',
        gender: 'Female',
        mobile: '9876543211',
        mobile2: '',
        email: 'meera@demo.com',
        dept: 4,
        city: 'Mohali',
        address: 'Phase 7, Mohali',
        about: 'Specialist in pediatric homeopathy.',
        dateBirth: '1990-08-22',
        dateLeft: '1990-01-01',
        salaryCur: 60000,
        consultationFee: '400'
      }
    ];

    for (const doc of doctors) {
      await db.insert(doctorsLegacy).values(doc as any).onConflictDoUpdate({
        target: doctorsLegacy.id,
        set: doc as any
      });
    }

    // --- Seed Employees ---
    console.log('Seeding employees...');
    const employees = [
      {
        id: 1,
        name: 'Rahul Verma',
        designation: 'Receptionist',
        gender: 'Male',
        mobile: '9876543220',
        mobile2: '',
        email: 'rahul@demo.com',
        dept: 1,
        city: 'Zirakpur',
        address: 'VIP Road, Zirakpur',
        about: 'Front desk management.',
        dateBirth: '1995-02-10',
        dateLeft: '1990-01-01',
        salaryCur: 25000,
        packages: ''
      },
      {
        id: 2,
        name: 'Suman Gill',
        designation: 'Clinic Assistant',
        gender: 'Female',
        mobile: '9876543221',
        mobile2: '',
        email: 'suman@demo.com',
        dept: 1,
        city: 'Panchkula',
        address: 'Sector 11, Panchkula',
        about: 'Patient care assistant.',
        dateBirth: '1993-11-30',
        dateLeft: '1990-01-01',
        salaryCur: 22000,
        packages: ''
      }
    ];

    for (const emp of employees) {
      await db.insert(employeesLegacy).values(emp as any).onConflictDoUpdate({
        target: employeesLegacy.id,
        set: emp as any
      });
    }

    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await client.end();
  }
}

seed();
