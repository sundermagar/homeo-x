import { eq, and, isNull, gte, lte, ilike, or, sql, desc, asc, max } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { Appointment, WaitlistEntry, AvailabilitySlot, CreateAppointmentDto, UpdateAppointmentDto } from '@mmc/types';
import { AppointmentStatus } from '@mmc/types';
import type { AppointmentRepository, AppointmentFilters } from '../../domains/appointment/ports/appointment.repository';

const ALL_TIME_SLOTS = [
  '08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM',
  '02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM',
  '05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM','07:30 PM','08:00 PM',
];

function toMins(t: string): number {
  if (!t) return 0;
  const [hm, period] = t.split(' ');
  if (!hm) return 0;
  let [h, m] = hm.split(':').map(Number);
  if (h === undefined || m === undefined) return 0;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function mapRow(row: typeof schema.appointments.$inferSelect): Appointment {
  return {
    id:                   row.id,
    patientId:            row.patientId,
    doctorId:             row.doctorId,
    bookingDate:          row.bookingDate,
    bookingTime:          row.bookingTime,
    status:               row.status as AppointmentStatus,
    visitType:            row.visitType as any,
    consultationFee:      row.consultationFee,
    tokenNo:              row.tokenNo,
    notes:                row.notes,
    phone:                row.phone,
    patientName:          row.patientName,
    cancellationReason:   row.cancellationReason,
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
    deletedAt:            row.deletedAt,
  };
}

export class AppointmentRepositoryPG implements AppointmentRepository {
  constructor(private readonly db: DbClient) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findMany(filters: AppointmentFilters) {
    const { date, fromDate, toDate, doctorId, status, search, patientId, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    const conditions = [isNull(schema.appointments.deletedAt)];

    if (date)      conditions.push(eq(schema.appointments.bookingDate, date));
    if (fromDate)  conditions.push(gte(schema.appointments.bookingDate, fromDate));
    if (toDate)    conditions.push(lte(schema.appointments.bookingDate, toDate));
    if (doctorId)  conditions.push(eq(schema.appointments.doctorId, doctorId));
    if (status)    conditions.push(eq(schema.appointments.status, status));
    if (patientId) conditions.push(eq(schema.appointments.patientId, patientId));
    if (search) {
      conditions.push(
        or(
          ilike(schema.appointments.patientName, `%${search}%`),
          ilike(schema.appointments.phone, `%${search}%`)
        )!
      );
    }

    const where = and(...conditions);
    const rows = await this.db
      .select()
      .from(schema.appointments)
      .where(where)
      .orderBy(desc(schema.appointments.id))
      .limit(limit)
      .offset(offset);

    const [res] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.appointments)
      .where(where);

    return { data: rows.map(mapRow), total: res?.count ?? 0 };
  }

  async findToday(doctorId?: number) {
    const today = new Date().toISOString().split('T')[0] as string;
    const conditions = [
      isNull(schema.appointments.deletedAt),
      eq(schema.appointments.bookingDate, today),
    ];
    if (doctorId) conditions.push(eq(schema.appointments.doctorId, doctorId));

    const rows = await this.db
      .select()
      .from(schema.appointments)
      .where(and(...conditions))
      .orderBy(asc(schema.appointments.bookingTime));

    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Appointment | null> {
    const [row] = await this.db
      .select()
      .from(schema.appointments)
      .where(and(eq(schema.appointments.id, id), isNull(schema.appointments.deletedAt)))
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findAvailableSlots(doctorId: number, date: string): Promise<AvailabilitySlot[]> {
    // Get booked times for this doctor + date
    const booked = await this.db
      .select({ time: schema.appointments.bookingTime })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.doctorId, doctorId),
          eq(schema.appointments.bookingDate, date),
          isNull(schema.appointments.deletedAt)
        )
      );
    const bookedTimes = new Set(booked.map(b => b.time).filter(Boolean));

    const today = new Date().toISOString().split('T')[0] as string;
    const isToday = date === today;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    return ALL_TIME_SLOTS.map(time => {
      const tMins = toMins(time);
      const isPast = isToday && tMins < currentMins;
      return {
        time,
        available: !isPast && !bookedTimes.has(time),
        booked: bookedTimes.has(time),
        isPast,
      };
    });
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto): Promise<number> {
    const [row] = await this.db
      .insert(schema.appointments)
      .values({
        patientId:       dto.patientId ?? null,
        doctorId:        dto.doctorId ?? null,
        bookingDate:     dto.bookingDate,
        bookingTime:     dto.bookingTime ?? null,
        status:          AppointmentStatus.Pending,
        visitType:       dto.visitType ?? null,
        consultationFee: dto.consultationFee?.toString() ?? null,
        notes:           dto.notes ?? null,
        phone:           dto.phone ?? null,
        patientName:     dto.patientName ?? null,
      })
      .returning({ id: schema.appointments.id });
    return row?.id ?? 0;
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<void> {
    const fields: Partial<typeof schema.appointments.$inferInsert> = {};
    if (dto.status           !== undefined) fields.status = dto.status;
    if (dto.bookingDate      !== undefined) fields.bookingDate = dto.bookingDate;
    if (dto.bookingTime      !== undefined) fields.bookingTime = dto.bookingTime;
    if (dto.doctorId         !== undefined) fields.doctorId = dto.doctorId;
    if (dto.notes            !== undefined) fields.notes = dto.notes;
    if (dto.visitType        !== undefined) fields.visitType = dto.visitType;
    if (dto.consultationFee  !== undefined) fields.consultationFee = dto.consultationFee?.toString();
    if (dto.cancellationReason !== undefined) fields.cancellationReason = dto.cancellationReason;
    fields.updatedAt = new Date();

    await this.db.update(schema.appointments).set(fields).where(eq(schema.appointments.id, id));
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(schema.appointments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.appointments.id, id));
  }

  async updateStatus(id: number, status: string, cancellationReason?: string): Promise<void> {
    const fields: any = { status, updatedAt: new Date() };
    if (cancellationReason) fields.cancellationReason = cancellationReason;
    await this.db.update(schema.appointments).set(fields).where(eq(schema.appointments.id, id));
  }

  async issueToken(appointmentId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0] as string;

    // Daily max token across both tokens and appointments table to ensure uniqueness
    const [tokenResult] = await this.db
      .select({ maxToken: sql<number>`coalesce(max(token_no), 0)` })
      .from(schema.tokens)
      .where(eq(schema.tokens.date, today));

    const [apptResult] = await this.db
      .select({ maxToken: sql<number>`coalesce(max(token_no), 0)` })
      .from(schema.appointments)
      .where(eq(schema.appointments.bookingDate, today));

    const maxToken = Math.max(tokenResult?.maxToken ?? 0, apptResult?.maxToken ?? 0);
    const nextToken = maxToken + 1;

    // Get appointment info
    const [appt] = await this.db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, appointmentId));

    // Insert into tokens table
    await this.db.insert(schema.tokens).values({
      patientId: appt?.patientId ?? null,
      doctorId:  appt?.doctorId  ?? null,
      tokenNo:   nextToken,
      date:      today,
      status:    'queued',
    });

    // Stamp token_no on appointment + confirm it
    await this.db
      .update(schema.appointments)
      .set({ tokenNo: nextToken, status: AppointmentStatus.Confirmed, updatedAt: new Date() })
      .where(eq(schema.appointments.id, appointmentId));

    return nextToken;
  }

  // ─── Waitlist ─────────────────────────────────────────────────────────────

  async getWaitlist(date: string, doctorId?: number): Promise<WaitlistEntry[]> {
    const conditions = [
      isNull(schema.waitlist.deletedAt),
      eq(schema.waitlist.date, date),
    ];
    if (doctorId) conditions.push(eq(schema.waitlist.doctorId, doctorId));

    const rows = await this.db
      .select()
      .from(schema.waitlist)
      .where(and(...conditions))
      .orderBy(asc(schema.waitlist.waitingNumber));

    return rows.map(r => ({
      id:              r.id,
      patientId:       r.patientId,
      appointmentId:   r.appointmentId,
      doctorId:        r.doctorId,
      waitingNumber:   r.waitingNumber,
      date:            r.date,
      status:          r.status,
      consultationFee: r.consultationFee,
      checkedInAt:     r.checkedInAt,
      calledAt:        r.calledAt,
      completedAt:     r.completedAt,
      createdAt:       r.createdAt,
      updatedAt:       r.updatedAt,
    }));
  }

  async addToWaitlist(dto: { patientId: number; appointmentId?: number; doctorId?: number; consultationFee?: number }): Promise<number> {
    const today = new Date().toISOString().split('T')[0] as string;
    const [result] = await this.db
      .select({ maxNum: sql<number>`coalesce(max(waiting_number), 0)` })
      .from(schema.waitlist)
      .where(eq(schema.waitlist.date, today));

    const nextNum = (result?.maxNum ?? 0) + 1;
    await this.db.insert(schema.waitlist).values({
      patientId:       dto.patientId,
      appointmentId:   dto.appointmentId ?? null,
      doctorId:        dto.doctorId ?? null,
      waitingNumber:   nextNum,
      date:            today,
      status:          0,
      consultationFee: dto.consultationFee?.toString() ?? null,
      checkedInAt:     new Date(),
    });
    return nextNum;
  }

  async callNextInWaitlist(waitlistId: number): Promise<void> {
    await this.db
      .update(schema.waitlist)
      .set({ status: 1, calledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));
  }

  async completeWaitlistEntry(waitlistId: number): Promise<void> {
    await this.db
      .update(schema.waitlist)
      .set({ status: 2, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));

    // Also mark linked appointment as Done
    const [row] = await this.db
      .select({ appointmentId: schema.waitlist.appointmentId })
      .from(schema.waitlist)
      .where(eq(schema.waitlist.id, waitlistId));

    if (row?.appointmentId) {
      await this.db
        .update(schema.appointments)
        .set({ status: AppointmentStatus.Done, updatedAt: new Date() })
        .where(eq(schema.appointments.id, row.appointmentId));
    }
  }

  async promoteWaitlist(doctorId: number | null, date: string, time: string | null): Promise<void> {
    if (!doctorId) return;
    const conditions = [
      eq(schema.appointments.status, AppointmentStatus.Waitlist),
      eq(schema.appointments.bookingDate, date),
      isNull(schema.appointments.deletedAt),
    ];
    if (doctorId) conditions.push(eq(schema.appointments.doctorId, doctorId));

    const [next] = await this.db
      .select()
      .from(schema.appointments)
      .where(and(...conditions))
      .orderBy(asc(schema.appointments.id))
      .limit(1);

    if (next) {
      await this.db
        .update(schema.appointments)
        .set({
          status: AppointmentStatus.Pending,
          bookingTime: time ?? next.bookingTime,
          updatedAt: new Date(),
        })
        .where(eq(schema.appointments.id, next.id));
    }
  }
}
