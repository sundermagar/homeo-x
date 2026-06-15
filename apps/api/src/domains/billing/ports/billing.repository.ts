import type { Bill, BillWithPatient, DailyCollectionSummary, PatientBillSummary } from '@mmc/types';
import type { CreateBillInput, ListBillsQuery } from '@mmc/validation';

/**
 * BillingRepository Port — defines what the domain needs from persistence.
 * The infrastructure layer provides the concrete adapter (PostgreSQL, in-memory, etc.)
 */
export interface PatientBalance {
  regid: number;
  patientName: string;
  doctorName: string | null;
  balance: number;
  notes: string | null;
  lastBillDate: string | null;
}

export interface BillingRepository {
  findById(id: number): Promise<Bill | null>;
  findAll(params: ListBillsQuery, clinicId?: number): Promise<{ data: BillWithPatient[]; total: number }>;
  findByRegid(regid: number): Promise<PatientBillSummary>;
  findDailyCollection(date: string, clinicId?: number): Promise<DailyCollectionSummary>;
  getPatientBalances(clinicId?: number): Promise<PatientBalance[]>;
  updateBalanceNote(regid: number, note: string): Promise<boolean>;
  create(data: CreateBillInput & { billNo: number }): Promise<Bill>;
  updateReceived(id: number, amount: number, paymentMode: string): Promise<Bill | null>;
  updateCharges(id: number, amount: number): Promise<Bill | null>;
  updateAdditionalChargeBill(regid: number, date: string, oldName: string, newName: string, amount: number): Promise<boolean>;
  deleteAdditionalChargeBill(regid: number, date: string, name: string): Promise<boolean>;
  deleteUnpaidConsultationBill(regid: number, date: string): Promise<boolean>;
  nextBillNo(): Promise<number>;
  softDelete(id: number): Promise<boolean>;
}
