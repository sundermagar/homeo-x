import type { DbClient } from '../client.js';
import { growthReferences } from '../schema/medical-cases.js';

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
    { months: 108, gender: 'M', idealHeightCm: '133.30', idealWeightKg: '28.10' },
    { months: 120, gender: 'M', idealHeightCm: '138.40', idealWeightKg: '31.20' },
    { months: 132, gender: 'M', idealHeightCm: '143.70', idealWeightKg: '35.00' },
    { months: 144, gender: 'M', idealHeightCm: '149.10', idealWeightKg: '39.90' },
    { months: 156, gender: 'M', idealHeightCm: '156.00', idealWeightKg: '45.30' },
    { months: 168, gender: 'M', idealHeightCm: '163.20', idealWeightKg: '50.80' },
    { months: 180, gender: 'M', idealHeightCm: '170.10', idealWeightKg: '56.70' },
    { months: 192, gender: 'M', idealHeightCm: '173.50', idealWeightKg: '61.40' },
    { months: 216, gender: 'M', idealHeightCm: '176.00', idealWeightKg: '66.90' },
    { months: 228, gender: 'M', idealHeightCm: '176.50', idealWeightKg: '68.90' },
    // Female equivalents
    { months: 0, gender: 'F', idealHeightCm: '49.10', idealWeightKg: '3.40' },
    { months: 1, gender: 'F', idealHeightCm: '51.70', idealWeightKg: '3.90' },
    { months: 6, gender: 'F', idealHeightCm: '64.10', idealWeightKg: '7.30' },
    { months: 12, gender: 'F', idealHeightCm: '74.00', idealWeightKg: '9.50' },
    { months: 24, gender: 'F', idealHeightCm: '85.50', idealWeightKg: '11.80' },
    { months: 36, gender: 'F', idealHeightCm: '94.10', idealWeightKg: '13.90' },
    { months: 48, gender: 'F', idealHeightCm: '101.60', idealWeightKg: '16.00' },
    { months: 60, gender: 'F', idealHeightCm: '108.40', idealWeightKg: '18.20' },
    { months: 72, gender: 'F', idealHeightCm: '114.60', idealWeightKg: '20.20' },
    { months: 84, gender: 'F', idealHeightCm: '120.60', idealWeightKg: '22.40' },
    { months: 96, gender: 'F', idealHeightCm: '126.40', idealWeightKg: '25.00' },
    { months: 120, gender: 'F', idealHeightCm: '138.60', idealWeightKg: '32.50' },
    { months: 144, gender: 'F', idealHeightCm: '150.30', idealWeightKg: '42.00' },
    { months: 168, gender: 'F', idealHeightCm: '159.40', idealWeightKg: '50.30' },
    { months: 192, gender: 'F', idealHeightCm: '162.20', idealWeightKg: '54.80' },
    { months: 216, gender: 'F', idealHeightCm: '163.00', idealWeightKg: '56.70' },
  ];

  console.log('Seeding growth references...');
  for (const row of data) {
    await db.insert(growthReferences).values({
      months: row.months,
      gender: row.gender,
      idealHeightCm: row.idealHeightCm,
      idealWeightKg: row.idealWeightKg,
    }).onConflictDoNothing();
  }
  console.log('Growth references seeded.');
}
