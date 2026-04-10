import type { Payment, PaymentWithPatient } from '@mmc/types';
import type { RecordManualPaymentInput, ListPaymentsQuery } from '@mmc/validation';

/**
 * PaymentRepository Port — defines what the domain needs from persistence.
 * The infrastructure layer provides the concrete adapter (PostgreSQL, in-memory, etc.)
 */
export interface PaymentRepository {
  findById(id: number): Promise<PaymentWithPatient | null>;
  findAll(params: ListPaymentsQuery): Promise<{ data: PaymentWithPatient[]; total: number }>;
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
}
