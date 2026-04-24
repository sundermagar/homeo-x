import { eq } from 'drizzle-orm';
import { faqs } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedFaqs(db: DbClient) {
  console.log('[Seed] Seeding Clinical FAQs...');

  const faqList = [
    { 
      name: 'Procedure for repeat appointment scheduling', 
      detail: 'Navigate to the Patient Directory, select the patient record, and choose "New Appointment". Previously recorded consultation details may be cloned from this interface.',
      displayOrder: 1 
    },
    { 
      name: 'Multi-location clinical management', 
      detail: 'Kreed.health supports concurrent management of multiple clinic locations using a secure tenant schema isolation architecture.',
      displayOrder: 2
    },
    { 
      name: 'Automated prescription generation', 
      detail: 'System-generated prescriptions are produced as PDF documents based on medicinal records and dosages specified during the clinical consultation.',
      displayOrder: 3
    },
    { 
      name: 'Security protocols for patient data', 
      detail: 'Every clinic instance operates within a dedicated and encrypted database schema to ensure absolute data privacy and institutional isolation.',
      displayOrder: 4
    },
    { 
      name: 'Inventory tracking for medicinal stock', 
      detail: 'The Medicine Catalog provides real-time tracking. Items reaching low stock thresholds are automatically flagged with yellow or red status indicators.',
      displayOrder: 5
    },
    { 
      name: 'PDF document header customization', 
      detail: 'Custom HTML and CSS may be injected into document headers and footers via Settings > PDF & Reports to align with clinical branding.',
      displayOrder: 6
    },
    { 
      name: 'Protocol for adding new medical staff', 
      detail: 'Clinicians, assistants, and dispensary personnel may be added via the Staff Management module with granular role-based access controls.',
      displayOrder: 7
    },
    { 
      name: 'Referral source analytics tracking', 
      detail: 'Clinics may monitor patient acquisition sources, such as digital campaigns or professional recommendations, to evaluate clinical marketing efficacy.',
      displayOrder: 8
    },
    { 
      name: 'Clinical expense management', 
      detail: 'Operational expenses such as facility rent or utilities are managed through defined Expense Heads and recorded within the Accounts module.',
      displayOrder: 9
    },
    { 
      name: 'Medicine price update procedure', 
      detail: 'Unit prices may be modified within the Medicine Catalog. These updates are applied automatically to all subsequent billing entries.',
      displayOrder: 10
    },
    {
      name: 'Mechanism of AI clinical transcription',
      detail: 'The AI Scribe utilizes ambient recording technology to transcribe consultations into structured clinical notes and SOAP headers.',
      displayOrder: 11
    },
    {
      name: 'Mobile and tablet device compatibility',
      detail: 'The Kreed.health platform is responsive and optimized for secondary devices, including tablets and smartphones, to support mobile clinical management.',
      displayOrder: 12
    },
    {
      name: 'Processing financial refund entries',
      detail: 'Refunds are processed through the Billing details interface. Approved refunds automatically update the corresponding collection reports.',
      displayOrder: 13
    },
    {
      name: 'Usage of Clinical Stickers',
      detail: 'Stickers serve as predefined clinical templates that may be rapidly appended to patient cases to standardize documentation.',
      displayOrder: 14
    },
    {
      name: 'Revenue report generation process',
      detail: 'Detailed collection reports are available in the Accounts module. Reports may be filtered by date range, clinician, or payment method.',
      displayOrder: 15
    },
    {
      name: 'Patient data import protocols',
      detail: 'The platform supports bulk ingestion of patient records via CSV and legacy data migration toolkits.',
      displayOrder: 16
    },
    {
      name: 'Corporate branding on prescriptions',
      detail: 'Clinic logos uploaded via the Clinic Profile settings are automatically displayed on all invoices and generated PDF documents.',
      displayOrder: 17
    },
    {
      name: 'Dispensary stock-out management',
      detail: 'Medicines may be marked as "Out of Stock" (OOS) in the catalog, providing an immediate visual warning to clinicians during the prescription phase.',
      displayOrder: 18
    },
    {
      name: 'Follow-up appointment tracking',
      detail: 'Clinicians may specify "Next Follow-up Dates" during consultation closure. These dates are automatically synchronized with the clinical calendar.',
      displayOrder: 19
    },
    {
      name: 'Data backup and export procedures',
      detail: 'Automated nightly backups are performed. Manual data exports for administrative purposes are available via the Platform Admin panel.',
      displayOrder: 20
    },
    {
      name: 'Automated WhatsApp communication',
      detail: 'Integration of WhatsApp API keys enables automated dispatch of appointment reminders and prescription links to patients.',
      displayOrder: 21
    },
    {
      name: 'Organizational Department usage',
      detail: 'Departments categorize clinical services and staff units, such as OPD or Laboratory, to improve organizational structure and reporting.',
      displayOrder: 22
    },
    {
      name: 'Medicine potency management',
      detail: 'Clinical potencies may be defined and archived within Settings > Potencies and are subsequently available in the medicine catalog.',
      displayOrder: 23
    },
    {
      name: 'Referral Type categorization',
      detail: 'Referral Types categorize patient acquisition channels to facilitate precise analysis of marketing and professional networks.',
      displayOrder: 24
    },
    {
      name: 'Staff account deactivation/archival',
      detail: 'Staff accounts may be deactivated via Staff Management. This preserves historical records while terminating system access.',
      displayOrder: 25
    }
  ];

  for (const faq of faqList) {
    try {
      // 🕵️ Check if 'name' column exists to avoid errors on legacy schemas
      const existing = await db.select().from(faqs).where(eq(faqs.ques, faq.name)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(faqs).values({
          ques: faq.name,
          ans: faq.detail,
          name: faq.name, 
          detail: faq.detail,
          displayOrder: faq.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`[Seed] Created FAQ: ${faq.name.substring(0, 40)}...`);
      } else {
        console.log(`[Seed] FAQ already exists: ${faq.name.substring(0, 20)}...`);
      }
    } catch (err: any) {
      // If 'name' column still causes issues, try a safer insert without it
      if (err.message.includes('column "name" does not exist')) {
        console.log(`[Seed] Retrying FAQ insert without "name" column for compatibility...`);
        const existing = await db.select({ id: faqs.id }).from(faqs).where(eq(faqs.ques, faq.name)).limit(1);
        if (existing.length === 0) {
          await db.insert(faqs).values({
            ques: faq.name,
            ans: faq.detail,
            detail: faq.detail,
            displayOrder: faq.displayOrder
          });
        }
      } else {
        throw err;
      }
    }
  }

  console.log('[Seed] FAQ seeding completed.');
}
