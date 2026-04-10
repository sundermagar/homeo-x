export interface Bill {
  id: number;
  regid: number;
  billNo: string;
  billDate: string;
  totalAmount: number;
  receivedAmount: number;
  paymentMode: string;
  status: string;
}

export interface BillingRepository {
  createBill(data: Partial<Bill>): Promise<number>;
  getNextBillNumber(): Promise<string>;
  getBillsByPatient(regid: number): Promise<Bill[]>;
}
