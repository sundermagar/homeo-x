import type { DbClient } from '@mmc/database';
import type { Payment, PaymentWithPatient } from '@mmc/types';
import type { PaymentRepository } from '../../domains/billing/ports/payment.repository';
import type { ListPaymentsQuery } from '@mmc/validation';
export declare class PaymentRepositoryPg implements PaymentRepository {
    private readonly db;
    constructor(db: DbClient);
    findById(id: number): Promise<PaymentWithPatient | null>;
    findAll(params: ListPaymentsQuery): Promise<{
        data: PaymentWithPatient[];
        total: number;
    }>;
    create(data: {
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
    }): Promise<Payment>;
    updateStatus(id: number, status: string): Promise<Payment | null>;
    private toDomain;
}
//# sourceMappingURL=payment.repository.pg.d.ts.map