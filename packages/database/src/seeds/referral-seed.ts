import { eq } from 'drizzle-orm';
import { referralSources } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedReferrals(db: DbClient) {
  console.log('[Seed] Seeding Referral Sources...');

  const sources = [
    { name: 'Direct Clinical Walk-in', type: 'Institutional' },
    { name: 'Google Search Registry', type: 'Digital Marketing' },
    { name: 'Social Media Campaign (Facebook/Instagram)', type: 'Digital Marketing' },
    { name: 'Professional Medical Referral', type: 'Clinical Network' },
    { name: 'Patient Recommendation Program', type: 'Word of Mouth' },
    { name: 'Offline Print Advertisement', type: 'Traditional Media' },
    { name: 'Institutional Partnership', type: 'Corporate' }
  ];

  for (const source of sources) {
    const existing = await db.select().from(referralSources).where(eq(referralSources.name, source.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(referralSources).values({ ...source, isActive: true });
      console.log(`[Seed] Created referral source: ${source.name}`);
    } else {
      console.log(`[Seed] Referral source already exists: ${source.name}`);
    }
  }

  console.log('[Seed] Referral seeding completed.');
}
