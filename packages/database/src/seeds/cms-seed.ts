import { eq } from 'drizzle-orm';
import { staticPages, faqs } from '../schema/settings.js';
import type { DbClient } from '../client.js';

export async function seedCms(db: DbClient) {
  console.log('[Seed] Seeding CMS (Static Pages)...');

  // 1. Static Pages
  const pages = [
    { slug: 'about-us', title: 'About Kreed.health', content: 'Kreed.health is a comprehensive clinical management platform specialized for homeopathy.' },
    { 
      slug: 'privacy-policy', 
      title: 'Privacy Policy (DPDP Compliance)', 
      content: `
# Privacy Notice / गोपनीयता सूचना

## English (EN)
**DPDP Act 2023 Compliance Notice**

1. **Purpose of Collection**: We process your personal data (identity, contact, health history) strictly for clinical management, AI-assisted diagnosis, and healthcare communication.
2. **Consent**: By registering, you provide affirmative consent for data processing. You can manage or withdraw specific consents (AI, SMS, WhatsApp) through your patient profile.
3. **Your Rights**: Under the DPDP Act 2023, you have the right to access a summary of your data, correct inaccuracies, and request erasure of your data when no longer needed for clinical purposes.
4. **AI Processing**: Our platform uses AI to assist in rubric extraction and repertorization. This data is processed securely and is used only to assist your consulting doctor.
5. **Data Protection**: We implement state-of-the-art security measures to protect your PHI from unauthorized access.

---

## हिंदी (HI)
**DPDP अधिनियम 2023 अनुपालन सूचना**

1. **संग्रह का उद्देश्य**: हम आपके व्यक्तिगत डेटा (पहचान, संपर्क, स्वास्थ्य इतिहास) को नैदानिक प्रबंधन, AI-सहायता प्राप्त निदान और स्वास्थ्य देखभाल संचार के लिए संसाधित करते हैं।
2. **सहमति**: पंजीकरण करके, आप डेटा प्रसंस्करण के लिए सकारात्मक सहमति प्रदान करते हैं। आप अपनी रोगी प्रोफ़ाइल के माध्यम से विशिष्ट सहमति (AI, SMS, WhatsApp) का प्रबंधन या वापसी कर सकते हैं।
3. **आपके अधिकार**: DPDP अधिनियम 2023 के तहत, आपके पास अपने डेटा के सारांश तक पहुँचने, अशुद्धियों को सुधारने और नैदानिक उद्देश्यों के लिए आवश्यकता न होने पर अपने डेटा को मिटाने का अनुरोध करने का अधिकार है।
4. **AI प्रसंस्करण**: हमारा प्लेटफ़ॉर्म रूब्रिक निष्कर्षण और रिपर्टराइजेशन में सहायता के लिए AI का उपयोग करता है। यह डेटा सुरक्षित रूप से संसाधित किया जाता है और इसका उपयोग केवल आपके परामर्शदाता डॉक्टर की सहायता के लिए किया जाता है।
5. **डेटा सुरक्षा**: हम आपके PHI को अनधिकृत पहुँच से बचाने के लिए अत्याधुनिक सुरक्षा उपाय लागू करते हैं।
      `.trim()
    },
    { slug: 'terms-of-service', title: 'Terms of Service', content: 'Standard terms of service for clinical management.' }
  ];

  for (const page of pages) {
    const existing = await db.select().from(staticPages).where(eq(staticPages.slug, page.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(staticPages).values(page);
      console.log(`[Seed] Created page: ${page.title}`);
    } else {
      await db.update(staticPages).set(page).where(eq(staticPages.slug, page.slug));
      console.log(`[Seed] Updated page: ${page.slug}`);
    }
  }

  console.log('[Seed] CMS (Static Pages) seeding completed.');
}
