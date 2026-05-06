import { eq, and, isNull, gte, lte, ilike, or, sql, desc, asc, max, ne } from 'drizzle-orm';
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

// Returns "YYYY-MM-DD" in the process's local timezone (not UTC).
// `toISOString().split('T')[0]` returns the UTC date and rolls over wrong
// between midnight and 05:30 IST.
function todayLocalYMD(): string {
  return new Date().toLocaleDateString('en-CA');
}

// Returns "hh:mm AM/PM" in the process's local timezone.
function nowLocal12h(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
  });
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
    clinicId:             row.clinicId,
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
    deletedAt:            row.deletedAt,
  };
}

export class AppointmentRepositoryPG implements AppointmentRepository {
  constructor(private readonly db: DbClient) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findMany(filters: AppointmentFilters) {
    const { date, fromDate, toDate, doctorId, clinicId, status, search, patientId, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(schema.appointments.deletedAt)];

    if (clinicId) {
      conditions.push(eq(schema.appointments.clinicId, clinicId));
    }

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
  
  async findFollowups(filters: AppointmentFilters) {
    const { fromDate, toDate, doctorId, clinicId, search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    const todayStr = todayLocalYMD();

    // For appointments table: handle booking_date as text (may be YYYY-MM-DD or DD/MM/YYYY)
    // Helper to safely compare dates regardless of input format (YYYY-MM-DD or DD/MM/YYYY)
    const safeDateCondition = (col: string, val: string, op: string) => {
      if (!val) return sql``;
      const isIso = val.includes('-');
      const dateVal = isIso ? val : val;
      const format = isIso ? 'YYYY-MM-DD' : 'DD/MM/YYYY';
      
      return sql`AND (
        CASE 
          WHEN ${sql.raw(col)}::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN ${sql.raw(col)}::date
          WHEN ${sql.raw(col)}::text ~ '^\\d{2}/\\d{2}/\\d{4}' THEN TO_DATE(${sql.raw(col)}::text, 'DD/MM/YYYY')
          ELSE ${sql.raw(col)}::date
        END ${sql.raw(op)} TO_DATE(${dateVal}, ${format})
      )`;
    };

    const getBaseDateCompare = (col: string, op: string) => {
      return sql`(
        CASE 
          WHEN ${sql.raw(col)}::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN ${sql.raw(col)}::date
          WHEN ${sql.raw(col)}::text ~ '^\\d{2}/\\d{2}/\\d{4}' THEN TO_DATE(${sql.raw(col)}::text, 'DD/MM/YYYY')
          ELSE ${sql.raw(col)}::date
        END ${sql.raw(op)} ${todayStr}::date
      )`;
    };

    const fromDateCondition = fromDate ? safeDateCondition('a.booking_date', fromDate, '>=') : sql``;
    const toDateCondition = toDate ? safeDateCondition('a.booking_date', toDate, '<=') : sql``;
    const pendingFromDateCondition = fromDate ? safeDateCondition('p.next_date', fromDate, '>=') : sql``;
    const pendingToDateCondition = toDate ? safeDateCondition('p.next_date', toDate, '<=') : sql``;

    const apptsQuery = sql`
      SELECT
        a.id as id,
        a.patient_id as patient_id,
        a.doctor_id as doctor_id,
        (
          CASE 
            WHEN a.booking_date::text ~ '^\\d{2}/\\d{2}/\\d{4}' THEN TO_DATE(a.booking_date::text, 'DD/MM/YYYY')
            ELSE a.booking_date::date
          END
        )::date as booking_date,
        a.booking_time::text as booking_time,
        a.status::text as status,
        'Missed'::text as visit_type,
        a.consultation_fee::numeric as consultation_fee,
        a.token_no::integer as token_no,
        a.notes::text as notes,
        a.phone::text as phone,
        a.patient_name::text as patient_name,
        a.cancellation_reason::text as cancellation_reason,
        a.created_at::timestamp as created_at,
        a.updated_at::timestamp as updated_at,
        a.deleted_at::timestamp as deleted_at,
        a.clinic_id as clinic_id,
        COALESCE(d.name, u.name, 'Practitioner')::text as doctor_name
      FROM appointments a
      LEFT JOIN doctors d ON d.id = a.doctor_id
      LEFT JOIN users u ON u.id = a.doctor_id
      WHERE a.deleted_at IS NULL
        AND a.status NOT IN ('Done', 'Visited', 'Completed', 'Cancelled')
        AND ${getBaseDateCompare('a.booking_date', '<')}
        ${clinicId ? sql`AND a.clinic_id = ${clinicId}` : sql``}
        ${doctorId ? sql`AND a.doctor_id = ${doctorId}` : sql``}
        ${search ? sql`AND (a.patient_name ILIKE ${'%' + search + '%'} OR a.phone ILIKE ${'%' + search + '%'})` : sql``}
        ${fromDateCondition}
        ${toDateCondition}
    `;

    const pendingQuery = sql`
      SELECT
        p.id as id,
        p.regid as patient_id,
        NULL::integer as doctor_id,
        (
          CASE 
            WHEN p.next_date::text ~ '^\\d{2}/\\d{2}/\\d{4}' THEN TO_DATE(p.next_date::text, 'DD/MM/YYYY')
            ELSE p.next_date::date
          END
        )::date as booking_date,
        NULL::text as booking_time,
        p.call_status::text as status,
        'Next Visit'::text as visit_type,
        NULL::numeric as consultation_fee,
        NULL::integer as token_no,
        NULL::text as notes,
        cd.mobile1::text as phone,
        (COALESCE(cd.first_name, '') || ' ' || COALESCE(cd.surname, ''))::text as patient_name,
        NULL::text as cancellation_reason,
        p.created_at::timestamp as created_at,
        p.updated_at::timestamp as updated_at,
        NULL::timestamp as deleted_at,
        cd.clinic_id as clinic_id,
        'General'::text as doctor_name
      FROM pending_appointments p
      LEFT JOIN case_datas cd ON cd.regid = p.regid
      WHERE (p.deleted_at IS NULL OR p.deleted_at = '')
        AND ${getBaseDateCompare('p.next_date', '<=')}
        ${clinicId ? sql`AND cd.clinic_id = ${clinicId}` : sql``}
        ${search ? sql`AND ((COALESCE(cd.first_name, '') || ' ' || COALESCE(cd.surname, '')) ILIKE ${'%' + search + '%'} OR cd.mobile1 ILIKE ${'%' + search + '%'})` : sql``}
        ${pendingFromDateCondition}
        ${pendingToDateCondition}
    `;

    const unionQuery = sql`
      SELECT * FROM (${apptsQuery} UNION ALL ${pendingQuery}) as combined
      ORDER BY booking_date DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = sql`
      SELECT count(*)::int as total FROM (${apptsQuery} UNION ALL ${pendingQuery}) as combined
    `;

    const [rows, countRows] = await Promise.all([
      this.db.execute(unionQuery),
      this.db.execute(countQuery)
    ]);

    return {
      data: (rows as any[]).map(r => ({
        id: r.id,
        patientId: r.patient_id,
        doctorId: r.doctor_id,
        bookingDate: r.booking_date,
        bookingTime: r.booking_time,
        status: r.status,
        visitType: r.visit_type,
        consultationFee: r.consultation_fee,
        tokenNo: r.token_no,
        notes: r.notes,
        phone: r.phone,
        patientName: r.patient_name,
        cancellationReason: r.cancellation_reason,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        clinicId: r.clinic_id,
        doctorName: r.doctor_name
      })),
      total: (countRows[0] as any)?.total ?? 0
    };
  }

  async findToday(doctorId?: number, clinicId?: number) {
    const today = todayLocalYMD();
    
    // Using Drizzle select for automatic mapping
    const conditions: any[] = [
      isNull(schema.appointments.deletedAt),
      sql`(
        ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${today}::date, 'YYYY-MM-DD') || '%'
        OR ${schema.appointments.bookingDate}::text LIKE '%' || TO_CHAR(${today}::date, 'DD/MM/YYYY') || '%'
      )`
    ];

    if (clinicId) {
      conditions.push(eq(schema.appointments.clinicId, clinicId));
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

    const today = todayLocalYMD();
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
        clinicId:        dto.clinicId ?? null,
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
        createdAt:       new Date(),
        updatedAt:       new Date(),
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
    if (dto.clinicId         !== undefined) fields.clinicId = dto.clinicId;
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
    const today = todayLocalYMD();

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
      clinicId:  appt?.clinicId  ?? null,
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

  async getWaitlist(date: string, doctorId?: number, clinicId?: number): Promise<WaitlistEntry[]> {
    const conditions: any[] = [
      isNull(schema.waitlist.deletedAt),
      sql`(
        ${schema.waitlist.date}::text = ${date} 
        OR ${schema.waitlist.date}::text = TO_CHAR(${date}::date, 'DD/MM/YYYY')
        OR ${schema.waitlist.date}::text LIKE '%' || TO_CHAR(${date}::date, 'DD/MM/YYYY') || '%'
      )`
    ];

    if (clinicId) {
      conditions.push(eq(schema.waitlist.clinicId, clinicId));
    }

    if (doctorId) {
      conditions.push(sql`(
        ${schema.waitlist.doctorId} = ${doctorId} 
        OR (SELECT name FROM users WHERE id = ${doctorId}) IN (
          SELECT name FROM doctors WHERE id = ${schema.waitlist.doctorId}
          UNION SELECT name FROM users WHERE id = ${schema.waitlist.doctorId}
        )
      )`);
    }

    // Optimized Waitlist with single-trip joins
    const rows = await this.db.execute(sql`
      WITH patient_finances AS (
        SELECT 
          regid, 
          sum(balance)::text as total_balance,
          max(id) as last_bill_id
        FROM bills 
        WHERE deleted_at IS NULL
        GROUP BY regid
      ),
      active_packages AS (
        SELECT DISTINCT ON (patient_id)
          patient_id,
          pp.name as pkg_name,
          pk.expiry_date
        FROM patient_packages pk
        JOIN package_plans pp ON pp.id = pk.package_id
        WHERE pk.status = 'Active' AND pk.deleted_at IS NULL
        ORDER BY patient_id, pk.created_at DESC
      )
      SELECT
        w.*,
        COALESCE(p.first_name || ' ' || p.surname, a.patient_name) as patient_name,
        COALESCE(d.firstname || ' ' || d.surname, u.name, 'Practitioner') as doctor_name,
        COALESCE(pf.total_balance, '0') as balance,
        pf.last_bill_id as latest_bill_id,
        COALESCE(ap.pkg_name, 'Regular') as package_name,
        ap.expiry_date::text as package_expiry
      FROM waitlist w
      LEFT JOIN patients p ON p.id = w.patient_id
      LEFT JOIN appointments a ON a.id = w.appointment_id
      LEFT JOIN doctors d ON d.id = w.doctor_id
      LEFT JOIN users u ON u.id = w.doctor_id
      LEFT JOIN patient_finances pf ON pf.regid = p.regid
      LEFT JOIN active_packages ap ON ap.patient_id = w.patient_id
      WHERE (w.deleted_at IS NULL OR w.deleted_at::text = '')
        AND (
          w.date::text = ${date} 
          OR w.date::text = TO_CHAR(${date}::date, 'DD/MM/YYYY')
          OR w.date::text LIKE '%' || TO_CHAR(${date}::date, 'DD/MM/YYYY') || '%'
        )
        ${clinicId ? sql`AND w.clinic_id = ${clinicId}` : sql``}
        ${doctorId ? sql`AND (w.doctor_id = ${doctorId} OR u.name = (SELECT name FROM users WHERE id = ${doctorId}))` : sql``}
      ORDER BY w.waiting_number ASC
    `);

    return (rows as any[]).map(r => ({
      ...r,
      id: r.id,
      patientId: r.patient_id,
      appointmentId: r.appointment_id,
      doctorId: r.doctor_id,
      waitingNumber: r.waiting_number,
      patientName: r.patient_name,
      doctorName: r.doctor_name,
      clinicId: r.clinic_id,
      balance: r.balance,
      billId: r.latest_bill_id,
      packageName: r.package_name,
      packageExpiry: r.package_expiry,
      consultationFee: r.consultation_fee?.toString() || null,
      rowcolor: r.rowcolor || 0,
      status: r.status,
      date: r.date
    }));
  }

  async addToWaitlist(dto: { patientId?: number; appointmentId?: number; doctorId?: number; consultationFee?: number; clinicId?: number }): Promise<number> {
    const today = todayLocalYMD();
    const cid = dto.clinicId;

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
      const timeStr = nowLocal12h();

      const [newAppt] = await this.db.insert(schema.appointments).values({
        clinicId: cid ?? null,
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
      clinicId:        cid ?? null,
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
    const [target] = await this.db
      .select()
      .from(schema.waitlist)
      .where(eq(schema.waitlist.id, waitlistId));

    if (target && target.doctorId && target.date) {
      const activeEntries = await this.db
        .select()
        .from(schema.waitlist)
        .where(and(
          eq(schema.waitlist.doctorId, target.doctorId),
          eq(schema.waitlist.date, target.date),
          eq(schema.waitlist.status, 1),
          ne(schema.waitlist.id, waitlistId)
        ));

      if (activeEntries.length > 0) {
        await this.db
          .update(schema.waitlist)
          .set({ status: 0, calledAt: null, updatedAt: new Date() })
          .where(and(
            eq(schema.waitlist.doctorId, target.doctorId),
            eq(schema.waitlist.date, target.date),
            eq(schema.waitlist.status, 1),
            ne(schema.waitlist.id, waitlistId)
          ));

        for (const entry of activeEntries) {
          if (entry.appointmentId) {
            await this.db
              .update(schema.appointments)
              .set({ status: AppointmentStatus.Waitlist, updatedAt: new Date() })
              .where(eq(schema.appointments.id, entry.appointmentId));
          }
        }
      }
    }

    await this.db
      .update(schema.waitlist)
      .set({ status: 1, calledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.waitlist.id, waitlistId));

    if (target?.appointmentId) {
      await this.db
        .update(schema.appointments)
        .set({ status: AppointmentStatus.Consultation, updatedAt: new Date() })
        .where(eq(schema.appointments.id, target.appointmentId));
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
    // Single-shot atomic skip: resets current patient to waiting, promotes next patient to consultation.
    // Collapsed from 6 sequential queries into 1 raw SQL block for instant response.
    const doctorCond = sql`TRUE`; // Will be refined below after fetching entry context

    await this.db.execute(sql`
      WITH skipped AS (
        UPDATE waitlist
        SET status = 0, called_at = NULL, updated_at = NOW()
        WHERE id = ${waitlistId}
          AND (deleted_at IS NULL OR deleted_at::text = '')
        RETURNING id, appointment_id, doctor_id, date
      ),
      reset_appt AS (
        UPDATE appointments
        SET status = 'Waitlist', updated_at = NOW()
        FROM skipped s
        WHERE appointments.id = s.appointment_id
      ),
      next_patient AS (
        SELECT w.id as wl_id, w.appointment_id
        FROM waitlist w, skipped s
        WHERE w.status = 0
          AND w.date = s.date
          AND w.id != ${waitlistId}
          AND (w.deleted_at IS NULL OR w.deleted_at::text = '')
          AND (s.doctor_id IS NULL OR w.doctor_id = s.doctor_id)
        ORDER BY w.waiting_number ASC
        LIMIT 1
      ),
      promote_wl AS (
        UPDATE waitlist
        SET status = 1, called_at = NOW(), updated_at = NOW()
        FROM next_patient np
        WHERE waitlist.id = np.wl_id
      )
      UPDATE appointments
      SET status = 'Consultation', updated_at = NOW()
      FROM next_patient np
      WHERE appointments.id = np.appointment_id
    `);
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
