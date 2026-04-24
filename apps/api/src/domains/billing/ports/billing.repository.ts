import type { Bill, BillWithPatient, DailyCollectionSummary, PatientBillSummary } from '@mmc/types';
import type { CreateBillInput, ListBillsQuery } from '@mmc/validation';

/**
 * BillingRepository Port — defines what the domain needs from persistence.
 * The infrastructure layer provides the concrete adapter (PostgreSQL, in-memory, etc.)
 */
export interface BillingRepository {
  findById(id: number): Promise<Bill | null>;
  findAll(params: ListBillsQuery): Promise<{ data: BillWithPatient[]; total: number }>;
  findByRegid(regid: number): Promise<PatientBillSummary>;
  findDailyCollection(date: string): Promise<DailyCollectionSummary>;
  create(data: CreateBillInput & { billNo: number }): Promise<Bill>;
  updateReceived(id: number, amount: number, paymentMode: string): Promise<Bill | null>;
  nextBillNo(): Promise<number>;
  softDelete(id: number): Promise<boolean>;
}
