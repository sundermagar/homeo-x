export interface Bill {
  id: number;
  regid: number;
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentMode: string | null;
  notes: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}
