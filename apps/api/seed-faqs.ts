import { db } from './src/infrastructure/database/client';
import { faqs } from '@mmc/database/schema';

async function main() {
  try {
    const records = [
      {
        ques: "What is Homeopathy and how does it work?",
        ans: "Homeopathy is a natural system of medicine based on the principle of 'like cures like'. It uses highly diluted substances to trigger the body's own healing mechanisms.",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        ques: "Are homeopathic medicines safe for children?",
        ans: "Yes, homeopathic medicines are extremely safe for children, infants, and pregnant women. They are natural, non-toxic, and do not have side effects when taken as prescribed.",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        ques: "How long does a homeopathic treatment usually take?",
        ans: "The duration of treatment depends on whether the illness is acute (short-term) or chronic (long-term). Acute conditions can improve in hours or days, while chronic conditions might take weeks or months.",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        ques: "Can I take allopathic medicine alongside homeopathy?",
        ans: "Usually, yes. You should not stop your conventional prescribed medication abruptly. However, it's best to space them out (about 30 minutes apart) and inform your doctor about all medications you are taking.",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
    ];

    for (const r of records) {
      await db.insert(faqs).values(r);
    }
    console.log("Seeded FAQs successfully");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
