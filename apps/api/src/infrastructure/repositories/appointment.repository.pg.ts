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

    const conditions: any[] = [isNull(schema.appointments.deletedAt)];

    if (date) {
      conditions.push(sql`(
        ${schema.appointments.bookingDate}::text LIKE '%' || ${date} || '%'
        OR ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${date}::date, 'YYYY-MM-DD') || '%'
        OR ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${date}::date, 'DD/MM/YYYY') || '%'
      )`);
    }
    if (fromDate)  conditions.push(gte(schema.appointments.bookingDate, fromDate));
    if (toDate)    conditions.push(lte(schema.appointments.bookingDate, toDate));
    if (status)    conditions.push(eq(schema.appointments.status, status));
    if (patientId) conditions.push(eq(schema.appointments.patientId, patientId));
    if (search) {
      conditions.push(or(
        ilike(schema.appointments.patientName, `%${search}%`),
        ilike(schema.appointments.phone, `%${search}%`)
      ));
    }

    if (doctorId) {
      conditions.push(sql`(
        ${schema.appointments.doctorId} = ${doctorId} 
        OR (SELECT name FROM users WHERE id = ${doctorId}) IN (
          SELECT name FROM doctors WHERE id = ${schema.appointments.doctorId}
          UNION SELECT name FROM users WHERE id = ${schema.appointments.doctorId}
        )
      )`);
    }

    const where = and(...conditions);

    const rows = await this.db
      .select({
        appointment: schema.appointments,
        doctorName: sql<string>`COALESCE((SELECT name FROM doctors WHERE id = ${schema.appointments.doctorId}), (SELECT name FROM users WHERE id = ${schema.appointments.doctorId}), 'Practitioner')`
      })
      .from(schema.appointments)
      .where(where)
      .orderBy(desc(schema.appointments.id))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.appointments)
      .where(where);

    return { 
      data: rows.map(r => ({ ...mapRow(r.appointment), doctorName: r.doctorName })),
      total: countResult?.count ?? 0 
    };
  }

  async findToday(doctorId?: number) {
    const today = new Date().toISOString().split('T')[0];
    
    // Using Drizzle select for automatic mapping
    const conditions: any[] = [
      isNull(schema.appointments.deletedAt),
      sql`(
        ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${today}::date, 'YYYY-MM-DD') || '%'
        OR ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${today}::date, 'DD/MM/YYYY') || '%'
      )`
    ];

    if (doctorId) {
      conditions.push(sql`(
        ${schema.appointments.doctorId} = ${doctorId} 
        OR (SELECT name FROM users WHERE id = ${doctorId}) IN (
          SELECT name FROM doctors WHERE id = ${schema.appointments.doctorId}
          UNION SELECT name FROM users WHERE id = ${schema.appointments.doctorId}
        )
      )`);
    }

    const rows = await this.db
      .select({
        appointment: schema.appointments,
        doctorName: sql<string>`COALESCE((SELECT name FROM doctors WHERE id = ${schema.appointments.doctorId}), (SELECT name FROM users WHERE id = ${schema.appointments.doctorId}), 'Practitioner')`
      })
      .from(schema.appointments)
      .where(and(...conditions))
      .orderBy(asc(schema.appointments.bookingTime));

    return rows.map(r => ({
      ...mapRow(r.appointment),
      doctorName: r.doctorName
    }));
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

    const now = new Date();
    const tz = process.env.TZ || 'Asia/Kolkata';
    
    // Safely get YYYY-MM-DD in the target timezone
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const isToday = date === today;

    // Safely get local hours and minutes
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = timeFormatter.formatToParts(now);
    let hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    if (hours === 24) hours = 0;
    const currentMins = hours * 60 + parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

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
    let normalizedDate = dto.bookingDate;
    if (normalizedDate && normalizedDate.includes('/')) {
      const parts = normalizedDate.split('/');
      if (parts.length === 3 && parts[2]!.length === 4) {
        normalizedDate = `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`;
      }
    } else if (normalizedDate && normalizedDate.includes('-')) {
      const parts = normalizedDate.split('-');
      if (parts.length === 3 && parts[0]!.length !== 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        normalizedDate = `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`;
      }
    }

    const [row] = await this.db
      .insert(schema.appointments)
      .values({
        patientId:       dto.patientId ?? null,
        doctorId:        dto.doctorId ?? null,
        bookingDate:     normalizedDate,
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

    // SYNC: If the appointment is being cancelled or marked absent, 
    // remove it from the active waitlist queue so it leaves the dashboard.
    if (status === 'Cancelled' || status === 'Absent') {
      await this.db.update(schema.waitlist)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.waitlist.appointmentId, id));
    }
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
    const conditions: any[] = [
      isNull(schema.waitlist.deletedAt),
      sql`(
        ${schema.waitlist.date}::text = ${date} 
        OR ${schema.waitlist.date}::text = TO_CHAR(${date}::date, 'DD/MM/YYYY')
        OR ${schema.waitlist.date}::text LIKE '%' || TO_CHAR(${date}::date, 'DD/MM/YYYY') || '%'
      )`
    ];

    if (doctorId) {
      conditions.push(sql`(
        ${schema.waitlist.doctorId} = ${doctorId} 
        OR (SELECT name FROM users WHERE id = ${doctorId}) IN (
          SELECT name FROM doctors WHERE id = ${schema.waitlist.doctorId}
          UNION SELECT name FROM users WHERE id = ${schema.waitlist.doctorId}
        )
      )`);
    }

    const rows = await this.db
      .select({
        waitlist: schema.waitlist,
        patientName: sql<string>`COALESCE((SELECT first_name || ' ' || surname FROM patients WHERE id = ${schema.waitlist.patientId}), (SELECT patient_name FROM appointments WHERE id = ${schema.waitlist.appointmentId}))`,
        doctorName: sql<string>`COALESCE((SELECT name FROM doctors WHERE id = ${schema.waitlist.doctorId}), (SELECT name FROM users WHERE id = ${schema.waitlist.doctorId}), 'Practitioner')`
      })
      .from(schema.waitlist)
      .where(and(...conditions))
      .orderBy(asc(schema.waitlist.waitingNumber));

    return rows.map(r => ({
      ...r.waitlist,
      patientName: r.patientName,
      doctorName: r.doctorName,
      consultationFee: r.waitlist.consultationFee?.toString() || null,
    }));
  }

  async addToWaitlist(dto: { patientId?: number; appointmentId?: number; doctorId?: number; consultationFee?: number }): Promise<number> {
    const today = new Date().toISOString().split('T')[0] as string;

    // Preventive check: Is this patient already in the waitlist for today?
    if (dto.patientId) {
      const existing = await this.db.select()
        .from(schema.waitlist)
        .where(and(
          eq(schema.waitlist.patientId, dto.patientId),
          eq(schema.waitlist.date, today),
          or(
            eq(schema.waitlist.status, 0), // Waiting
            eq(schema.waitlist.status, 1)  // In Progress
          ),
          isNull(schema.waitlist.deletedAt)
        ))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Patient is already in the queue for today.');
      }
    }
    
    let pid = dto.patientId;
    let did = dto.doctorId;
    let fee = dto.consultationFee;

    // 1. Resolve missing fields from appointment if possible
    if (!pid && dto.appointmentId) {
      const appt = await this.findById(dto.appointmentId);
      if (appt) {
        pid = appt.patientId || undefined;
        if (!did) did = appt.doctorId || undefined;
        if (fee === undefined && appt.consultationFee) fee = Number(appt.consultationFee);

        // 2. If pid is still null, try finding patient by name/phone from the appointment record
        if (!pid && appt.patientName) {
           const [found] = await this.db.execute(sql`
             SELECT id FROM patients 
             WHERE (first_name || ' ' || surname ILIKE ${appt.patientName} OR mobile1 = ${appt.phone || ''})
               AND (deleted_at IS NULL OR deleted_at::text = '' OR deleted_at::text = '0')
             ORDER BY id DESC LIMIT 1
           `) as any[];
           if (found) pid = found.id;
        }

        // 3. Last Reseach: If still no patient record found, create a new one on-the-fly to satisfy NOT NULL constraint
        if (!pid) {
           const names = (appt.patientName || 'Unknown Patient').split(' ');
           const firstName = names[0] || 'Unknown';
           const surname = names.slice(1).join(' ') || 'Patient';
           
           // Standardize ID generation to match PatientRepositoryPg.create (legacy compatibility)
           const maxRows = await this.db.execute(sql`SELECT coalesce(max(regid), 1000) as max_regid FROM patients`) as any[];
           const nextRegid = Number(maxRows[0]?.max_regid || 1000) + 1;

           const [newPat] = await this.db.execute(sql`
             INSERT INTO patients (id, first_name, surname, mobile1, regid, created_at, updated_at)
             VALUES (${nextRegid}, ${firstName}, ${surname}, ${appt.phone || ''}, ${nextRegid}, NOW(), NOW())
             RETURNING id
           `) as any[];
           pid = newPat?.id;
        }
      }
    }

    // Ensure we have a valid PID (Final fallback to a generic patient or error if absolutely needed, 
    // but the aboveProvision logic should handle 99% of cases)
    if (!pid) {
       throw new Error("Could not resolve patient for waitlist. Please ensure patient record exists.");
    }

    let finalAppointmentId = dto.appointmentId;

    // 4. Create an automatic appointment if this is a direct Token Queue addition (Walk-In)
    if (!finalAppointmentId) {
      const now = new Date();
      const timeStr = `${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      
      const [newAppt] = await this.db.insert(schema.appointments).values({
        patientId: pid,
        doctorId: did ?? null,
        bookingDate: today,
        bookingTime: timeStr,
        status: AppointmentStatus.Waitlist,
        visitType: 'Walk-In',
        consultationFee: fee?.toString() ?? null,
      }).returning({ id: schema.appointments.id });
      finalAppointmentId = newAppt?.id;
    } else {
      // If it exists, ensure its status is marked as Waitlist so the dashboard treats it as waiting
      await this.db.update(schema.appointments)
        .set({ status: AppointmentStatus.Waitlist, updatedAt: new Date() })
        .where(eq(schema.appointments.id, finalAppointmentId));
    }

    const [result] = await this.db
      .select({ maxNum: sql<number>`coalesce(max(waiting_number), 0)` })
      .from(schema.waitlist)
      .where(eq(schema.waitlist.date, today));

    const nextNum = (result?.maxNum ?? 0) + 1;
    await this.db.insert(schema.waitlist).values({
      patientId:       pid,
      appointmentId:   finalAppointmentId ?? null,
      doctorId:        did ?? null,
      waitingNumber:   nextNum,
      date:            today,
      status:          0,
      consultationFee: fee?.toString() ?? null,
      checkedInAt:     new Date(),
    });
    return nextNum;
  }

  async callNextInWaitlist(waitlistId: number): Promise<void> {
    await this.db
      .update(schema.waitlist)
      .set({ status: 1, calledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));

    // SYNC: Ensure linked appointment is also in Consultation status
    const [row] = await this.db
      .select({ appointmentId: schema.waitlist.appointmentId })
      .from(schema.waitlist)
      .where(eq(schema.waitlist.id, waitlistId));

    if (row?.appointmentId) {
      await this.db
        .update(schema.appointments)
        .set({ status: AppointmentStatus.Consultation, updatedAt: new Date() })
        .where(eq(schema.appointments.id, row.appointmentId));
    }
  }

  async completeWaitlistEntry(waitlistId: number): Promise<void> {
    await this.db
      .update(schema.waitlist)
      .set({ status: 2, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));

    const [row] = await this.db
      .select({ appointmentId: schema.waitlist.appointmentId })
      .from(schema.waitlist)
      .where(eq(schema.waitlist.id, waitlistId));

    if (row?.appointmentId) {
      await this.db
        .update(schema.appointments)
        .set({ status: AppointmentStatus.Completed, updatedAt: new Date() })
        .where(eq(schema.appointments.id, row.appointmentId));
    }
  }

  async skipWaitlistEntry(waitlistId: number): Promise<void> {
    const [entry] = await this.db
      .select()
      .from(schema.waitlist)
      .where(and(
        eq(schema.waitlist.id, waitlistId),
        sql`(${schema.waitlist.deletedAt} IS NULL OR ${schema.waitlist.deletedAt}::text = '')`
      ));

    if (!entry) return;

    // 1. Reset current patient back to waiting in waitlist
    await this.db
      .update(schema.waitlist)
      .set({ status: 0, calledAt: null, updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));

    // SYNC: Also reset current patient's appointment status
    if (entry.appointmentId) {
      await this.db
        .update(schema.appointments)
        .set({ status: AppointmentStatus.Waitlist, updatedAt: new Date() })
        .where(eq(schema.appointments.id, entry.appointmentId));
    }

    // 2. Find the next waiting patient (status=0) for same doctor and date
    const today = new Date().toISOString().split('T')[0] as string;
    const conditions: any[] = [
      sql`(${schema.waitlist.deletedAt} IS NULL OR ${schema.waitlist.deletedAt}::text = '')`,
      eq(schema.waitlist.status, 0),
      sql`${schema.waitlist.date}::text LIKE '%' || ${today} || '%'`
    ];
    if (entry.doctorId) {
      conditions.push(eq(schema.waitlist.doctorId, entry.doctorId));
    }

    const [next] = await this.db
      .select()
      .from(schema.waitlist)
      .where(and(...conditions))
      .orderBy(asc(schema.waitlist.waitingNumber))
      .limit(1);

    // 3. Promote next patient to consultation
    if (next) {
      await this.db
        .update(schema.waitlist)
        .set({ status: 1, calledAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.waitlist.id, next.id));

      // SYNC: Also set next patient's appointment status to Consultation
      if (next.appointmentId) {
        await this.db
          .update(schema.appointments)
          .set({ status: AppointmentStatus.Consultation, updatedAt: new Date() })
          .where(eq(schema.appointments.id, next.appointmentId));
      }
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
