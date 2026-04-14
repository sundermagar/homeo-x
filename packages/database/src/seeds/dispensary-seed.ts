import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { dispensaries } from '../schema/settings';

export async function seedDispensaries(db: DbClient) {
  console.log('[Seed] Seeding Dispensaries...');

  const initialDispensaries = [
    {
      name: 'City Health Clinic',
      location: 'Zirakpur Main Market',
      city: 'Zirakpur',
      mobile: '9876543210',
      email: 'zirakpur@homeox.com',
      gender: 'Male',
      designation: 'Main Branch'
    },
    {
      name: 'Sunrise Homeopathy',
      location: 'Sector 17',
      city: 'Chandigarh',
      mobile: '9888877777',
      email: 'chd@homeox.com',
      gender: 'Female',
      designation: 'Aesthetic Center'
    },
    {
      name: 'Metro Wellness Center',
      location: 'Connaught Place',
      city: 'Delhi',
      mobile: '9999911111',
      email: 'delhi@homeox.com',
      gender: 'Male',
      designation: 'Regional Hub'
    },
    {
      name: 'Nature Cure Dispensary',
      location: 'Andheri West',
      city: 'Mumbai',
      mobile: '9123456789',
      email: 'mumbai@homeox.com',
      gender: 'Female',
      designation: 'Ayurvedic & Homeo'
    }
  ];

  for (const dispensary of initialDispensaries) {
    const existing = await db.select().from(dispensaries).where(eq(dispensaries.email, dispensary.email || '')).limit(1);
    if (existing.length === 0) {
      await db.insert(dispensaries).values(dispensary);
      console.log(`[Seed] Created dispensary: ${dispensary.name}`);
    } else {
      console.log(`[Seed] Dispensary already exists: ${dispensary.name}`);
    }
  }

  console.log('[Seed] Dispensary seeding completed.');
}
