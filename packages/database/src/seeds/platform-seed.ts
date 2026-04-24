import { organizations, accounts } from '../schema/platform';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';

export async function seedPlatform(db: DbClient) {
  console.log('[Seed] Seeding platform data (public schema)...');

  const demoClinics = [
    {
      name: 'Global Homeopathy Center',
      email: 'contact@globalhomeo.com',
      phone: '+91 98765-43210',
      address: '123 Health Ave, Chandigarh',
      city: 'Chandigarh',
      website: 'www.globalhomeo.com',
      description: 'A premium homeopathic care center specializing in chronic ailments.',
    },
    {
      name: 'Wellness Integrative Clinic',
      email: 'info@wellnessclinic.in',
      phone: '+91 98123-45678',
      address: '45 Lotus Tower, Zirakpur',
      city: 'Zirakpur',
      website: 'www.wellnessclinic.in',
      description: 'Integrative health solutions combining homeopathy with nutrition.',
    },
    {
      name: 'Apollo Homeo Care',
      email: 'panchkula@apollohomeo.com',
      phone: '+91 99887-76655',
      address: 'Sector 7, Panchkula',
      city: 'Panchkula',
      website: 'www.apollohomeo.com',
      description: 'Leading name in research-based homeopathic treatment.',
    },
    {
      name: 'Sunrise Family Clinic',
      email: 'hello@sunrisehomeo.com',
      phone: '+91 90000-11111',
      address: 'Phase 7, Mohali',
      city: 'Mohali',
      website: 'www.sunrisehomeo.com',
      description: 'Dedicated family homeopathic services since 1995.',
    },
    {
      name: 'Elite Homeopaths',
      email: 'admin@elitehomeo.com',
      phone: '+91 88888-99999',
      address: 'Mall Road, Shimla',
      city: 'Shimla',
      website: 'www.elitehomeo.com',
      description: 'Specialized clinic for severe pediatric and skin conditions.',
    }
  ];

  // Common hashed password: password123
  const hashedPassword = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdM0ttR9i0NcMsuG';

  for (const clinicData of demoClinics) {
    // Check if clinic exists (use raw any to bypass type issues with legacy columns)
    const seedData = { ...clinicData, assignedTo: 1, connectSince: new Date().toISOString().split('T')[0] };
    let clinic = await db.select().from(organizations).where(eq(organizations.name, clinicData.name)).limit(1);
    let clinicId: number;

    if (clinic.length === 0) {
      const inserted = await db.insert(organizations).values(seedData as any).returning({ id: organizations.id });
      clinicId = inserted[0]!.id;
      console.log(`[Seed] Created clinic: ${clinicData.name}`);
    } else {
      clinicId = clinic[0]!.id;
      console.log(`[Seed] Clinic already exists: ${clinicData.name}`);
    }

    // Seed accounts for this clinic
    const clinicAccounts = [
      {
        name: `Admin - ${clinicData.name}`,
        email: `admin@${clinicData.email.split('@')[1]}`,
        password: hashedPassword,
        mobile: clinicData.phone,
        clinicId: clinicId,
        gender: 'Male',
        mobile2: '',
        city: clinicData.city || 'Chandigarh',
        address: clinicData.address || '',
        dept: 1,
        designation: 'Clinic Manager',
        about: 'Responsible for overall clinic operations and staff management.',
        dateBirth: '1990-01-01',
        dateLeft: '1990-01-01',
        salaryCur: 0,
        packages: ''
      },
      {
        name: `Lead Doctor - ${clinicData.name}`,
        email: `doctor@${clinicData.email.split('@')[1]}`,
        password: hashedPassword,
        mobile: clinicData.phone,
        clinicId: clinicId,
        gender: 'Male',
        mobile2: '',
        city: clinicData.city || 'Chandigarh',
        address: clinicData.address || '',
        dept: 1,
        designation: 'Chief Consultant',
        about: 'Expert physician with over 15 years of experience.',
        dateBirth: '1990-01-01',
        dateLeft: '1990-01-01',
        salaryCur: 0,
        packages: ''
      }
    ];

    for (const accountData of clinicAccounts) {
      const existingAccount = await db.select().from(accounts).where(eq(accounts.email, accountData.email)).limit(1);
      if (existingAccount.length === 0) {
        await db.insert(accounts).values(accountData);
        console.log(`  - Created account: ${accountData.email}`);
      } else {
        console.log(`  - Account already exists: ${accountData.email}`);
      }
    }
  }

  console.log('[Seed] Platform data seeding completed.');
}
