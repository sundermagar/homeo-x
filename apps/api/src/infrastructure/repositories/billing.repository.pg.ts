import { eq, and, sql, desc, isNull, gte, lt } from 'drizzle-orm';
import { bills } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Bill, BillWithPatient, DailyCollectionSummary, PatientBillSummary } from '@mmc/types';
import type { BillingRepository } from '../../domains/billing/ports/billing.repository';
import type { CreateBillInput, ListBillsQuery } from '@mmc/validation';

export class BillingRepositoryPg implements BillingRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<Bill | null> {
    const [row] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(params: ListBillsQuery): Promise<{ data: BillWithPatient[]; total: number }> {
    const { page, limit, regid, date } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(bills.deletedAt)];
    if (regid) conditions.push(eq(bills.regid, regid));
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      conditions.push(gte(bills.createdAt, start));
      conditions.push(lt(bills.createdAt, end));
    }
    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          bill: bills,
          patientName: sql<string>`CONCAT(cd.first_name, ' ', cd.surname)`,
          phone: sql<string>`cd.mobile1`,
        })
        .from(bills)
        .leftJoin(sql`case_datas cd`, sql`cd.regid = ${bills.regid}`)
        .where(where)
        .orderBy(desc(bills.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(bills).where(where),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows.map(r => ({ ...this.toDomain(r.bill), patientName: r.patientName ?? '', phone: r.phone ?? null })),
      total,
    };
  }

  async findByRegid(regid: number): Promise<PatientBillSummary> {
    const rows = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.regid, regid), isNull(bills.deletedAt)))
      .orderBy(desc(bills.id));

    const totalCharges = rows.reduce((s, r) => s + (r.charges ?? 0), 0);
    const totalReceived = rows.reduce((s, r) => s + (r.received ?? 0), 0);
    const totalBalance = rows.reduce((s, r) => s + (r.balance ?? 0), 0);

    return {
      bills: rows.map(this.toDomain.bind(this)),
      totals: { totalCharges, totalReceived, totalBalance },
    };
  }

  async findDailyCollection(date: string): Promise<DailyCollectionSummary> {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const where = and(isNull(bills.deletedAt), gte(bills.createdAt, start), lt(bills.createdAt, end));

    const rows = await this.db
      .select({
        bill: bills,
        patientName: sql<string>`CONCAT(cd.first_name, ' ', cd.surname)`,
        phone: sql<string>`cd.mobile1`,
      })
      .from(bills)
      .leftJoin(sql`case_datas cd`, sql`cd.regid = ${bills.regid}`)
      .where(where)
      .orderBy(desc(bills.id));

    const totalCharges = rows.reduce((s, r) => s + (r.bill.charges ?? 0), 0);
    const totalReceived = rows.reduce((s, r) => s + (r.bill.received ?? 0), 0);
    const totalBalance = rows.reduce((s, r) => s + (r.bill.balance ?? 0), 0);

    return {
      date,
      totalCharges,
      totalReceived,
      totalBalance,
      recordCount: rows.length,
      records: rows.map(r => ({ ...this.toDomain(r.bill), patientName: r.patientName ?? '', phone: r.phone ?? null })),
    };
  }

  async create(data: CreateBillInput & { billNo: number }): Promise<Bill> {
    const balance = (data.charges ?? 0) - (data.received ?? 0);
    const [row] = await this.db
      .insert(bills)
      .values({
        regid: data.regid,
        billNo: data.billNo,
        billDate: new Date().toISOString().split('T')[0],
        charges: data.charges,
        received: data.received ?? 0,
        balance,
        paymentMode: data.paymentMode ?? 'Cash',
        treatment: data.treatment,
        disease: data.disease,
        fromDate: data.fromDate,
        toDate: data.toDate,
        chargeId: data.chargeId,
        doctorId: data.doctorId,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!);
  }

  async updateReceived(id: number, amount: number, paymentMode: string): Promise<Bill | null> {
    const [existing] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (!existing) return null;

    const newReceived = (existing.received ?? 0) + amount;
    const newBalance = (existing.charges ?? 0) - newReceived;

    const [row] = await this.db
      .update(bills)
      .set({ received: newReceived, balance: newBalance, paymentMode, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async nextBillNo(): Promise<number> {
    const [res] = await this.db.select({ max: sql<number>`COALESCE(MAX(bill_no), 0)` }).from(bills);
    return (Number(res?.max ?? 0)) + 1;
  }

  async softDelete(id: number): Promise<boolean> {
    const [row] = await this.db.update(bills).set({ deletedAt: new Date() }).where(eq(bills.id, id)).returning();
    return !!row;
  }

  private toDomain(row: typeof bills.$inferSelect): Bill {
    return {
      id: row.id,
      regid: row.regid ?? 0,
      billNo: row.billNo,
      billDate: row.billDate,
      charges: row.charges ?? 0,
      received: row.received ?? 0,
      balance: row.balance ?? 0,
      paymentMode: (row.paymentMode as Bill['paymentMode']) ?? null,
      treatment: row.treatment ?? null,
      disease: row.disease ?? null,
      fromDate: row.fromDate ?? null,
      toDate: row.toDate ?? null,
      chargeId: row.chargeId ?? null,
      doctorId: row.doctorId ?? null,
      notes: row.notes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    };
  }
}
