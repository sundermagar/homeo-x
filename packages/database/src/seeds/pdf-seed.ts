import { eq } from 'drizzle-orm';
import { pdfSettings } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedPdfSettings(db: DbClient) {
  console.log('[Seed] Seeding PDF Settings...');

  const templates = [
    {
      templateName: 'Standard Prescription',
      headerHtml: '<h1>HomeoX Clinical Prescription</h1>',
      footerHtml: '<p>Contact: +91 99999 88888 | www.homeox.com</p>',
      margin: '20mm',
      isDefault: true
    },
    {
      templateName: 'Medical Certificate',
      headerHtml: '<h1>Medical Fitness Certificate</h1>',
      footerHtml: '<p>Verified by Authorized HomeoX Practitioner</p>',
      margin: '25mm',
      isDefault: false
    }
  ];

  for (const template of templates) {
    const existing = await db.select().from(pdfSettings).where(eq(pdfSettings.templateName, template.templateName)).limit(1);
    if (existing.length === 0) {
      await db.insert(pdfSettings).values(template);
      console.log(`[Seed] Created PDF template: ${template.templateName}`);
    } else {
      console.log(`[Seed] PDF template already exists: ${template.templateName}`);
    }
  }

  console.log('[Seed] PDF settings seeding completed.');
}
