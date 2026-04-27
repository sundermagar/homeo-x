import type { AppointmentStatus, VisitType, TokenStatus } from '../enums';

export interface Appointment {
  id: number;
  patientId: number | null;
  doctorId: number | null;
  bookingDate: string | null;          // YYYY-MM-DD
  bookingTime: string | null;          // "09:00 AM"
  status: AppointmentStatus;
  visitType: VisitType | null;
  consultationFee: string | null;
  tokenNo: number | null;
  notes: string | null;
  phone: string | null;
  patientName: string | null;
  cancellationReason: string | null;
  // Joined fields (from API)
  doctorName?: string;
  patientNameFromCase?: string;
  patientMobile?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Token {
  id: number;
  patientId: number | null;
  doctorId: number | null;
  tokenNo: number;
  date: string;                        // YYYY-MM-DD
  status: TokenStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitlistEntry {
  id: number;
  patientId: number | null;
  appointmentId: number | null;
  doctorId: number | null;
  waitingNumber: number;
  date: string;                        // YYYY-MM-DD
  status: number;                      // 0=waiting 1=called 2=done
  consultationFee: string | null;
  checkedInAt: Date | null;
  calledAt: Date | null;
  completedAt: Date | null;
  // Joined fields
  patientName?: string;
  patientMobile?: string;
  doctorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
  booked: boolean;
  isPast: boolean;
}

export interface CreateAppointmentDto {
  patientId?: number;
  patientName?: string;
  phone?: string;
  doctorId?: number;
  bookingDate: string;
  bookingTime?: string;
  visitType?: VisitType;
  consultationFee?: number;
  notes?: string;
  allowWaitlist?: boolean;
  clinicId?: number;
}

export interface UpdateAppointmentDto {
  status?: AppointmentStatus;
  bookingDate?: string;
  bookingTime?: string;
  doctorId?: number;
  notes?: string;
  visitType?: VisitType;
  consultationFee?: number;
  cancellationReason?: string;
  clinicId?: number;
}
