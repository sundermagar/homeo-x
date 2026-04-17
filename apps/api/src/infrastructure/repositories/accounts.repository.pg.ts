import { eq, and, sql, desc, isNull, gte, lt, like, lte } from 'drizzle-orm';
import {
  additionalChargesLegacy,
  daychargesLegacy,
  bankDepositLegacy,
  cashDepositLegacy,
  expensesLegacy,
  expensesheadLegacy,
  patients,
} from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
ExpenseWithHead,
  ExpenseHead,
} from '@mmc/types';
import type {
  AdditionalChargeRepository,
  DayChargeRepository,
  DepositRepository,
  ExpenseRepository,
} from '../../domains/billing/ports/accounts.repository';
import type {
  CreateAdditionalChargeInput,
  UpdateAdditionalChargeInput,
  ListAdditionalChargesQuery,
  CreateDayChargeInput,
  UpdateDayChargeInput,
  CreateBankDepositInput,
  UpdateBankDepositInput,
  CreateCashDepositInput,
  UpdateCashDepositInput,
  ListDepositsQuery,
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesQuery,
  CreateExpenseHeadInput,
  UpdateExpenseHeadInput,
} from '@mmc/validation';

/**
 * PostgreSQL adapter for AdditionalChargeRepository.
 */
export class AdditionalChargeRepositoryPg implements AdditionalChargeRepository {
  constructor(private readonly db: DbClient) { }

  async findById(id: number): Promise<AdditionalChargeWithPatient | null> {
    const [row] = await this.db
      .select({
        charge: additionalChargesLegacy,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
        phone: patients.mobile1,
      })
      .from(additionalChargesLegacy)
      .leftJoin(patients, eq(patients.regid, additionalChargesLegacy.regid))
      .where(and(eq(additionalChargesLegacy.id, id), isNull(additionalChargesLegacy.deletedAt)))
      .limit(1);

    if (!row) return null;
    return { ...this.toDomain(row.charge), patientName: row.patientName ?? '', phone: row.phone ?? null };
  }

