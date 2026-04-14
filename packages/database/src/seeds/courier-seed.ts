import { eq } from 'drizzle-orm';
import { courierMasters } from '../schema/settings';
import type { DbClient } from '../client';

export async function seedCouriers(db: DbClient) {
  console.log('[Seed] Seeding Courier Masters...');

  const couriers = [
    {
      name: 'BlueDart Express',
      contactPerson: 'Zonal Manager',
      phone: '1860 233 1234',
      trackingUrl: 'https://www.bluedart.com/tracking?id=',
      isActive: true
    },
    {
      name: 'Delhivery',
      contactPerson: 'Local Hub Head',
      phone: '0124 671 9500',
      trackingUrl: 'https://www.delhivery.com/track/share?id=',
      isActive: true
    },
    {
      name: 'DTDC Courier',
      contactPerson: 'Area Coordinator',
      phone: '080 26367837',
      trackingUrl: 'https://www.dtdc.in/tracking/tracking_results.asp?id=',
      isActive: true
    }
  ];

  for (const courier of couriers) {
    const existing = await db.select().from(courierMasters).where(eq(courierMasters.name, courier.name)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(courierMasters).values(courier);
      console.log(`[Seed] Created courier: ${courier.name}`);
    } else {
      console.log(`[Seed] Courier already exists: ${courier.name}`);
    }
  }

  console.log('[Seed] Courier seeding completed.');
}
