import { eq } from 'drizzle-orm';
import { staticPages, faqs } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedCms(db: DbClient) {
  console.log('[Seed] Seeding CMS (Static Pages)...');

  // 1. Static Pages
  const pages = [
    { slug: 'about-us', title: 'About HomeoX', content: 'HomeoX is a comprehensive clinical management platform specialized for homeopathy.' },
    { slug: 'privacy-policy', title: 'Privacy Policy', content: 'We value your privacy and data security.' },
    { slug: 'terms-of-service', title: 'Terms of Service', content: 'Standard terms of service for clinical management.' }
  ];

  for (const page of pages) {
    const existing = await db.select().from(staticPages).where(eq(staticPages.slug, page.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(staticPages).values(page);
      console.log(`[Seed] Created page: ${page.title}`);
    } else {
      console.log(`[Seed] Page already exists: ${page.slug}`);
    }
  }

  console.log('[Seed] CMS (Static Pages) seeding completed.');
}
