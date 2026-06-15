import { eq, and, sql, desc, isNull, gte, lt, or } from 'drizzle-orm';
import { bills, patients } from '@mmc/database/schema';
import * as schema from '@mmc/database';
import type { DbClient } from '@mmc/database';
import type { Bill, BillWithPatient, DailyCollectionSummary, PatientBillSummary } from '@mmc/types';
import type { BillingRepository } from '../../domains/billing/ports/billing.repository.js';
import type { CreateBillInput, ListBillsQuery } from '@mmc/validation';

/**
 * PostgreSQL adapter for BillingRepository port.
 * Uses Drizzle ORM with schema-per-tenant (search_path set at connection level).
 */
export class BillingRepositoryPg implements BillingRepository {
  constructor(private readonly db: DbClient) { }

  async findById(id: number): Promise<Bill | null> {
    const [row] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(params: ListBillsQuery, clinicId?: number): Promise<{ data: BillWithPatient[]; total: number }> {
    const { page, limit, regid, date } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(bills.deletedAt)];
    if (regid) conditions.push(eq(bills.regid, regid));

    // Filter by clinicId on patients table safely
    if (clinicId) {
      conditions.push(
        or(
          eq(patients.clinicId, clinicId),
          isNull(patients.clinicId),
          eq(patients.clinicId, 0),
          eq(patients.clinicId, 1)
        )!
      );
    }

    if (date) {
      conditions.push(eq(bills.billDate, date));
    }
    const where = and(...conditions);

    console.log('[BillingRepositoryPg.findAll] params:', params, 'start:', date ? new Date(date) : null, 'end:', date ? (() => { const e = new Date(date); e.setDate(e.getDate() + 1); return e; })() : null);

    try {
      const [rows, countRows] = await Promise.all([
        this.db
          .select({
            bill: bills,
            patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
            phone: patients.mobile1,
          })
          .from(bills)
          .leftJoin(patients, eq(patients.regid, bills.regid))
          .where(where)
          .orderBy(desc(bills.id))
          .limit(limit)
          .offset(offset),
        this.db.select({ count: sql<number>`count(*)` }).from(bills).leftJoin(patients, eq(patients.regid, bills.regid)).where(where),
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      const res = rows.map(r => ({ ...this.toDomain(r.bill), patientName: r.patientName ?? '', phone: r.phone ?? null }));
      if (res.some(b => b.regid === 10107 || b.regid === 10111)) {
        console.log('[DEBUG BILLS] Bills:', res.filter(b => b.regid === 10107 || b.regid === 10111));
      }
      return {
        data: res,
        total,
      };
    } catch (err) {
      console.error('[BillingRepositoryPg] Error in findAll:', err);
      throw err;
    }
  }

  async findByRegid(regid: number): Promise<PatientBillSummary> {
    const modernRows = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.regid, regid), isNull(bills.deletedAt)))
      .orderBy(desc(bills.id));

    const allBills = modernRows.map(this.toDomain.bind(this)).sort((a, b) => (b.id || 0) - (a.id || 0));

    const totalCharges = allBills.reduce((s, r) => s + (r.charges ?? 0), 0);
    const totalReceived = allBills.reduce((s, r) => s + (r.received ?? 0), 0);
    const totalBalance = allBills.reduce((s, r) => s + (r.balance ?? 0), 0);

