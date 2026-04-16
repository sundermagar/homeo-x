import { eq, and, sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { medicines, potencies, frequencies } from '../schema/settings';

export async function seedCatalog(db: DbClient) {
  console.log('[Seed] Seeding Homeopathy Catalog...');

  // --- 1. Seed Potencies ---
  const initialPotencies = [
    { name: 'Q (MT)', detail: 'Mother Tincture' },
    { name: '6C', detail: 'Low potency' },
    { name: '30C', detail: 'Standard potency' },
    { name: '200C', detail: 'Medium potency' },
    { name: '1M', detail: 'High potency' },
    { name: '10M', detail: 'Very high potency' },
    { name: '3X', detail: 'Trituration' },
    { name: '6X', detail: 'Low decimal' },
    { name: '12X', detail: 'Standard biochemic' },
    { name: '0/1 (LM1)', detail: 'LM Scale' },
  ];

  let potencyId = 1;
  for (const potency of initialPotencies) {
    try {
      // Manually providing ID because some schemas have broken serial defaults for this table
      await db.execute(sql`INSERT INTO potencies (id, name, detail) VALUES (${potencyId++}, ${potency.name}, ${potency.detail}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, detail = EXCLUDED.detail`);
    } catch (e) {
      console.error(`[Seed] SQL Insert failed for potency ${potency.name}:`, e);
    }
  }

  // Fetch potencies for mapping
  let dbPotencies: any[] = [];
  try {
    dbPotencies = await db.select().from(potencies);
  } catch (e) {
    console.warn('[Seed] Could not fetch potencies, continuing with empty mapping:', (e as Error).message);
  }
  
  const getPotencyId = (name: string) => dbPotencies.find(p => p.name === name)?.id || null;

  // --- 2. Seed Medicines ---
  const initialMedicines = [
    { name: 'Arnica Montana', disease: 'Injury, Bruising & Muscle Pain', type: 'Dilution', category: 'General', potencyId: getPotencyId('200C'), price: 180, stockLevel: 45 },
    { name: 'Nux Vomica', disease: 'Indigestion, Gastritis & Acidity', type: 'Dilution', category: 'Bio-Chemic', potencyId: getPotencyId('30C'), price: 210, stockLevel: 30 },
    { name: 'Belladonna', disease: 'Throbbing Headache & High Fever', type: 'Dilution', category: 'Bio-Chemic', potencyId: getPotencyId('30C'), price: 150, stockLevel: 12 },
    { name: 'Arsenicum Album', disease: 'Anxiety & Food Poisoning', type: 'Dilution', category: 'General', potencyId: getPotencyId('30C'), price: 200, stockLevel: 25 },
    { name: 'Pulsatilla', disease: 'Cough, Cold & Ear Infections', type: 'Dilution', category: 'General', potencyId: getPotencyId('30C'), price: 160, stockLevel: 40 },
    { name: 'Lycopodium', disease: 'Bloating, Gas & Liver issues', type: 'Dilution', category: 'Patent', potencyId: getPotencyId('200C'), price: 240, stockLevel: 15 },
    { name: 'Ignatia Amara', disease: 'Emotional Grief & Stress', type: 'Dilution', category: 'General', potencyId: getPotencyId('200C'), price: 190, stockLevel: 10 },
    { name: 'Rhus Tox', disease: 'Joint Pain & Stiffness', type: 'Ointment', category: 'Topical', potencyId: null, price: 95, stockLevel: 50 },
    { name: 'Aconite Napellus', disease: 'Sudden Fever & Panic Attacks', type: 'Dilution', category: 'General', potencyId: getPotencyId('30C'), price: 170, stockLevel: 22 },
    { name: 'Bryonia Alba', disease: 'Dry Cough & Pain on Movement', type: 'Dilution', category: 'General', potencyId: getPotencyId('200C'), price: 195, stockLevel: 18 },
    { name: 'Gelsemium', disease: 'Weakness & Flu-like symptoms', type: 'Dilution', category: 'General', potencyId: getPotencyId('200C'), price: 210, stockLevel: 12 },
    { name: 'Sulphur', disease: 'Skin Rashes & Intense Itching', type: 'Dilution', category: 'Generic', potencyId: getPotencyId('1M'), price: 300, stockLevel: 8 },
    
    // Expanded List
    { name: 'Calcarea Carb', disease: 'Calcium Deficiency & Fat Metabolism', type: 'Trituration', category: 'Bio-Chemic', potencyId: getPotencyId('6X'), price: 120, stockLevel: 60 },
    { name: 'Ferrum Phos', disease: 'Anemia & Inflammation', type: 'Trituration', category: 'Bio-Chemic', potencyId: getPotencyId('12X'), price: 130, stockLevel: 55 },
    { name: 'Mag Phos', disease: 'Spasms & Nerve Pain', type: 'Trituration', category: 'Bio-Chemic', potencyId: getPotencyId('6X'), price: 125, stockLevel: 48 },
    { name: 'Kali Phos', disease: 'Nervous Exhaustion & Fatigue', type: 'Trituration', category: 'Bio-Chemic', potencyId: getPotencyId('6X'), price: 140, stockLevel: 70 },
    { name: 'Silicea', disease: 'Weak Nails & Brittle Hair', type: 'Trituration', category: 'Bio-Chemic', potencyId: getPotencyId('12X'), price: 150, stockLevel: 35 },
    { name: 'Calendula', disease: 'Open Wounds & Septic Prevention', type: 'Mother Tincture', category: 'Mother Tincture', potencyId: getPotencyId('Q (MT)'), price: 350, stockLevel: 15 },
    { name: 'Berberis Vulgaris', disease: 'Kidney Stones & Urinary Pain', type: 'Mother Tincture', category: 'Mother Tincture', potencyId: getPotencyId('Q (MT)'), price: 420, stockLevel: 10 },
    { name: 'Chamomilla', disease: 'Teething troubles in Infants', type: 'Dilution', category: 'General', potencyId: getPotencyId('30C'), price: 160, stockLevel: 20 },
    { name: 'Sepia', disease: 'Hormonal Imbalance in Women', type: 'Dilution', category: 'General', potencyId: getPotencyId('1M'), price: 320, stockLevel: 5 },
    { name: 'Natrum Mur', disease: 'Sun-Headache & Malnutrition', type: 'Dilution', category: 'General', potencyId: getPotencyId('200C'), price: 210, stockLevel: 14 },
    { name: 'Thuja Occidentalis', disease: 'Warts & Overgrowth', type: 'Dilution', category: 'Patent', potencyId: getPotencyId('1M'), price: 290, stockLevel: 9 },
    { name: 'Hypericum', disease: 'Nerve Injuries & Shooting Pain', type: 'Ointment', category: 'Topical', potencyId: null, price: 110, stockLevel: 25 },
    { name: 'Apis Mellifica', disease: 'Bite/Sting swelling & Edema', type: 'Dilution', category: 'General', potencyId: getPotencyId('30C'), price: 180, stockLevel: 30 },
  ];

  for (const medicine of initialMedicines) {
    const existing = await db.select().from(medicines).where(eq(medicines.name, medicine.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(medicines).values(medicine as any);
      console.log(`[Seed] Created medicine: ${medicine.name}`);
    } else {
      // Update existing with rich data
      await db.update(medicines).set(medicine as any).where(eq(medicines.name, medicine.name));
      console.log(`[Seed] Updated medicine info: ${medicine.name}`);
    }
  }

  // --- 3. Seed Frequencies ---
  const initialFrequencies = [
    { title: 'Morning Only', duration: '7 Days', days: 7, frequency: '1-0-0' },
    { title: 'TDS', duration: '15 Days', days: 15, frequency: '1-1-1' },
    { title: 'BD', duration: '10 Days', days: 10, frequency: '1-0-1' },
    { title: 'SOS', duration: '5 Days', days: 5, frequency: 'When needed' },
    { title: 'Weekly', duration: '4 Weeks', days: 28, frequency: '0-0-0-1' },
    { title: 'Alternate Day', duration: '20 Days', days: 20, frequency: '1-0-1 alternating' },
    { title: 'Stat', duration: '1 Day', days: 1, frequency: 'Once' },
    { title: 'Bedtime', duration: '15 Days', days: 15, frequency: '0-0-1' },
    { title: 'Before Food', duration: '7 Days', days: 7, frequency: 'Before Meals' },
  ];

  for (const freq of initialFrequencies) {
    const existing = await db.select().from(frequencies).where(eq(frequencies.title, freq.title || '')).limit(1);
    if (existing.length === 0) {
      await db.insert(frequencies).values(freq);
    }
  }

  console.log('[Seed] Catalog seeding completed.');
}
