// ─── Additional Charges Domain Entity ──────────────────────────────────────────

export interface AdditionalCharge {
  id: number;
  regid: number | null;
  randId: string | null;
  dateval: string | null;
  additionalName: string | null;
  additionalPrice: number;
  additionalQuantity: number;
  receivedPrice: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: string | null;
}

export interface AdditionalChargeWithPatient extends AdditionalCharge {
  patientName: string;
  phone: string | null;
}

// ─── Day Charges Domain Entity ──────────────────────────────────────────────────

export interface DayCharge {
  id: number;
  days: string | null;
  regularCharges: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: string | null;
}

// ─── Bank Deposit Domain Entity ────────────────────────────────────────────────

export interface BankDeposit {
  id: number;
  clinicId: number | null;
  depositDate: string;
  dateval: string | null;
  amount: string | null;
  remark: string | null;
  bankdeposit: string | null;
  comments: string | null;
  submitted: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

// ─── Cash Deposit Domain Entity ────────────────────────────────────────────────

export interface CashDeposit {
  id: number;
  clinicId: number | null;
  depositDate: string;
  dateval: string | null;
  amount: string | null;
  remark: string | null;
  bankdeposit: string | null;
  comments: string | null;
  submitted: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

// ─── Expense Transaction Domain Entity ─────────────────────────────────────────

export interface Expense {
  id: number;
  clinicId: number | null;
  dateval: string | null;
  expDate: string | null;
  head: number | null;
  amount: number | null;
  detail: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: string | null;
}

export interface ExpenseWithHead extends Expense {
  headName: string | null;
  shortName: string | null;
}

export interface ExpenseHead {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean | null;
}

