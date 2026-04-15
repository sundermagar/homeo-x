export interface QueueEntry {
  id: string;
  tenantId: string;
  visitId: string;
  tokenNumber: number;
  tokenDisplay: string;
  position: number;
  priority: number;
  status: string;
  calledAt?: string;
  completedAt?: string;
  estimatedWaitMin?: number;
  notes?: string;
  createdAt: string;
  visit: {
    id: string;
    visitNumber: string;
    chiefComplaint?: string;
    specialty: string;
    status: string;
    patient?: { id: string; firstName: string; lastName: string; mrn: string; gender?: string };
    doctor?: { id: string; firstName: string; lastName: string };
    vitals?: { pulseRate?: number; systolicBp?: number; diastolicBp?: number; temperatureF?: number };
  };
}

export interface QueueStats {
  totalToday: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  skipped: number;
  avgWaitMin: number;
}
