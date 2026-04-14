export interface Lead {
  id: number;
  name?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  source?: string | null;
  status?: string | null;
  notes?: string | null;
  assignedTo?: number | null;
  createdAt: string;
  updatedAt: string;
  followups?: LeadFollowup[];
}

export interface LeadFollowup {
  id: number;
  leadId: number;
  name?: string | null;       // notes/description
  task?: string | null;
  taskstatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: number;
  regid?: number | null;
  referralId?: number | null;
  totalAmount?: string | null;
  usedAmount?: string | null;
  createdAt: string;
  updatedAt: string;
  // JOINed
  first_name?: string;
  surname?: string;
}

export interface CaseReminder {
  id: number;
  regid?: number | null;
  patientId?: number | null;
  startDate?: string | null;
  remindTime?: string | null;
  heading?: string | null;
  comments?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  // JOINed
  patient_name?: string;
  patient_mobile?: string;
}
