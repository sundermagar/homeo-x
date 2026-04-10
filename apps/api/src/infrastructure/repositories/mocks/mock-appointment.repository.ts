import type { 
  Appointment, WaitlistEntry, AvailabilitySlot, 
  CreateAppointmentDto, UpdateAppointmentDto 
} from '@mmc/types';
import { AppointmentStatus } from '@mmc/types';
import type { AppointmentRepository, AppointmentFilters } from '../../../domains/appointment/ports/appointment.repository';

const TODAY = new Date().toISOString().split('T')[0]!;

const MOCK_APPOINTMENTS: any[] = [
  { id: 1, patientId: 10, doctorId: 101, bookingDate: TODAY, bookingTime: '09:30 AM', status: AppointmentStatus.Confirmed, patientName: 'John Doe', doctorName: 'Dr. Demo', tokenNo: 1 },
  { id: 2, patientId: 11, doctorId: 101, bookingDate: TODAY, bookingTime: '10:00 AM', status: AppointmentStatus.Arrived, patientName: 'Jane Smith', doctorName: 'Dr. Demo', tokenNo: 2 },
  { id: 3, patientId: 12, doctorId: 102, bookingDate: TODAY, bookingTime: '11:00 AM', status: AppointmentStatus.Pending, patientName: 'Robert Brown', doctorName: 'Dr. Specialist' },
  { id: 4, patientId: 13, doctorId: 101, bookingDate: TODAY, bookingTime: '11:45 AM', status: AppointmentStatus.Consultation, patientName: 'Emily White', doctorName: 'Dr. Demo', tokenNo: 3 },
  { id: 5, patientId: 14, doctorId: 101, bookingDate: TODAY, bookingTime: '01:00 PM', status: AppointmentStatus.Pending, patientName: 'Michael Scott', doctorName: 'Dr. Demo' },
];

const MOCK_WAITLIST: any[] = [
  { id: 1, patientId: 10, appointmentId: 1, doctorId: 101, waitingNumber: 1, date: TODAY, status: 2, patientName: 'John Doe', doctorName: 'Dr. Demo' },
  { id: 2, patientId: 11, appointmentId: 2, doctorId: 101, waitingNumber: 2, date: TODAY, status: 1, patientName: 'Jane Smith', doctorName: 'Dr. Demo' },
  { id: 3, patientId: 13, appointmentId: 4, doctorId: 101, waitingNumber: 3, date: TODAY, status: 0, patientName: 'Emily White', doctorName: 'Dr. Demo' },
];

export class MockAppointmentRepository implements AppointmentRepository {
  async findMany(filters: AppointmentFilters) {
    let data = [...MOCK_APPOINTMENTS];
    if (filters.doctorId) data = data.filter(a => a.doctorId === filters.doctorId);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(a => a.patientName?.toLowerCase().includes(s));
    }
    return { data, total: data.length };
  }

  async findToday(doctorId?: number) {
    let data = MOCK_APPOINTMENTS.filter(a => a.bookingDate === TODAY);
    if (doctorId) data = data.filter(a => a.doctorId === doctorId);
    return data;
  }

  async findById(id: number): Promise<Appointment | null> {
    return MOCK_APPOINTMENTS.find(a => a.id === id) || null;
  }

  async findAvailableSlots(doctorId: number, date: string): Promise<AvailabilitySlot[]> {
    const slots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM'];
    const booked = new Set(MOCK_APPOINTMENTS.filter(a => a.bookingDate === date && a.doctorId === doctorId).map(a => a.bookingTime));
    
    return slots.map(time => ({
      time,
      available: !booked.has(time),
      booked: booked.has(time),
      isPast: false
    }));
  }

  async create(dto: CreateAppointmentDto): Promise<number> {
    const id = MOCK_APPOINTMENTS.length + 1;
    MOCK_APPOINTMENTS.push({
      ...dto,
      id,
      status: AppointmentStatus.Pending,
      createdAt: new Date(),
    } as any);
    return id;
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<void> {
    const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
    if (idx !== -1) MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...dto } as any;
  }

  async softDelete(id: number): Promise<void> {
    const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
    if (idx !== -1) MOCK_APPOINTMENTS.splice(idx, 1);
  }

  async updateStatus(id: number, status: string): Promise<void> {
    const a = MOCK_APPOINTMENTS.find(x => x.id === id);
    if (a) a.status = status as AppointmentStatus;
  }

  async issueToken(id: number): Promise<number> {
    const a = MOCK_APPOINTMENTS.find(x => x.id === id);
    if (a) {
      if (a.tokenNo) return a.tokenNo;
      const maxToken = Math.max(0, ...MOCK_APPOINTMENTS.map(x => x.tokenNo || 0));
      a.tokenNo = maxToken + 1;
      return a.tokenNo;
    }
    return 0;
  }

  async getWaitlist(date: string, doctorId?: number) {
    let data = MOCK_WAITLIST.filter(w => w.date === date);
    if (doctorId) data = data.filter(w => w.doctorId === doctorId);
    return data;
  }

  async addToWaitlist(dto: any) {
    const id = MOCK_WAITLIST.length + 1;
    MOCK_WAITLIST.push({ ...dto, id, waitingNumber: id, date: TODAY, status: 0 });
    return id;
  }

  async callNextInWaitlist(id: number) {
    const w = MOCK_WAITLIST.find(x => x.id === id);
    if (w) w.status = 1;
  }

  async completeWaitlistEntry(id: number) {
    const w = MOCK_WAITLIST.find(x => x.id === id);
    if (w) w.status = 2;
  }

  async promoteWaitlist() {}
}
