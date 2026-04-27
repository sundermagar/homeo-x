import type {
  Appointment, WaitlistEntry, AvailabilitySlot,
  CreateAppointmentDto, UpdateAppointmentDto,
} from '@mmc/types';

export interface AppointmentFilters {
  date?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: number;
  clinicId?: number;
  status?: string;
  search?: string;
  patientId?: number;
  page?: number;
  limit?: number;
}

export interface AppointmentRepository {
  // Queries
  findMany(filters: AppointmentFilters): Promise<{ data: Appointment[]; total: number }>;
  findToday(doctorId?: number, clinicId?: number): Promise<Appointment[]>;
  findById(id: number): Promise<Appointment | null>;
  findAvailableSlots(doctorId: number, date: string): Promise<AvailabilitySlot[]>;

  // Mutations
  create(dto: CreateAppointmentDto): Promise<number>;
  update(id: number, dto: UpdateAppointmentDto): Promise<void>;
  softDelete(id: number): Promise<void>;
  updateStatus(id: number, status: string, cancellationReason?: string): Promise<void>;
  issueToken(appointmentId: number): Promise<number>;

  // Waitlist
  getWaitlist(date: string, doctorId?: number, clinicId?: number): Promise<WaitlistEntry[]>;
  addToWaitlist(dto: { patientId?: number; appointmentId?: number; doctorId?: number; consultationFee?: number; clinicId?: number }): Promise<number>;
  callNextInWaitlist(waitlistId: number): Promise<void>;
  completeWaitlistEntry(waitlistId: number): Promise<void>;
  skipWaitlistEntry(waitlistId: number): Promise<void>;

  // Internal helpers
  promoteWaitlist(doctorId: number | null, date: string, time: string | null): Promise<void>;
}
