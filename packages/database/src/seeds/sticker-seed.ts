import { eq } from 'drizzle-orm';
import { stickers } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedStickers(db: DbClient) {
  console.log('[Seed] Seeding Stickers...');

  const presetStickers = [
    { name: 'Follow-up Required', detail: 'Patient needs a follow-up visit in 15 days.' },
    { name: 'Payment Pending', detail: 'Balance amount yet to be cleared.' },
    { name: 'Allergy Warning', detail: 'Patient is allergic to specific medicines.' },
    { name: 'Elite Member', detail: 'VIP patient. Provide priority booking.' }
  ];

  for (const sticker of presetStickers) {
    const existing = await db.select().from(stickers).where(eq(stickers.name, sticker.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(stickers).values(sticker);
      console.log(`[Seed] Created sticker: ${sticker.name}`);
    } else {
      console.log(`[Seed] Sticker already exists: ${sticker.name}`);
    }
  }

  console.log('[Seed] Sticker seeding completed.');
}
