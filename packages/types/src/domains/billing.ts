// ─── Bill Domain Entity ───────────────────────────────────────────────────────

export interface Bill {
  id: number;
  regid: number;
  billNo: number | null;
  billDate: string | null;
  /** Total treatment charges */
  charges: number;
  /** Amount received from patient */
  received: number;
  /** Outstanding balance (charges - received) */
  balance: number;
  paymentMode: PaymentMode | null;
  treatment: string | null;
  disease: string | null;
  fromDate: string | null;
  toDate: string | null;
  chargeId: number | null;
  doctorId: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Bill enriched with patient info (for list views) */
export interface BillWithPatient extends Bill {
  patientName: string;
  phone: string | null;
}

// ─── Payment Domain Entity ────────────────────────────────────────────────────

export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Completed';
export type PaymentMode = 'Cash' | 'Card' | 'Cheque' | 'UPI' | 'Online' | 'Bank Transfer';

export interface Payment {
  id: number;
  regid: number | null;
  billId: number | null;
  /** Razorpay order ID (null for manual payments) */
  orderId: string | null;
  /** Razorpay payment ID (null for manual payments) */
  paymentId: string | null;
  /** Razorpay HMAC signature (null for manual payments) */
  signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMode: PaymentMode;
  paymentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Payment enriched with patient info (for history views) */
export interface PaymentWithPatient extends Payment {
  patientName: string;
  phone: string | null;
}

// ─── Daily Collection Summary ─────────────────────────────────────────────────

export interface DailyCollectionSummary {
  date: string;
  totalCharges: number;
  totalReceived: number;
  totalBalance: number;
  recordCount: number;
  records: BillWithPatient[];
}

// ─── Patient Bill Summary ─────────────────────────────────────────────────────

export interface PatientBillSummary {
  bills: Bill[];
  totals: {
    totalCharges: number;
    totalReceived: number;
    totalBalance: number;
  };
}
