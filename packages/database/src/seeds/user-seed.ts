import { Role } from '@mmc/types';
import { users } from '../schema/users';
import type { DbClient } from '../client';
import { eq } from 'drizzle-orm';

export async function seedUsers(db: DbClient) {
  console.log('[Seed] Seeding users...');

  const demoUsers = [
    {
      email: 'doctor@homeox.com',
      password: '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdM0ttR9i0NcMsuG', // password123
      name: 'Demo Doctor',
      type: Role.Doctor,
      isActive: true,
    },
    {
      email: 'admin@homeox.com',
      password: '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdM0ttR9i0NcMsuG', // password123
      name: 'Demo Admin',
      type: Role.Admin,
      isActive: true,
    },
  ];

  for (const userData of demoUsers) {
    const existing = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(users).values(userData);
      console.log(`[Seed] Created user: ${userData.email}`);
    } else {
      console.log(`[Seed] User already exists: ${userData.email}`);
    }
  }

  console.log('[Seed] User seeding completed.');
}
