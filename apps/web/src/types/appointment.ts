export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  appointmentNumber: string;
  status: AppointmentStatus;
  appointmentType: string;
  scheduledAt: string;
  durationMinutes: number;
  chiefComplaint?: string;
  notes?: string;
  cancelReason?: string;
  confirmedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  visitId?: string;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  doctor?: { id: string; firstName: string; lastName: string };
}

export interface DoctorSchedule {
  id: string;
  tenantId: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  isActive: boolean;
}

export interface AvailableSlot {
  time: string;
  datetime: string;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: AvailableSlot[];
  totalSlots: number;
  availableCount: number;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  specialty: string;
  scheduledAt: string;
  durationMinutes?: number;
  appointmentType?: string;
  chiefComplaint?: string;
  notes?: string;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface QueryAppointmentParams {
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}
