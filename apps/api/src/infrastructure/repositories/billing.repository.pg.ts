import { eq, sql, desc } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { BillingRepository, Bill } from '../../domains/billing/ports/billing.repository';

export class BillingRepositoryPg implements BillingRepository {
  constructor(private readonly db: DbClient) {}

  async createBill(data: Partial<Bill>): Promise<number> {
    const [row] = await this.db
      .insert(schema.bills)
      .values({
        regid: data.regid!,
        billNo: data.billNo!,
        billDate: data.billDate || new Date().toISOString().split('T')[0],
        totalAmount: data.totalAmount || 0,
        receivedAmount: data.receivedAmount || 0,
        balanceAmount: (data.totalAmount || 0) - (data.receivedAmount || 0),
        paymentMode: data.paymentMode || 'Cash',
        status: data.status || 'Pending',
      })
      .returning({ id: schema.bills.id });

    return row?.id ?? 0;
  }

  async getNextBillNumber(): Promise<string> {
    const [lastBill] = await this.db
      .select({ billNo: schema.bills.billNo })
      .from(schema.bills)
      .orderBy(desc(schema.bills.id))
      .limit(1);

    if (!lastBill) return '1001';
    
    const lastNum = parseInt(lastBill.billNo);
    return isNaN(lastNum) ? '1001' : (lastNum + 1).toString();
  }

  async getBillsByPatient(regid: number): Promise<Bill[]> {
    const rows = await this.db
      .select()
      .from(schema.bills)
      .where(eq(schema.bills.regid, regid))
      .orderBy(desc(schema.bills.createdAt));

    return rows as unknown as Bill[];
  }
}
