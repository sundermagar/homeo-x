import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { payments, patients } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Payment, PaymentWithPatient } from '@mmc/types';
import type { PaymentRepository } from '../../domains/billing/ports/payment.repository.js';
import type { ListPaymentsQuery } from '@mmc/validation';

export class PaymentRepositoryPg implements PaymentRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<PaymentWithPatient | null> {
    const [row] = await this.db
      .select({
        payment: payments,
        patientName: sql<string>`COALESCE(NULLIF(CONCAT_WS(' ', ${patients.firstName}, ${patients.surname}), ''), 'Reg ID: ' || ${payments.regid})`,
        phone: patients.mobile1,
      })
      .from(payments)
      .leftJoin(patients, eq(patients.regid, payments.regid))
      .where(and(eq(payments.id, id), isNull(payments.deletedAt)))
      .limit(1);

    if (!row) return null;
    return { ...this.toDomain(row.payment), patientName: row.patientName ?? '', phone: row.phone ?? null };
  }

  async findAll(params: ListPaymentsQuery): Promise<{ data: PaymentWithPatient[]; total: number }> {
    const { page, limit, regid } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(payments.deletedAt)];
    if (regid) conditions.push(eq(payments.regid, regid));
    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          payment: payments,
          patientName: sql<string>`COALESCE(NULLIF(CONCAT_WS(' ', ${patients.firstName}, ${patients.surname}), ''), 'Reg ID: ' || ${payments.regid})`,
          phone: patients.mobile1,
        })
        .from(payments)
        .leftJoin(patients, eq(patients.regid, payments.regid))
        .where(where)
        .orderBy(desc(payments.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(payments).where(where),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      data: rows.map(r => ({ ...this.toDomain(r.payment), patientName: r.patientName ?? '', phone: r.phone ?? null })),
      total,
    };
  }

  async create(data: {
    regid?: number;
    billId?: number;
    orderId?: string;
    paymentId?: string;
    signature?: string;
    amount: number;
    currency: string;
    status: string;
    paymentMode: string;
    paymentDate?: Date;
  }): Promise<Payment> {
    const [row] = await this.db
      .insert(payments)
      .values({
        regid: data.regid,
        billId: data.billId,
        orderId: data.orderId,
        paymentId: data.paymentId,
        signature: data.signature,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paymentMode: data.paymentMode,
        paymentDate: data.paymentDate ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Dual-write to legacy receipt table to ensure legacy parity routes (View Collection) work
    if (data.regid) {
      try {
        const pDate = data.paymentDate ?? new Date();
        const istDateStr = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).format(pDate);
        
        const legacyDate = istDateStr;
        const [m, d, y] = istDateStr.split('/');
        const dateval = `${y}-${(m || '0').padStart(2, '0')}-${(d || '0').padStart(2, '0')}`;
        const modeCode: Record<string, string> = { Cash: 'C', Card: 'S', Cheque: 'B', Online: 'O' };
        const mode = modeCode[data.paymentMode] || 'C';

        // Try to insert using sequence first, if it fails, fallback to max id
        await this.db.execute(sql`
          INSERT INTO receipt (id, receiptdate, dateval, regid, amount, mode, created_at, updated_at)
          VALUES (
            COALESCE((SELECT MAX(id) FROM receipt), 0) + 1, 
            ${legacyDate}, 
            ${dateval}, 
            (SELECT id FROM case_datas WHERE regid = ${data.regid} LIMIT 1), 
            ${String(data.amount)}, 
            ${mode}, 
            NOW(), 
            NOW()
          )
        `);
      } catch (err: any) {
        console.error('[PaymentRepositoryPg] Failed to dual-write to legacy receipt table:', err.message);
      }
    }

    return this.toDomain(row!);
  }

  async updateStatus(id: number, status: string): Promise<Payment | null> {
    const [row] = await this.db
      .update(payments)
      .set({ status, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: typeof payments.$inferSelect): Payment {
    return {
      id: row.id,
      regid: row.regid ?? null,
      billId: row.billId ?? null,
      orderId: row.orderId ?? null,
      paymentId: row.paymentId ?? null,
      signature: row.signature ?? null,
      amount: row.amount,
      currency: row.currency,
      status: row.status as Payment['status'],
      paymentMode: row.paymentMode as Payment['paymentMode'],
      paymentDate: row.paymentDate ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
