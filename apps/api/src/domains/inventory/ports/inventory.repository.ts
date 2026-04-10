export interface Medicine {
  id: number;
  name: string;
  ml?: number;
  quantity?: number;
  description?: string;
}

export interface InventoryRepository {
  findById(id: number): Promise<Medicine | null>;
  deductStock(medicineId: number, amount: number): Promise<void>;
  listStocks(): Promise<Medicine[]>;
}
