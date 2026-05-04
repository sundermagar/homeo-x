import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { vaccineMaster } from '../schema/medical-cases';

const vaccineSeed = [
  // Categories (milestones)
  { id: 2169, label: 'Birth', months: 0, parentId: 0 },
  { id: 2170, label: '2 months', months: 2, parentId: 0 },
  { id: 2171, label: '4 months', months: 4, parentId: 0 },
  { id: 2172, label: '6 months', months: 6, parentId: 0 },
  { id: 2173, label: '12 months', months: 12, parentId: 0 },
  { id: 2174, label: '15 months', months: 15, parentId: 0 },
  { id: 2175, label: '18 months', months: 18, parentId: 0 },
  { id: 2176, label: '2-4 years', months: 24, parentId: 0 },
  { id: 2177, label: '5-9 years', months: 60, parentId: 0 },
  { id: 2178, label: '10-11 years', months: 120, parentId: 0 },
  { id: 2179, label: '12-13 years', months: 144, parentId: 0 },
  { id: 2180, label: '13-14 years', months: 156, parentId: 0 },
  { id: 2181, label: '15-17 years', months: 180, parentId: 0 },

  // Specific Vaccines linked to categories
  { id: 2182, label: 'Bacillus Calmette–Guérin (BCG) - D1', months: 0, parentId: 2169 },
  { id: 2183, label: 'Hepatitis B (HepB) - D1', months: 0, parentId: 2169 },
  { id: 2184, label: 'Hepatitis B (HepB) - D2', months: 2, parentId: 2170 },
  { id: 2185, label: 'Diphtheria, tetanus, and acellular pertussis (DTaP) - D1', months: 2, parentId: 2170 },
  { id: 2186, label: 'Inactivated poliovirus (IPV) - D1', months: 2, parentId: 2170 },
  { id: 2187, label: 'Haemophilus influenzae type b (Hib) - D1', months: 2, parentId: 2170 },
  { id: 2188, label: 'Diphtheria, tetanus, and acellular pertussis (DTaP) - D2', months: 4, parentId: 2171 },
  { id: 2189, label: 'Inactivated poliovirus (IPV) - D2', months: 4, parentId: 2171 },
  { id: 2190, label: 'Haemophilus influenzae type b (Hib) - D2', months: 4, parentId: 2171 },
  { id: 2191, label: 'Pneumococcal conjugate vaccines (PCV10 or PCV13) - D1', months: 4, parentId: 2171 },
  { id: 2192, label: 'Hepatitis B (HepB) - D3', months: 6, parentId: 2172 },
  { id: 2193, label: 'Diphtheria, tetanus, and acellular pertussis (DTaP) - D3', months: 6, parentId: 2172 },
  { id: 2194, label: 'Inactivated poliovirus (IPV) - D3', months: 6, parentId: 2172 },
  { id: 2195, label: 'Haemophilus influenzae type b (Hib) - D3', months: 6, parentId: 2172 },
  { id: 2196, label: 'Pneumococcal conjugate vaccines (PCV10 or PCV13) - D2', months: 6, parentId: 2172 },
  { id: 2197, label: 'Pneumococcal conjugate vaccines (PCV10 or PCV13) - B1', months: 12, parentId: 2173 },
  { id: 2198, label: 'Measles, Mumps, and Rubella (MMR) - D1', months: 12, parentId: 2173 },
  { id: 2199, label: 'Varicella (VAR) - D1', months: 12, parentId: 2173 },
  { id: 2200, label: 'Measles, Mumps, and Rubella (MMR) - D2', months: 15, parentId: 2174 },
  { id: 2201, label: 'Varicella (VAR) - D2', months: 15, parentId: 2174 },
  { id: 2202, label: 'Diphtheria, tetanus, and acellular pertussis (DTaP) - B1', months: 18, parentId: 2175 },
  { id: 2203, label: 'Inactivated poliovirus (IPV) - B1', months: 18, parentId: 2175 },
  { id: 2204, label: 'Haemophilus influenzae type b (Hib) - B1', months: 18, parentId: 2175 },
  { id: 2205, label: 'Inactivated poliovirus (IPV) - B2', months: 120, parentId: 2178 },
  { id: 2206, label: 'Tetanus, reduced diphtheria and acellular pertussis (tdap) - B2', months: 120, parentId: 2178 },
  { id: 2207, label: 'Human papillomavirus (HPV2 or HPV4) - D1 (Females)', months: 144, parentId: 2179 },
  { id: 2208, label: 'Human papillomavirus (HPV2 or HPV4) - D2 (Females)', months: 156, parentId: 2180 },
  { id: 2209, label: 'Pneumococcal polysaccharide (PPSV23) - (One or two dose)', months: 24, parentId: 2176 },
  { id: 2215, label: 'Influenza (INF) - Annual vaccination (6-59 months)', months: 6, parentId: 2172 },
];

export async function seedVaccines(db: DbClient) {
  console.log('[Seed] Seeding Vaccine Master Data (Legacy Parity)...');

  for (const v of vaccineSeed) {
    try {
      // Check if already exists
      const existing = await db.execute(sql`
        SELECT id FROM vaccinedatas WHERE id = ${v.id} OR label = ${v.label}
      `);
      
      if (existing && (existing as any).length > 0) {
        continue;
      }

      await db.execute(sql`
        INSERT INTO vaccinedatas (id, label, months, parent_id)
        VALUES (${v.id}, ${v.label}, ${v.months}, ${v.parentId})
      `);
    } catch (e) {
      console.error(`[Seed] Failed to seed vaccine ${v.label}:`, (e as Error).message);
    }
  }

  // Reset serial sequence if needed
  try {
    await db.execute(sql`SELECT setval('vaccinedatas_id_seq', (SELECT MAX(id) FROM vaccinedatas))`);
  } catch (e) {
    // Sequence might not exist or be named differently
  }

  console.log('[Seed] Vaccine master data seeded successfully.');
}
