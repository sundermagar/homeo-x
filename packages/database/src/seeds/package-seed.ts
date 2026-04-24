import { eq } from 'drizzle-orm';
import { packagePlans } from '../schema/packages';
import type { DbClient } from '../client';

export async function seedPackages(db: DbClient) {
  console.log('[Seed] Seeding Membership Packages...');

  const plans = [
    {
      name: 'Silver Health Plan',
      description: 'Standard 30-day membership including one free follow-up consultation.',
      price: 1500,
      durationDays: 30,
      colorCode: '#94a3b8',
      isActive: true
    },
    {
      name: 'Gold Wellness Plan',
      description: 'Quarterly membership with priority booking and 10% discount on medicines.',
      price: 4000,
      durationDays: 90,
      colorCode: '#fbbf24',
      isActive: true
    },
    {
      name: 'Platinum Premium Plan',
      description: 'Annual family membership with unlimited consultations and home delivery.',
      price: 12000,
      durationDays: 365,
      colorCode: '#818cf8',
      isActive: true
    }
  ];

  for (const plan of plans) {
    const existing = await db.select().from(packagePlans).where(eq(packagePlans.name, plan.name)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(packagePlans).values(plan);
      console.log(`[Seed] Created package: ${plan.name}`);
    } else {
      console.log(`[Seed] Package already exists: ${plan.name}`);
    }
  }

  console.log('[Seed] Package seeding completed.');
}
