import { eq, sql } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { InventoryRepository, Medicine } from '../../domains/inventory/ports/inventory.repository';

export class InventoryRepositoryPg implements InventoryRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<Medicine | null> {
    const [row] = await this.db
      .select()
      .from(schema.stocks)
      .where(eq(schema.stocks.id, id))
      .limit(1);

    return (row as Medicine) || null;
  }

  async deductStock(medicineId: number, amount: number): Promise<void> {
    // Standard stock deduction logic (decrement ml or quantity)
    // Legacy system uses 'ml' for liquid medicines
    await this.db
      .update(schema.stocks)
      .set({
        quantity: sql`COALESCE(quantity, 0) - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.stocks.id, medicineId));
  }

  async listStocks(): Promise<Medicine[]> {
    const rows = await this.db
      .select()
      .from(schema.stocks)
      .where(sql`deleted_at IS NULL`)
      .orderBy(schema.stocks.name);

    return rows as Medicine[];
  }
}