  async findAll(params: ListAdditionalChargesQuery): Promise<{
    data: AdditionalChargeWithPatient[];
    total: number;
  }> {
    try {
      const { page, limit, regid, date } = params;
      const offset = (page - 1) * limit;
      const conditions = [isNull(additionalChargesLegacy.deletedAt)];
      if (regid) conditions.push(eq(additionalChargesLegacy.regid, regid));
      if (date) {
        conditions.push(eq(additionalChargesLegacy.dateval, date));
      }
      const where = and(...conditions);

      const [rows, countRows] = await Promise.all([
        this.db
          .select({
            charge: additionalChargesLegacy,
            patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
            phone: patients.mobile1,
          })
          .from(additionalChargesLegacy)
          .leftJoin(patients, eq(patients.regid, additionalChargesLegacy.regid))
          .where(where)
          .orderBy(desc(additionalChargesLegacy.id))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(additionalChargesLegacy)
          .where(where),
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      return {
        data: rows.map(r => ({ ...this.toDomain(r.charge), patientName: r.patientName ?? '', phone: r.phone ?? null })),
        total,
      };
    } catch (err) {
      console.warn('[ACCOUNTS_REPO] additional_charges table missing or query failed:', err);
      return { data: [], total: 0 };
    }
  }

  async create(data: CreateAdditionalChargeInput): Promise<AdditionalCharge> {
    const today = new Date().toISOString().split('T')[0];
    const [row] = await this.db
      .insert(additionalChargesLegacy)
      .values({
        regid: data.regid,
        randId: data.randId || `AC_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
        dateval: data.dateval || today,
        additionalName: data.additionalName,
        additionalPrice: data.additionalPrice ?? 0,
        additionalQuantity: data.additionalQuantity ?? 1,
        receivedPrice: data.receivedPrice ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!);
  }

  async update(id: number, data: UpdateAdditionalChargeInput): Promise<AdditionalCharge | null> {
    const [row] = await this.db
      .update(additionalChargesLegacy)
      .set({
        ...(data.additionalName !== undefined && { additionalName: data.additionalName }),
        ...(data.additionalPrice !== undefined && { additionalPrice: data.additionalPrice }),
        ...(data.additionalQuantity !== undefined && { additionalQuantity: data.additionalQuantity }),
        ...(data.receivedPrice !== undefined && { receivedPrice: data.receivedPrice }),
        updatedAt: new Date(),
      })
      .where(and(eq(additionalChargesLegacy.id, id), isNull(additionalChargesLegacy.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async softDelete(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(additionalChargesLegacy)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(additionalChargesLegacy.id, id))
      .returning();
    return !!row;
  }

  private toDomain(row: typeof additionalChargesLegacy.$inferSelect): AdditionalCharge {
    return {
      id: row.id,
      regid: row.regid ?? null,
      randId: row.randId ?? null,
      dateval: row.dateval ?? null,
      additionalName: row.additionalName ?? null,
      additionalPrice: row.additionalPrice ?? 0,
      additionalQuantity: row.additionalQuantity ?? 0,
      receivedPrice: row.receivedPrice ?? 0,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      deletedAt: row.deletedAt ?? null,
    };
  }
}

/**
 * PostgreSQL adapter for DayChargeRepository.
 */
export class DayChargeRepositoryPg implements DayChargeRepository {
  constructor(private readonly db: DbClient) { }

  async findById(id: number): Promise<DayCharge | null> {
    const [row] = await this.db
      .select()
      .from(daychargesLegacy)
      .where(and(eq(daychargesLegacy.id, id), isNull(daychargesLegacy.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<DayCharge[]> {
    try {
      const rows = await this.db
        .select()
        .from(daychargesLegacy)
        .where(isNull(daychargesLegacy.deletedAt))
        .orderBy(daychargesLegacy.id);
      return rows.map(this.toDomain.bind(this));
    } catch {
      return [];
    }
  }

  async create(data: CreateDayChargeInput): Promise<DayCharge> {
    const [row] = await this.db
      .insert(daychargesLegacy)
      .values({
        days: data.days,
        regularCharges: data.regularCharges,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!);
  }

  async update(id: number, data: UpdateDayChargeInput): Promise<DayCharge | null> {
    const [row] = await this.db
      .update(daychargesLegacy)
      .set({
        ...(data.days !== undefined && { days: data.days }),
        ...(data.regularCharges !== undefined && { regularCharges: data.regularCharges }),
        updatedAt: new Date(),
      })
      .where(and(eq(daychargesLegacy.id, id), isNull(daychargesLegacy.deletedAt)))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  async softDelete(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(daychargesLegacy)
      .set({ deletedAt: new Date() })
      .where(eq(daychargesLegacy.id, id))
      .returning();
    return !!row;
  }

  private toDomain(row: typeof daychargesLegacy.$inferSelect): DayCharge {
    return {
      id: row.id,
      days: row.days ?? null,
      regularCharges: row.regularCharges ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      deletedAt: row.deletedAt ?? null,
    };
  }
}

/**
 * PostgreSQL adapter for DepositRepository (Bank + Cash).
 */
export class DepositRepositoryPg implements DepositRepository {
  constructor(private readonly db: DbClient) { }

  async findById(id: number, type: 'Bank' | 'Cash'): Promise<BankDeposit | CashDeposit | null> {
    const table = type === 'Bank' ? bankDepositLegacy : cashDepositLegacy;
    const [row] = await this.db
      .select()
      .from(table as any)
      .where(and(eq((table as any).id, id), isNull((table as any).deletedAt)))
      .limit(1);
    return row ? (this.toDomain(row, type) as any) : null;
  }

  async findAllByType(
    type: 'Bank' | 'Cash',
    params: ListDepositsQuery,
  ): Promise<{ data: (BankDeposit | CashDeposit)[]; total: number }> {
    try {
      const { page, limit, date } = params;
      const offset = (page - 1) * limit;
      const table = type === 'Bank' ? bankDepositLegacy : cashDepositLegacy;
      const conditions = [isNull((table as any).deletedAt)];
      if (date) conditions.push(eq((table as any).depositDate, date));
      const where = and(...conditions);

      const [rows, countRows] = await Promise.all([
        this.db
          .select()
          .from(table as any)
          .where(where)
          .orderBy(desc((table as any).id))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(table as any)
          .where(where),
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      return {
        data: rows.map(r => this.toDomain(r, type) as BankDeposit | CashDeposit),
        total,
      };
    } catch {
      return { data: [], total: 0 };
    }
  }

  async createBankDeposit(data: CreateBankDepositInput): Promise<BankDeposit> {
    const [row] = await this.db
      .insert(bankDepositLegacy)
      .values({
        depositDate: data.depositDate,
        dateval: data.depositDate,
        amount: data.amount,
        remark: data.remark,
        bankdeposit: data.bankdeposit,
        comments: data.comments,
        submitted: data.submitted,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!, 'Bank') as BankDeposit;
  }

  async createCashDeposit(data: CreateCashDepositInput): Promise<CashDeposit> {
    const [row] = await this.db
      .insert(cashDepositLegacy)
      .values({
        depositDate: data.depositDate,
        dateval: data.depositDate,
        amount: data.amount,
        remark: data.remark,
        bankdeposit: data.bankdeposit,
        comments: data.comments,
        submitted: data.submitted,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(row!, 'Cash') as CashDeposit;
  }

  async updateBankDeposit(id: number, data: UpdateBankDepositInput): Promise<BankDeposit | null> {
    const [row] = await this.db
      .update(bankDepositLegacy)
      .set({
        ...(data.depositDate !== undefined && { depositDate: data.depositDate, dateval: data.depositDate }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.remark !== undefined && { remark: data.remark }),
        ...(data.bankdeposit !== undefined && { bankdeposit: data.bankdeposit }),
        ...(data.comments !== undefined && { comments: data.comments }),
        ...(data.submitted !== undefined && { submitted: data.submitted }),
        updatedAt: new Date(),
      })
      .where(and(eq(bankDepositLegacy.id, id), isNull(bankDepositLegacy.deletedAt)))
      .returning();
    return row ? (this.toDomain(row, 'Bank') as BankDeposit) : null;
  }

  async updateCashDeposit(id: number, data: UpdateCashDepositInput): Promise<CashDeposit | null> {
    const [row] = await this.db
      .update(cashDepositLegacy)
      .set({
        ...(data.depositDate !== undefined && { depositDate: data.depositDate, dateval: data.depositDate }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.remark !== undefined && { remark: data.remark }),
        ...(data.bankdeposit !== undefined && { bankdeposit: data.bankdeposit }),
        ...(data.comments !== undefined && { comments: data.comments }),
        ...(data.submitted !== undefined && { submitted: data.submitted }),
        updatedAt: new Date(),
      })
      .where(and(eq(cashDepositLegacy.id, id), isNull(cashDepositLegacy.deletedAt)))
      .returning();
    return row ? (this.toDomain(row, 'Cash') as CashDeposit) : null;
  }

  async softDelete(id: number, type: 'Bank' | 'Cash'): Promise<boolean> {
    const table = type === 'Bank' ? bankDepositLegacy : cashDepositLegacy;
    const [row] = await this.db
      .update(table as any)
      .set({ deletedAt: new Date() })
      .where(eq((table as any).id, id))
      .returning();
    return !!row;
  }

  private toDomain(row: any, type: 'Bank' | 'Cash'): BankDeposit | CashDeposit {
    return {
      id: row.id,
      clinicId: row.clinicId ?? null,
      depositDate: row.depositDate ?? '',
      dateval: row.dateval ?? null,
      amount: row.amount ?? null,
      remark: row.remark ?? null,
      bankdeposit: row.bankdeposit ?? null,
      comments: row.comments ?? null,
      submitted: row.submitted ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      deletedAt: row.deletedAt ?? null,
    };
  }
}

/**
 * PostgreSQL adapter for ExpenseRepository.
 */
export class ExpenseRepositoryPg implements ExpenseRepository {
  constructor(private readonly db: DbClient) { }

  async findById(id: number): Promise<ExpenseWithHead | null> {
    const [row] = await this.db
      .select({
        expense: expensesLegacy,
        headName: expensesheadLegacy.expenseshead,
        shortName: expensesheadLegacy.shortName,
      })
      .from(expensesLegacy)
      .leftJoin(expensesheadLegacy, eq(expensesheadLegacy.id, expensesLegacy.head))
      .where(and(eq(expensesLegacy.id, id), isNull(expensesLegacy.deletedAt)))
      .limit(1);

    if (!row) return null;
    return { ...this.toDomain(row.expense), headName: row.headName ?? null, shortName: row.shortName ?? null };
  }

  async findAll(params: ListExpensesQuery): Promise<{ data: ExpenseWithHead[]; total: number }> {
    try {
      const { page, limit, head, fromDate, toDate } = params;
      const offset = (page - 1) * limit;
      const conditions = [isNull(expensesLegacy.deletedAt)];
      if (head) conditions.push(eq(expensesLegacy.head, head));
      if (fromDate) conditions.push(gte(expensesLegacy.expDate, fromDate));
      if (toDate) conditions.push(lte(expensesLegacy.expDate, toDate));
      const where = and(...conditions);

      const [rows, countRows] = await Promise.all([
        this.db
          .select({
            expense: expensesLegacy,
            headName: expensesheadLegacy.expenseshead,
            shortName: expensesheadLegacy.shortName,
          })
          .from(expensesLegacy)
          .leftJoin(expensesheadLegacy, eq(expensesheadLegacy.id, expensesLegacy.head))
          .where(where)
          .orderBy(desc(expensesLegacy.id))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(expensesLegacy)
          .where(where),
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      return {
        data: rows.map(r => ({ ...this.toDomain(r.expense), headName: r.headName ?? null, shortName: r.shortName ?? null })),
        total,
      };
    } catch {
      return { data: [], total: 0 };
    }
  }

  async create(data: CreateExpenseInput): Promise<ExpenseWithHead> {
    const [row] = await this.db
      .insert(expensesLegacy)
      .values({
        dateval: data.dateval,
        expDate: data.expDate,
        head: data.head,
        amount: data.amount,
        detail: data.detail,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const headRow = row.head
      ? await this.db
        .select({ headName: expensesheadLegacy.expenseshead, shortName: expensesheadLegacy.shortName })
        .from(expensesheadLegacy)
        .where(eq(expensesheadLegacy.id, row.head))
        .limit(1)
      : null;

    return {
      ...this.toDomain(row),
      headName: headRow?.[0]?.headName ?? null,
      shortName: headRow?.[0]?.shortName ?? null,
    };
  }

  async update(id: number, data: UpdateExpenseInput): Promise<ExpenseWithHead | null> {
    const [row] = await this.db
      .update(expensesLegacy)
      .set({
        ...(data.dateval !== undefined && { dateval: data.dateval }),
        ...(data.expDate !== undefined && { expDate: data.expDate }),
        ...(data.head !== undefined && { head: data.head }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.detail !== undefined && { detail: data.detail }),
        updatedAt: new Date(),
      })
      .where(and(eq(expensesLegacy.id, id), isNull(expensesLegacy.deletedAt)))
      .returning();

    if (!row) return null;

    const headRow = row.head
      ? await this.db
        .select({ headName: expensesheadLegacy.expenseshead, shortName: expensesheadLegacy.shortName })
        .from(expensesheadLegacy)
        .where(eq(expensesheadLegacy.id, row.head))
        .limit(1)
      : null;

    return {
      ...this.toDomain(row),
      headName: headRow?.[0]?.headName ?? null,
      shortName: headRow?.[0]?.shortName ?? null,
    };
  }

  async softDelete(id: number): Promise<boolean> {
    const [row] = await this.db
      .update(expensesLegacy)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(expensesLegacy.id, id))
      .returning();
    return !!row;
  }

  // ─── Expense Head Methods ──────────────────────────────────────────────────

  async listHeads(): Promise<ExpenseHead[]> {
    try {
      const rows = await this.db
        .select()
        .from(expensesheadLegacy)
        .orderBy(desc(expensesheadLegacy.id));
      return rows.map(r => this.headToDomain(r));
    } catch (err) {
      console.warn('[ACCOUNTS_REPO] expenseshead table missing or query failed:', err);
      return [];
    }
  }

  async findHeadById(id: number): Promise<ExpenseHead | null> {
    try {
      const [row] = await this.db
        .select()
        .from(expensesheadLegacy)
        .where(eq(expensesheadLegacy.id, id))
        .limit(1);
      return row ? this.headToDomain(row) : null;
    } catch {
      return null;
    }
  }

  async createHead(data: CreateExpenseHeadInput): Promise<ExpenseHead> {
    const [row] = await this.db
      .insert(expensesheadLegacy)
      .values({
        expenseshead: data.name,
        shortName: data.description || '',
      })
      .returning();
    return this.headToDomain(row!);
  }

  async updateHead(id: number, data: UpdateExpenseHeadInput): Promise<ExpenseHead | null> {
    const [row] = await this.db
      .update(expensesheadLegacy)
      .set({
        ...(data.name !== undefined && { expenseshead: data.name }),
        ...(data.description !== undefined && { shortName: data.description }),
      })
      .where(eq(expensesheadLegacy.id, id))
      .returning();
    return row ? this.headToDomain(row) : null;
  }

  async deleteHead(id: number): Promise<boolean> {
    const [row] = await this.db
      .delete(expensesheadLegacy)
      .where(eq(expensesheadLegacy.id, id))
      .returning();
    return !!row;
  }

  private headToDomain(row: typeof expensesheadLegacy.$inferSelect): ExpenseHead {
    return {
      id: row.id,
      name: row.expenseshead || '',
      description: row.shortName || null,
      isActive: true, // Legacy table doesn't have isActive, assuming true
    };
  }

  private toDomain(row: typeof expensesLegacy.$inferSelect): ExpenseWithHead {
    return {
      id: row.id,
      clinicId: row.clinicId ?? null,
      dateval: row.dateval ?? null,
      expDate: row.expDate ?? null,
      head: row.head ?? null,
      amount: row.amount ?? null,
      detail: row.detail ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
      deletedAt: row.deletedAt ?? null,
      headName: null,
      shortName: null,
    };
  }
}