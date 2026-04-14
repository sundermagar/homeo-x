import { eq } from 'drizzle-orm';
import { doctorsLegacy } from '../schema/legacy/doctors';
import type { DbClient } from '../client';

export async function seedDoctorStaff(db: DbClient) {
  console.log('[Seed] Seeding Doctor Staff...');

  const doctors = [
    {
      id: 1,
      name: 'Dr. Aryan Sharma',
      title: 'Dr.',
      firstname: 'Aryan',
      surname: 'Sharma',
      qualification: 'B.H.M.S, M.D.',
      designation: 'Senior Consultant',
      gender: 'Male',
      mobile: '9876543210',
      mobile2: '',
      email: 'aryan@example.com',
      dept: 1,
      city: 'Chandigarh',
      address: 'Sector 17, Chandigarh',
      about: 'Specialist in chronic respiratory diseases.',
      dateBirth: '1985-05-15',
      dateLeft: '1990-01-01', // Legacy default for active
      salaryCur: 75000,
      consultationFee: '500'
    },
    {
      id: 2,
      name: 'Dr. Meera Iyer',
      title: 'Dr.',
      firstname: 'Meera',
      surname: 'Iyer',
      qualification: 'B.H.M.S',
      designation: 'Resident Homeopath',
      gender: 'Female',
      mobile: '8765432109',
      mobile2: '',
      email: 'meera@example.com',
      dept: 1,
      city: 'Mohali',
      address: 'Phase 7, Mohali',
      about: 'Expert in pediatric homeopathy.',
      dateBirth: '1990-08-22',
      dateLeft: '1990-01-01',
      salaryCur: 55000,
      consultationFee: '300'
    }
  ];

  for (const doc of doctors) {
    const existing = await db.select().from(doctorsLegacy).where(eq(doctorsLegacy.email, doc.email)).limit(1);
    
    if (existing.length === 0) {
      // For legacy tables with manual ID management, we need to handle NEXT ID
      // But for seeding, we can just use the provided IDs if the table is empty
      await db.insert(doctorsLegacy).values(doc as any);
      console.log(`[Seed] Created doctor: ${doc.name}`);
    } else {
      console.log(`[Seed] Doctor already exists: ${doc.name}`);
    }
  }

  console.log('[Seed] Doctor staff seeding completed.');
}
