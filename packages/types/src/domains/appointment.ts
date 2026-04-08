import type { AppointmentStatus } from '../enums';

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  appointmentDate: Date;
  appointmentTime: string | null;
  status: AppointmentStatus;
  consultationFee: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
