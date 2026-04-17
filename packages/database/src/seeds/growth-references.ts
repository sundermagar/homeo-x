import { growthReferences } from '../schema/medical-cases';
import type { DbClient } from '../client';

export async function seedGrowthReferences(db: DbClient) {
  const data = [
    { months: 0, gender: 'M', idealHeightCm: '49.99', idealWeightKg: '3.53' },
    { months: 1, gender: 'M', idealHeightCm: '52.70', idealWeightKg: '4.00' },
    { months: 2, gender: 'M', idealHeightCm: '56.63', idealWeightKg: '4.88' },
    { months: 3, gender: 'M', idealHeightCm: '59.61', idealWeightKg: '5.67' },
    { months: 4, gender: 'M', idealHeightCm: '62.08', idealWeightKg: '6.39' },
    { months: 6, gender: 'M', idealHeightCm: '66.13', idealWeightKg: '7.63' },
    { months: 12, gender: 'M', idealHeightCm: '74.92', idealWeightKg: '10.16' },
    { months: 24, gender: 'M', idealHeightCm: '86.84', idealWeightKg: '12.60' },
    { months: 36, gender: 'M', idealHeightCm: '95.45', idealWeightKg: '14.26' },
    { months: 48, gender: 'M', idealHeightCm: '101.94', idealWeightKg: '16.15' },
    { months: 60, gender: 'M', idealHeightCm: '108.63', idealWeightKg: '18.30' },
    { months: 72, gender: 'M', idealHeightCm: '115.12', idealWeightKg: '20.58' },
    { months: 84, gender: 'M', idealHeightCm: '121.51', idealWeightKg: '22.96' },
    { months: 96, gender: 'M', idealHeightCm: '127.63', idealWeightKg: '25.53' },
    
    { months: 0, gender: 'F', idealHeightCm: '49.10', idealWeightKg: '3.40' },
    { months: 1, gender: 'F', idealHeightCm: '51.70', idealWeightKg: '3.90' },
    { months: 2, gender: 'F', idealHeightCm: '55.40', idealWeightKg: '4.50' },
    { months: 3, gender: 'F', idealHeightCm: '58.40', idealWeightKg: '5.20' },
    { months: 6, gender: 'F', idealHeightCm: '64.10', idealWeightKg: '7.30' },
    { months: 12, gender: 'F', idealHeightCm: '74.00', idealWeightKg: '9.50' },
    { months: 24, gender: 'F', idealHeightCm: '85.50', idealWeightKg: '12.00' },
  ];

  console.log('[Seed] Seeding growth references...');
  for (const row of data) {
    await db.insert(growthReferences)
      .values({
        months: row.months,
        gender: row.gender,
        idealHeightCm: row.idealHeightCm,
        idealWeightKg: row.idealWeightKg,
      })
      .onConflictDoNothing();
  }
  console.log('[Seed] Growth references seeded.');
}
