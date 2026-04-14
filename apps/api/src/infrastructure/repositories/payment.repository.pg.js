import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { payments, patients } from '@mmc/database/schema';
export class PaymentRepositoryPg {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const [row] = await this.db
            .select({
            payment: payments,
            patientName: sql `CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
            phone: patients.mobile1,
        })
            .from(payments)
            .leftJoin(patients, eq(patients.regid, payments.regid))
            .where(and(eq(payments.id, id), isNull(payments.deletedAt)))
            .limit(1);
        if (!row)
            return null;
        return { ...this.toDomain(row.payment), patientName: row.patientName ?? '', phone: row.phone ?? null };
    }
    async findAll(params) {
        const { page, limit, regid } = params;
        const offset = (page - 1) * limit;
        const conditions = [isNull(payments.deletedAt)];
        if (regid)
            conditions.push(eq(payments.regid, regid));
        const where = and(...conditions);
        const [rows, countRows] = await Promise.all([
            this.db
                .select({
                payment: payments,
                patientName: sql `CONCAT(${patients.firstName}, ' ', ${patients.surname})`,
                phone: patients.mobile1,
            })
                .from(payments)
                .leftJoin(patients, eq(patients.regid, payments.regid))
                .where(where)
                .orderBy(desc(payments.id))
                .limit(limit)
                .offset(offset),
            this.db.select({ count: sql `count(*)` }).from(payments).where(where),
        ]);
        const total = Number(countRows[0]?.count ?? 0);
        return {
            data: rows.map(r => ({ ...this.toDomain(r.payment), patientName: r.patientName ?? '', phone: r.phone ?? null })),
            total,
        };
    }
    async create(data) {
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
        return this.toDomain(row);
    }
    async updateStatus(id, status) {
        const [row] = await this.db
            .update(payments)
            .set({ status, updatedAt: new Date() })
            .where(eq(payments.id, id))
            .returning();
        return row ? this.toDomain(row) : null;
    }
    toDomain(row) {
        return {
            id: row.id,
            regid: row.regid ?? null,
            billId: row.billId ?? null,
            orderId: row.orderId ?? null,
            paymentId: row.paymentId ?? null,
            signature: row.signature ?? null,
            amount: row.amount,
            currency: row.currency,
            status: row.status,
            paymentMode: row.paymentMode,
            paymentDate: row.paymentDate ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
//# sourceMappingURL=payment.repository.pg.js.map