    return {
      bills: allBills,
      totals: { totalCharges, totalReceived, totalBalance },
    };
  }

  async findDailyCollection(date: string, clinicId?: number): Promise<DailyCollectionSummary> {
    const conditions = [isNull(bills.deletedAt), eq(bills.billDate, date)];
    if (clinicId) {
      conditions.push(
        or(
          eq(patients.clinicId, clinicId),
          isNull(patients.clinicId),
          eq(patients.clinicId, 0),
          eq(patients.clinicId, 1)
        )!
      );
    }
    const where = and(...conditions);

    try {
      const rows = await this.db
        .select({
          bill: bills,
          patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
          phone: patients.mobile1,
        })
        .from(bills)
        .leftJoin(patients, eq(patients.regid, bills.regid))
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
    } catch (err) {
      console.error('[BillingRepositoryPg] Error in findDailyCollection:', err);
      throw err;
    }
  }

  async getPatientBalances(clinicId?: number): Promise<any[]> {
    try {
      const res = await this.db.execute(sql`
        WITH PatientBills AS (
          SELECT regid, SUM(balance)::int as total_balance, MAX(created_at) as last_bill_date, MAX(doctor_id) as doctor_id
          FROM bills
          WHERE (deleted_at IS NULL OR deleted_at::text = '')
          GROUP BY regid
          HAVING SUM(balance) > 0
        ),
        LatestNotes AS (
          SELECT DISTINCT ON (regid) regid, notes
          FROM case_notes
          WHERE notes_type = 'Balance' 
            AND (deleted_at IS NULL OR deleted_at::text = '')
          ORDER BY regid, id DESC
        )
        SELECT
          p.regid, 
          CONCAT(p.first_name, ' ', p.surname) as "patientName", 
          MAX(d.name) as "doctorName",
          pb.total_balance as balance,
          pb.last_bill_date as "lastBillDate",
          ln.notes
        FROM PatientBills pb
        JOIN case_datas p ON pb.regid = p.regid
        LEFT JOIN doctors d ON (d.id = pb.doctor_id OR d.id::text = p.assitant_doctor)
        LEFT JOIN LatestNotes ln ON ln.regid = p.regid
        WHERE (p.deleted_at IS NULL OR p.deleted_at::text = '')
          ${clinicId ? sql`AND (p.clinic_id = ${clinicId} OR p.clinic_id IS NULL OR p.clinic_id = 0 OR p.clinic_id = 1)` : sql``}
        GROUP BY p.regid, p.first_name, p.surname, pb.total_balance, pb.last_bill_date, ln.notes
        ORDER BY pb.total_balance DESC
      `);
      return res as any[];
    } catch (err) {
      console.error('[BillingRepositoryPg] Error in getPatientBalances:', err);
      throw err;
    }
  }

  async updateBalanceNote(regid: number, note: string): Promise<boolean> {
    try {
      const [existing] = await this.db.execute(sql`
        SELECT id FROM case_notes WHERE regid = ${regid} AND notes_type = 'Balance' AND (deleted_at IS NULL OR deleted_at::text = '') ORDER BY id DESC LIMIT 1
      `) as any[];

      if (existing) {
        await this.db.execute(sql`
          UPDATE case_notes 
          SET notes = ${note}, updated_at = NOW() 
          WHERE id = ${existing.id}
        `);
      } else {
        await this.db.execute(sql`
          INSERT INTO case_notes (regid, notes_type, notes, created_at, updated_at) 
          VALUES (${regid}, 'Balance', ${note}, NOW(), NOW())
        `);
      }
      return true;
    } catch (err) {
      console.error('[BillingRepositoryPg] Error in updateBalanceNote:', err);
      throw err;
    }
  }

  async create(data: CreateBillInput & { billNo: number }): Promise<Bill> {
    const balance = (data.charges ?? 0) - (data.received ?? 0);
    const [row] = await this.db
      .insert(bills)
      .values({
        regid: data.regid,
        billNo: data.billNo,
        billDate: data.billDate ? data.billDate : new Date().toISOString().split('T')[0],
        charges: data.charges,
        received: data.received ?? 0,
        balance,
        paymentMode: data.paymentMode ?? 'Cash',
        treatment: data.treatment || undefined,
        disease: data.disease || undefined,
        fromDate: data.fromDate === '' ? undefined : (data.fromDate || undefined),
        toDate: data.toDate === '' ? undefined : (data.toDate || undefined),
        chargeId: data.chargeId,
        doctorId: data.doctorId,
        notes: data.notes || undefined,
        billType: data.billType || undefined,
        customTitle: data.customTitle || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!);
  }

  async updateReceived(id: number, amount: number, paymentMode: string): Promise<Bill | null> {
    // Try modern bills table first
    const [existing] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (existing) {
      const newReceived = (existing.received ?? 0) + amount;
      const newBalance = (existing.charges ?? 0) - newReceived;
      const [row] = await this.db
        .update(bills)
        .set({ received: newReceived, balance: newBalance, paymentMode, updatedAt: new Date() })
        .where(eq(bills.id, id))
        .returning();
      return row ? this.toDomain(row) : null;
    }

    return null;
  }

  async updateCharges(id: number, amount: number): Promise<Bill | null> {
    // Try modern bills table first
    const [existing] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (existing) {
      const newBalance = amount - (existing.received ?? 0);
      const [row] = await this.db
        .update(bills)
        .set({ charges: amount, balance: newBalance, updatedAt: new Date() })
        .where(eq(bills.id, id))
        .returning();
      return row ? this.toDomain(row) : null;
    }

    return null;
  }

  async updateAdditionalChargeBill(regid: number, date: string, oldName: string, newName: string, amount: number): Promise<boolean> {
    const [existing] = await this.db.select().from(bills)
      .where(
        and(
          eq(bills.regid, regid),
          eq(bills.billDate, date),
          eq(bills.billType, 'Additional'),
          eq(bills.customTitle, oldName),
          isNull(bills.deletedAt)
        )
      ).limit(1);

    if (existing) {
      const newBalance = amount - (existing.received ?? 0);
      const [row] = await this.db.update(bills)
        .set({
          charges: amount,
          balance: newBalance,
          customTitle: newName,
          updatedAt: new Date()
        })
        .where(eq(bills.id, existing.id))
        .returning();
      return !!row;
    }
    return false;
  }

  async deleteAdditionalChargeBill(regid: number, date: string, name: string): Promise<boolean> {
    const [existing] = await this.db.select().from(bills)
      .where(
        and(
          eq(bills.regid, regid),
          eq(bills.billDate, date),
          eq(bills.billType, 'Additional'),
          eq(bills.customTitle, name),
          isNull(bills.deletedAt)
        )
      ).limit(1);

    if (existing) {
      const [row] = await this.db.update(bills)
        .set({ deletedAt: new Date() })
        .where(eq(bills.id, existing.id))
        .returning();
      return !!row;
    }
    return false;
  }

  async deleteUnpaidConsultationBill(regid: number, date: string): Promise<boolean> {
    const [existing] = await this.db.select().from(bills)
      .where(
        and(
          eq(bills.regid, regid),
          eq(bills.billDate, date),
          eq(bills.billType, 'Consultation'),
          eq(bills.received, 0),
          isNull(bills.deletedAt)
        )
      ).limit(1);

    if (existing) {
      await this.db.update(bills).set({ deletedAt: new Date() }).where(eq(bills.id, existing.id));
      return true;
    }
    return false;
  }

  async nextBillNo(): Promise<number> {
    try {
      // Atomic sequence — safe under concurrent bill creation
      const [res] = await this.db.execute(sql`SELECT nextval('bill_no_seq')`);
      return Number(res?.nextval ?? 1);
    } catch (err: any) {
      // Fallback: If sequence is missing (e.g. some schemas missed the migration)
      if (err.code === '42P01') {
        const [res] = await this.db.select({ maxNo: sql<number>`MAX(${bills.billNo})` }).from(bills);
        return (res?.maxNo ?? 0) + 1;
      }
      throw err;
    }
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
      billType: (row.billType as Bill['billType']) ?? undefined,
      customTitle: row.customTitle ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    };
  }

  private toLegacyDomain(row: typeof schema.billLegacy.$inferSelect): Bill {
    return {
      id: row.id,
      regid: row.regid ?? 0,
      billNo: row.BillNo || row.id,
      billDate: row.BillDate || (row.createdAt ? row.createdAt.toISOString() : new Date().toISOString()),
      charges: row.charges || 0,
      received: row.received || 0,
      balance: row.Balance || 0,
      paymentMode: (row.paymentMode as Bill['paymentMode']) || null,
      treatment: row.Treatment || null,
      disease: row.Disease || null,
      fromDate: row.fromdate || null,
      toDate: row.todate || null,
      chargeId: row.chargeId || null,
      doctorId: row.DoctorID || null,
      notes: null,
      billType: 'Consultation',
      customTitle: null,
      createdAt: row.createdAt || new Date(),
      updatedAt: row.updatedAt || new Date(),
      deletedAt: row.deletedAt || null,
    };
  }
}
