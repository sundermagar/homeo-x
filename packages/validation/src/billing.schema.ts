import { z } from 'zod';

// ─── Shared Enums ─────────────────────────────────────────────────────────────

export const PaymentModeEnum = z.enum(['Cash', 'Card', 'Cheque', 'UPI', 'Online', 'Bank Transfer']);

// ─── Bill Schemas ─────────────────────────────────────────────────────────────

export const createBillSchema = z.object({
  regid: z.number().int().positive('Patient Reg ID is required'),
  charges: z.number().min(0, 'Charges must be non-negative'),
  received: z.number().min(0).default(0),
  paymentMode: PaymentModeEnum.default('Cash'),
  billDate: z.string().optional(),
  treatment: z.string().max(255).optional(),
  disease: z.string().max(255).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  chargeId: z.number().int().positive().optional(),
  doctorId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const updateBillSchema = createBillSchema.partial().omit({ regid: true });

export const listBillsQuerySchema = z.object({
  regid: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

// ─── Payment Schemas ──────────────────────────────────────────────────────────

export const createPaymentOrderSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  regid: z.number().int().positive().optional(),
  billId: z.number().int().positive().optional(),
  notes: z.record(z.string()).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  regid: z.number().int().positive().optional(),
  billId: z.number().int().positive().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().default('INR'),
  paymentMode: PaymentModeEnum.default('Online'),
});

export const recordManualPaymentSchema = z.object({
  regid: z.number().int().positive('Patient Reg ID is required'),
  billId: z.number().int().positive().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: PaymentModeEnum.default('Cash'),
  receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  regid: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

// ─── Additional Charges Schemas ────────────────────────────────────────────────

export const createAdditionalChargeSchema = z.object({
  regid: z.coerce.number().int().positive().optional(),
  additionalName: z.string().min(1, 'Charge name is required'),
  additionalPrice: z.coerce.number().int().min(0).default(0),
  additionalQuantity: z.coerce.number().int().min(1).default(1),
  receivedPrice: z.coerce.number().int().min(0).default(0),
  randId: z.string().optional(),
  dateval: z.string().optional(),
});

export const updateAdditionalChargeSchema = createAdditionalChargeSchema.partial();

export const listAdditionalChargesQuerySchema = z.object({
  regid: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateAdditionalChargeInput = z.infer<typeof createAdditionalChargeSchema>;
export type UpdateAdditionalChargeInput = z.infer<typeof updateAdditionalChargeSchema>;
export type ListAdditionalChargesQuery = z.infer<typeof listAdditionalChargesQuerySchema>;

// ─── Day Charges Schemas ────────────────────────────────────────────────────────

export const createDayChargeSchema = z.object({
  days: z.string().min(1, 'Days duration is required').max(50),
  regularCharges: z.number().min(0, 'Charges must be non-negative'),
});

export const updateDayChargeSchema = createDayChargeSchema.partial();

export type CreateDayChargeInput = z.infer<typeof createDayChargeSchema>;
export type UpdateDayChargeInput = z.infer<typeof updateDayChargeSchema>;

// ─── Bank Deposit Schemas ───────────────────────────────────────────────────────

export const createBankDepositSchema = z.object({
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.string().min(1, 'Amount is required'),
  remark: z.string().optional(),
  bankdeposit: z.string().optional(),
  comments: z.string().optional(),
  submitted: z.enum(['Yes', 'No']).default('No'),
});

export const updateBankDepositSchema = createBankDepositSchema.partial();

export const listDepositsQuerySchema = z.object({
  type: z.enum(['Bank', 'Cash']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateBankDepositInput = z.infer<typeof createBankDepositSchema>;
export type UpdateBankDepositInput = z.infer<typeof updateBankDepositSchema>;
export type ListDepositsQuery = z.infer<typeof listDepositsQuerySchema>;

// ─── Cash Deposit Schemas ──────────────────────────────────────────────────────

export const createCashDepositSchema = z.object({
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.string().min(1, 'Amount is required'),
  remark: z.string().optional(),
  bankdeposit: z.string().optional(),
  comments: z.string().optional(),
  submitted: z.enum(['Yes', 'No']).default('No'),
});

export const updateCashDepositSchema = createCashDepositSchema.partial();

export type CreateCashDepositInput = z.infer<typeof createCashDepositSchema>;
export type UpdateCashDepositInput = z.infer<typeof updateCashDepositSchema>;

// ─── Expense Transaction Schemas ───────────────────────────────────────────────

export const createExpenseSchema = z.object({
  dateval: z.string().optional(),
  expDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  head: z.number().int().positive('Expense head is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  detail: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesQuerySchema = z.object({
  head: z.coerce.number().int().positive().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
