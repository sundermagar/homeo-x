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

export interface DashboardKpis {
  newPatientsCount: number;
  followUpsCount: number;
  todaysCollection: number;
  todaysExpenses: number;
  revenueTrend: number | string;
  patientTrend: number | string;
  collectionRate: number;
  avgWaitTime: number;
}

export interface QueueItem {
  id: number;
  patientId: number;
  regid: number;
  patientName: string;
  doctorName: string;
  bookingTime: string;
  tokenNo: number | string;
  status: string;
  isUrgent: boolean;
  vitals?: {
    bp?: string;
    pulse?: number;
    weight?: number;
    temp?: number;
  };
  notes?: string;
  age?: number;
  gender?: string;
}

export interface ActivityItem {
  type: 'payment' | 'appointment' | 'record';
  title: string;
  subtitle: string;
  createdAt: Date | string;
}

export interface SimpleReminder {
  id: number;
  patientId: number;
  patientName: string;
  heading: string;
  comments: string;
  startDate: Date | string;
  status: 'pending' | 'done';
}

export interface RevenueSeries {
  month: string;
  revenue: number;
}

export interface UnifiedDashboardData {
  kpis: DashboardKpis;
  queue: QueueItem[];
  activity: ActivityItem[];
  reminders: SimpleReminder[];
  birthdays: BirthdayPatient[];
  revenueSeries: RevenueSeries[];
  clinicName: string;
}
