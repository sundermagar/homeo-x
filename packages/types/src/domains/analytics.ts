export interface AnalyticsSummary {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
}

export interface PatientTrendResult {
  newPatients: { month: string; count: number }[];
  revenueByMonth: { month: string; total: number }[];
  topDiagnoses: { diagnosis: string; count: number }[];
}

export interface MonthWiseResult {
  date: string;
  displaydate: string;
  new_cases: number;
  followups: number;
  collection: number;   
  cash: number;
  cheque: number;
  online: number;
  card: number;
  product_charges: number;
  expenses: number;
  cash_deposit: number;
  bank_deposit: number;
  cash_in_hand: number;
}

export interface MonthWiseDueSummary {
  month: number;
  count: number;
  total_due: number;
}

export interface MonthWiseDueDetail {
  regid: number;
  first_name: string;
  surname: string;
  mobile1: string;
  city: string;
  total_due: number;
  total_charges: number;
  total_received: number;
  last_bill_date: Date | string | null;
}

export interface BirthdayPatient {
  id: number;
  regid: number;
  first_name: string;
  surname: string;
  phone: string;
  mobile1: string;
  dob: Date | string | null;
  date_birth: Date | string | null;
}

export interface BirthdayListResult {
  patients: BirthdayPatient[];
  smsSentIds: number[];
}

export interface ReferenceListResult {
  reference: string;
  count: number;
  totalcollection: number;
}
