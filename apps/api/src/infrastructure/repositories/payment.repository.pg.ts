import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { payments } from '@mmc/database/schema';
import type { DbClient } from '@mmc/database';
import type { Payment, PaymentWithPatient } from '@mmc/types';
import type { PaymentRepository } from '../../domains/billing/ports/payment.repository';
import type { ListPaymentsQuery } from '@mmc/validation';

export class PaymentRepositoryPg implements PaymentRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: number): Promise<PaymentWithPatient | null> {
    const [row] = await this.db
      .select({
        payment: payments,
        patientName: sql<string>`CONCAT(cd.first_name, ' ', cd.surname)`,
        phone: sql<string>`cd.mobile1`,
      })
      .from(payments)
      .leftJoin(sql`case_datas cd`, sql`cd.regid = ${payments.regid}`)
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
          patientName: sql<string>`CONCAT(cd.first_name, ' ', cd.surname)`,
          phone: sql<string>`cd.mobile1`,
        })
        .from(payments)
        .leftJoin(sql`case_datas cd`, sql`cd.regid = ${payments.regid}`)
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
