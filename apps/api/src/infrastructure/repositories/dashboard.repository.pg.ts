import { sql, eq, and, desc, gte, lte, isNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type {
  DashboardKpis,
  QueueItem,
  ActivityItem,
  SimpleReminder,
  BirthdayPatient,
  RevenueSeries,
  RevenueBreakdown,
  TopBillingItem,
  MonthlyTarget,
  PlatformStats,
  RecentTransaction,
  IntelligenceInsight,
} from '@mmc/types';
import type { IDashboardRepository } from '../../domains/dashboard/ports/dashboard.repository.js';

export class DashboardRepositoryPg implements IDashboardRepository {
  private static cachedRevInfo: Record<string, any> = {};
  private static cachedDocCol: Record<string, string> = {};
  private static cache = new Map<string, { data: unknown; expires: number }>();

  private getCached<T>(key: string, ttlMs: number, fetch: () => Promise<T>): Promise<T> {
    const entry = DashboardRepositoryPg.cache.get(key);
    if (entry && entry.expires > Date.now()) return Promise.resolve(entry.data as T);
    return fetch().then(data => {
      DashboardRepositoryPg.cache.set(key, { data, expires: Date.now() + ttlMs });
      return data;
    });
  }

  public static clearQueueCache(): void {
    for (const key of DashboardRepositoryPg.cache.keys()) {
      if (key.startsWith('queue:')) {
        DashboardRepositoryPg.cache.delete(key);
      }
    }
  }

  constructor(private readonly db: DbClient) { }

  private async getRevenueTableInfo(): Promise<{ name: string; amountCol: string; hasMode: boolean } | null> {
    const schemaName = (this.db as any).session?.client?.options?.search_path || 'public';
    if (DashboardRepositoryPg.cachedRevInfo[schemaName]) return DashboardRepositoryPg.cachedRevInfo[schemaName];

    const res = await this.db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('receipt', 'bills') AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);
    if (!res[0]) return null;
    const name = (res[0] as any).table_name;

    const modeRes = await this.db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${name} AND column_name = 'mode' AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);

    const info = { name, amountCol: name === 'receipt' ? 'amount' : 'charges', hasMode: !!modeRes[0] };
    DashboardRepositoryPg.cachedRevInfo[schemaName] = info;
    return info;
  }

  private async getDoctorColumn(): Promise<string> {
    const schemaName = (this.db as any).session?.client?.options?.search_path || 'public';
    if (DashboardRepositoryPg.cachedDocCol[schemaName]) return DashboardRepositoryPg.cachedDocCol[schemaName];

    // Prefer 'doctor_id' (modern) over 'assistant_doctor' (legacy). Use explicit schema to avoid public schema interference.
    const res = await this.db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
        AND table_schema = CURRENT_SCHEMA()
        AND column_name IN ('doctor_id', 'assistant_doctor', 'practitioner_id')
      ORDER BY CASE column_name 
        WHEN 'doctor_id' THEN 1 
        WHEN 'assistant_doctor' THEN 2 
        ELSE 3 END ASC
      LIMIT 1
    `);
    const col = res[0] ? (res[0] as any).column_name : 'doctor_id';
    DashboardRepositoryPg.cachedDocCol[schemaName] = col;
    return col;
  }

  private getPeriodDates(p: string) {
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const y = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    const todayStr = `${y}-${mm}-${dd}`;
    const year = y;
    const month = mm;

    let range: { start: string; end: string };

    switch (p) {
      case 'day':
        range = { start: todayStr, end: todayStr };
        break;
      case 'week': {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        const s = d.toISOString().split('T')[0] || '';
        d.setDate(d.getDate() + 6);
        range = { start: s, end: d.toISOString().split('T')[0] || '' };
        break;
      }
      case 'year':
        range = { start: `${year}-01-01`, end: `${year}-12-31` };
        break;
      default: // month
        range = {
          start: `${year}-${month}-01`,
          end: new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0] || ''
        };
    }

    const start = range.start;
    const end = range.end;

    // For better SQL indexing, we create a tomorrow boundary
    const startDate = new Date(start);
    const endDateBoundary = new Date(end);
    endDateBoundary.setDate(endDateBoundary.getDate() + 1);

    const diffMs = endDateBoundary.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - diffMs);
    const prevEndDateBoundary = new Date(startDate);

    return {
      start,
      end,
      boundary: endDateBoundary.toISOString().split('T')[0],
      prevStart: prevStartDate.toISOString().split('T')[0],
      prevBoundary: prevEndDateBoundary.toISOString().split('T')[0]
    };
  }

  async getKpis(period: string, contextId: number, doctorId?: number): Promise<DashboardKpis> {
    return this.getCached(`kpis:${contextId}:${period}:${doctorId ?? ''}`, 30_000, async () => {
      const { start, boundary, prevStart, prevBoundary } = this.getPeriodDates(period);
      const docCol = await this.getDoctorColumn();
      
      const docApptFilter = doctorId ? sql` AND ${sql.identifier(docCol)} = ${doctorId}` : sql``;
      const docWaitFilter = doctorId ? sql` AND doctor_id = ${doctorId}` : sql``;
      const docBillFilter = doctorId ? sql` AND b.doctor_id = ${doctorId}` : sql``;

    // Single round-trip: 4 queries instead of 9 (merged prev/curr + eliminated duplicate bills scans)
    const [countsRes, financeRes, waitRes, followUpRes] = await Promise.all([
      // 1. All Patient & Appointment Counts (Current & Previous)
      this.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE type = 'P' AND created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp)::int as curr_patients,
          count(*) FILTER (WHERE type = 'P' AND created_at >= ${prevStart}::timestamp AND created_at < ${prevBoundary}::timestamp)::int as prev_patients,
          count(*) FILTER (WHERE type = 'A' AND date >= ${start}::date AND date < ${boundary}::date)::int as curr_appts,
          count(*) FILTER (WHERE type = 'A' AND date >= ${prevStart}::date AND date < ${prevBoundary}::date)::int as prev_appts
        FROM (
          SELECT 'P' as type, created_at, NULL::date as date FROM case_datas WHERE (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          SELECT 'A' as type, created_at, booking_date as date FROM appointments WHERE (deleted_at IS NULL OR deleted_at::text = '') ${docApptFilter}
        ) t
      `),
      // 2. All Financials (Revenue, Charges, Received, Expenses)
      this.db.execute(sql`
        SELECT
          -- Current
          COALESCE(sum(curr_bill_charges), 0)::numeric as curr_charges,
          COALESCE(sum(curr_bill_received), 0)::numeric as curr_received,
          COALESCE(sum(curr_bill_received), 0) + COALESCE(sum(curr_receipt_amt), 0) as curr_revenue,
          COALESCE(sum(curr_expenses), 0)::int as curr_expenses,
          -- Previous
          COALESCE(sum(prev_bill_charges), 0)::numeric as prev_charges,
          COALESCE(sum(prev_bill_received), 0)::numeric as prev_received,
          COALESCE(sum(prev_bill_received), 0) + COALESCE(sum(prev_receipt_amt), 0) as prev_revenue
        FROM (
          -- Current Bills
          SELECT b.charges as curr_bill_charges, b.received as curr_bill_received, 0 as curr_receipt_amt, 0 as curr_expenses, 0 as prev_bill_charges, 0 as prev_bill_received, 0 as prev_receipt_amt 
          FROM bills b JOIN case_datas pb ON pb.regid = b.regid
          WHERE b.bill_date >= ${start}::date AND b.bill_date < ${boundary}::date AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
          ${docBillFilter}

          UNION ALL
          
          -- Current Receipts (Note: Receipts don't have doctor_id, so we keep them clinic-wide or filter by patient? 
          -- For now keeping them clinic-wide as per original logic, but allowing future expansion)
          SELECT 0, 0, CAST(NULLIF(r.amount::text, '') AS numeric), 0, 0, 0, 0 
          FROM receipt r JOIN case_datas pr ON pr.regid = r.regid
          WHERE r.created_at >= ${start}::timestamp AND r.created_at < ${boundary}::timestamp AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
          
          UNION ALL
          
          -- Current Expenses
          SELECT 0, 0, 0, amount, 0, 0, 0 FROM expenses 
          WHERE exp_date >= ${start}::date AND exp_date < ${boundary}::date AND (deleted_at IS NULL OR deleted_at::text = '')
          
          UNION ALL
          
          -- Previous Bills
          SELECT 0, 0, 0, 0, b.charges, b.received, 0 
          FROM bills b JOIN case_datas pb ON pb.regid = b.regid
          WHERE b.bill_date >= ${prevStart}::date AND b.bill_date < ${prevBoundary}::date AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
          ${docBillFilter}

          UNION ALL
          
          -- Previous Receipts
          SELECT 0, 0, 0, 0, 0, 0, CAST(NULLIF(r.amount::text, '') AS numeric) 
          FROM receipt r JOIN case_datas pr ON pr.regid = r.regid
          WHERE r.created_at >= ${prevStart}::timestamp AND r.created_at < ${prevBoundary}::timestamp AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
        ) f
      `),
      // 3. Wait Times (Current & Previous)
      this.db.execute(sql`
        SELECT
          COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60) FILTER (WHERE date >= ${start}::date AND date < ${boundary}::date), 0)::int as curr_wait,
          COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60) FILTER (WHERE date >= ${prevStart}::date AND date < ${prevBoundary}::date), 0)::int as prev_wait
        FROM waitlist
        WHERE called_at IS NOT NULL AND checked_in_at IS NOT NULL AND (deleted_at IS NULL OR deleted_at::text = '')
        ${docWaitFilter}
      `),
      // 4. Follow-ups (Current)
      this.db.execute(sql`
        SELECT count(*)::int as count FROM appointments
        WHERE booking_date >= ${start} AND booking_date < ${boundary} AND visit_type = 'FollowUp' AND (deleted_at IS NULL OR deleted_at::text = '')
        ${docApptFilter}
      `),
    ]) as any[];

    const counts = countsRes[0] || { curr_patients: 0, prev_patients: 0, curr_appts: 0, prev_appts: 0 };
    const finance = financeRes[0] || { curr_charges: 0, curr_received: 0, curr_revenue: 0, curr_expenses: 0, prev_charges: 0, prev_received: 0, prev_revenue: 0 };
    const wait = waitRes[0] || { curr_wait: 0, prev_wait: 0 };
    const followUp = followUpRes[0] || { count: 0 };

    const currE = Number(finance.curr_revenue) || 0;
    const prevE = Number(finance.prev_revenue) || 0;
    const currP = counts.curr_patients || 0;
    const prevP = counts.prev_patients || 0;

    const revTrend = prevE > 0 ? ((currE - prevE) / prevE * 100).toFixed(1) : '0.0';
    const patTrend = prevP > 0 ? ((currP - prevP) / prevP * 100).toFixed(1) : '0.0';

    const currRate = Number(finance.curr_charges) > 0 ? Math.round((Number(finance.curr_received) / Number(finance.curr_charges)) * 100) : 0;
    const prevRate = Number(finance.prev_charges) > 0 ? Math.round((Number(finance.prev_received) / Number(finance.prev_charges)) * 100) : 0;
    const collTrend = prevRate > 0 ? ((currRate - prevRate) / prevRate * 100).toFixed(1) : '0.0';

    const currWait = Number(wait.curr_wait) || 0;
    const prevWait = Number(wait.prev_wait) || 0;
    const waitTrend = prevWait > 0 ? ((currWait - prevWait) / prevWait * 100).toFixed(1) : '0.0';

    const currA = counts.curr_appts || 0;
    const prevA = counts.prev_appts || 0;
    const casesTrend = prevA > 0 ? (((currA - prevA) / prevA) * 100).toFixed(1) : '0.0';

    return {
      newPatientsCount: currP,
      patientTrend: patTrend,
      casesCount: currA,
      casesTrend: casesTrend,
      todaysCollection: currE,
      revenueTrend: revTrend,
      followUpsCount: followUp.count || 0,
      todaysExpenses: Number(finance.curr_expenses) || 0,
      collectionRate: currRate,
      collectionRateTrend: collTrend,
      avgWaitTime: currWait,
      avgWaitTimeTrend: waitTrend
    } as DashboardKpis;
    });
  }

  async getTodayQueue(contextId: number, doctorId?: number): Promise<QueueItem[]> {
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const y = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, '0');
    const dd = String(istDate.getDate()).padStart(2, '0');
    const today = `${y}-${mm}-${dd}`;
    return this.getCached(`queue:${contextId}:${today}:${doctorId ?? ''}`, 0, async () => {
      const docCond = doctorId ? sql` AND (w.doctor_id = ${doctorId} OR (SELECT name FROM users WHERE id = w.doctor_id) = (SELECT name FROM users WHERE id = ${doctorId}) OR (SELECT name FROM doctors WHERE id = w.doctor_id) = (SELECT name FROM users WHERE id = ${doctorId}))` : sql``;
      const apptCond = doctorId ? sql` AND (a.doctor_id = ${doctorId} OR (SELECT name FROM users WHERE id = a.doctor_id) = (SELECT name FROM users WHERE id = ${doctorId}) OR (SELECT name FROM doctors WHERE id = a.doctor_id) = (SELECT name FROM users WHERE id = ${doctorId}))` : sql``;
      const dateCond = sql`(w.date::text = ${today} OR w.date::text = TO_CHAR(${today}::date, 'DD/MM/YYYY') OR w.date::text LIKE '%' || TO_CHAR(${today}::date, 'DD/MM/YYYY') || '%')`;
      const apptDateCond = sql`(a.booking_date::text = ${today} OR a.booking_date::text = TO_CHAR(${today}::date, 'DD/MM/YYYY') OR a.booking_date::text LIKE '%' || TO_CHAR(${today}::date, 'DD/MM/YYYY') || '%')`;

      const result = await this.db.execute(sql`
        WITH today_waitlist AS (
          SELECT
            w.id as wl_id,
            w.appointment_id,
            w.patient_id,
            w.doctor_id,
            w.waiting_number as token_no,
            w.status,
            w.checked_in_at
          FROM waitlist w
          WHERE ${dateCond} AND (w.deleted_at IS NULL OR w.deleted_at::text = '')
            AND (w.clinic_id = ${contextId} OR w.clinic_id IS NULL)
            ${docCond}
        )
        SELECT
          q.wl_id,
          q.id,
          q.patient_id,
          q.doctor_id,
          q.token_no,
          q.status,
          q.manual_name,
          q.created_at,
          q.booking_time,
          q.visit_id,
          q.notes,
          COALESCE(p.first_name || ' ' || p.surname, q.manual_name, 'Unknown Patient') as patient_name,
          COALESCE(p.regid, p.id, q.patient_id) as regid,
          COALESCE(d.name, u.name, 'Practitioner') as doctor_name,
          v.systolic_bp,
          v.diastolic_bp,
          v.weight_kg,
          v.temperature_f,
          v.height_cm,
          v.pulse_rate,
          v.respiratory_rate,
          v.oxygen_saturation,
          v.notes as vital_notes
        FROM (
          SELECT
            tw.wl_id,
            COALESCE(a.id, tw.wl_id * -1) as id,
            tw.patient_id,
            tw.doctor_id,
            tw.token_no,
            CASE WHEN tw.status = 1 THEN 'Consultation' WHEN tw.status = 2 THEN 'Completed' ELSE 'Waitlist' END as status,
            a.patient_name as manual_name,
            tw.checked_in_at as created_at,
            COALESCE(a.booking_time, '') as booking_time,
            COALESCE(a.id, tw.appointment_id) as visit_id,
            a.notes
          FROM today_waitlist tw
          LEFT JOIN appointments a ON a.id = tw.appointment_id
            ${apptCond}

          UNION ALL

          SELECT
            NULL as wl_id,
            a.id,
            a.patient_id,
            a.doctor_id,
            a.token_no,
            CASE WHEN a.status IN ('In Progress', 'InProgress') THEN 'Consultation' ELSE a.status END as status,
            a.patient_name as manual_name,
            a.created_at,
            a.booking_time,
            a.id as visit_id,
            a.notes
          FROM appointments a
          WHERE ${apptDateCond} AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
            AND (a.clinic_id = ${contextId} OR a.clinic_id IS NULL)
            ${apptCond}
            AND NOT EXISTS (SELECT 1 FROM today_waitlist tw2 WHERE tw2.appointment_id = a.id OR tw2.patient_id = a.patient_id)
        ) q
        LEFT JOIN case_datas p ON p.id = q.patient_id
        LEFT JOIN doctors d ON d.id = q.doctor_id
        LEFT JOIN users u ON u.id = q.doctor_id
        LEFT JOIN (
          SELECT DISTINCT ON (visit_id) 
            visit_id, systolic_bp, diastolic_bp, weight_kg, temperature_f, height_cm, pulse_rate, respiratory_rate, oxygen_saturation, notes
          FROM vitals
          ORDER BY visit_id, recorded_at DESC
        ) v ON v.visit_id = q.visit_id
        ORDER BY q.token_no ASC NULLS LAST, q.id ASC
      `);

      const allRows = result as any[];

      allRows.sort((a, b) => {
        const order: Record<string, number> = {
          Consultation: 1, Confirmed: 2, Waitlist: 2, Pending: 3, Completed: 4,
        };
        const aOrd = order[a.status] ?? 5;
        const bOrd = order[b.status] ?? 5;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return (Number(a.token_no) || 999) - (Number(b.token_no) || 999);
      });

      return allRows.map(r => ({
        id: r.id,
        wlId: r.wl_id,
        patientId: r.patient_id,
        regid: r.regid,
        patientName: r.patient_name,
        doctorName: r.doctor_name,
        bookingTime: r.booking_time || '',
        tokenNo: r.token_no,
        status: r.status,
        isUrgent: false,
        age: undefined,
        gender: undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        visitId: r.visit_id,
        notes: r.notes,
        vitals: r.systolic_bp || r.weight_kg || r.temperature_f ? {
          bp: r.systolic_bp && r.diastolic_bp ? `${r.systolic_bp}/${r.diastolic_bp}` : undefined,
          weight: r.weight_kg,
          temp: r.temperature_f,
          // Full fields for VitalsFormModal
          systolicBp: r.systolic_bp,
          diastolicBp: r.diastolic_bp,
          weightKg: r.weight_kg,
          temperatureF: r.temperature_f,
          heightCm: r.height_cm,
          pulseRate: r.pulse_rate,
          respiratoryRate: r.respiratory_rate,
          oxygenSaturation: r.oxygen_saturation,
          notes: r.vital_notes
        } : undefined,
      }));
    });
  }




  async getRecentActivity(contextId: number, limit: number): Promise<ActivityItem[]> {
    return this.getCached(`activity:${contextId}:${limit}`, 30_000, async () => {
      const revInfo = await this.getRevenueTableInfo();


    const queries: any[] = [];

    // Always query appointments
    queries.push(this.db.execute(sql`
      SELECT 'appointment' as type, 'Appointment - ' || COALESCE(p.first_name, 'Unknown') as title, a.booking_date::text as subtitle, a.created_at
      FROM appointments a LEFT JOIN case_datas p ON a.patient_id = p.id
      WHERE (a.deleted_at IS NULL OR a.deleted_at::text = '')
      ORDER BY a.id DESC LIMIT ${limit}
    `));

    // Conditionally query revenue table
    if (revInfo) {
      queries.push(this.db.execute(sql`
        SELECT 'payment' as type, 'Invoice paid - ' || p.first_name as title, 'Rs.' || r.${sql.identifier(revInfo.amountCol)} as subtitle, r.created_at, p.regid
        FROM ${sql.identifier(revInfo.name)} r 
        JOIN case_datas p ON r.regid = p.regid
        WHERE (r.deleted_at IS NULL OR r.deleted_at::text = '')
        ORDER BY r.id DESC LIMIT ${limit}
      `));
    }

    const results = await Promise.all(queries);
    const combined = results.flatMap(res => res as any[]);

    // Sort combined results by created_at desc
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return combined.slice(0, limit).map(a => ({
      type: a.type,
      title: a.title,
      subtitle: a.subtitle,
      createdAt: a.created_at,
      regid: a.regid
    }));
    });
  }

  async getPendingReminders(contextId: number, limit: number): Promise<SimpleReminder[]> {
    return this.getCached(`reminders:${contextId}:${limit}`, 60_000, async () => {
      const results = await this.db.execute(sql`
        SELECT cr.id, cr.patient_id, p.first_name || ' ' || p.surname as patient_name,
               cr.heading, cr.comments, cr.start_date, cr.status
        FROM case_reminder cr
        JOIN case_datas p ON cr.patient_id = p.id
        WHERE cr.status = 'pending'
        ORDER BY cr.id DESC LIMIT ${limit}
      `);
      return results as any as SimpleReminder[];
    });
  }

  async getBirthdays(contextId: number): Promise<BirthdayPatient[]> {
    return this.getCached(`birthdays:${contextId}`, 60_000, async () => {
      const now = new Date();
      const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const istDate = new Date(istString);
      const mmdd = `${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;

      const results = await this.db.execute(sql`
        SELECT id, regid, first_name, surname, phone, mobile1, dob
        FROM case_datas
        WHERE (deleted_at IS NULL OR deleted_at::text = '')
          AND to_char(dob, 'MM-DD') = ${mmdd}
      `);
      return results as any as BirthdayPatient[];
    });
  }

  async getRevenueSeries(period: string, contextId: number, paymentMode?: string): Promise<RevenueSeries[]> {
    return this.getCached(`revSeries:${contextId}:${period}:${paymentMode ?? ''}`, 60_000, async () => {

    let modeFilter = '';
    if (paymentMode === 'Cash') {
      modeFilter = "AND (LOWER(COALESCE(payment_mode, '')) = 'cash' OR payment_mode IS NULL OR payment_mode = '')";
    } else if (paymentMode === 'UPI/Card') {
      modeFilter = "AND LOWER(COALESCE(payment_mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm')";
    }

    const results = await this.db.execute(sql`
      WITH months AS (
        SELECT (date_trunc('month', NOW()) - (m || ' months')::interval)::date as m
        FROM generate_series(0, 5) m
      ),
      rev_combined AS (
        -- Bills
        SELECT date_trunc('month', b.bill_date)::date as m, sum(b.received) as amt 
        FROM bills b
        JOIN case_datas pb ON pb.regid = b.regid
        WHERE b.bill_date >= date_trunc('month', NOW()) - interval '6 months' 
          ${sql.raw(modeFilter ? modeFilter.replace('payment_mode', 'b.payment_mode') : "")}
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
          AND pb.regid = b.regid
        GROUP BY 1
        
        UNION ALL
        
        -- Receipts
        SELECT date_trunc('month', r.created_at)::date as m, sum(CAST(NULLIF(r.amount::text, '') AS numeric)) as amt 
        FROM receipt r
        JOIN case_datas pr ON pr.regid = r.regid
        WHERE r.created_at >= date_trunc('month', NOW()) - interval '6 months'
          ${sql.raw(modeFilter ? modeFilter.replace('payment_mode', 'r.mode') : "")}
          AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
          AND pr.regid = r.regid
        GROUP BY 1
      )
      SELECT to_char(months.m, 'Mon') as month, 
             COALESCE(sum(rc.amt), 0)::int as revenue
      FROM months
      LEFT JOIN rev_combined rc ON rc.m = months.m
      GROUP BY months.m
      ORDER BY months.m ASC
    `);

    return (results as any[]).map(r => ({
      month: r.month,
      revenue: r.revenue
    }));
    });
  }

  async getMultiRevenueSeries(period: string, contextId: number): Promise<{ total: RevenueSeries[]; cash: RevenueSeries[]; upi: RevenueSeries[] }> {
    return this.getCached(`multiRevSeries:${contextId}:${period}`, 60_000, async () => {
      const { start, end } = this.getPeriodDates(period);
      
      let interval = '1 month';
      let labelFormat = 'Mon';
      let seriesStart = start;
      let seriesEnd = end;

      if (period === 'year') {
        interval = '1 month';
        labelFormat = 'Mon';
      } else if (period === 'month') {
        interval = '1 day';
        labelFormat = 'DD';
      } else if (period === 'week') {
        interval = '1 day';
        labelFormat = 'Dy';
      } else {
        // Fallback to rolling 6 months for 'day' or unknown
        return this.db.execute(sql`
          WITH months AS (
            SELECT (date_trunc('month', NOW()) - (m || ' months')::interval)::date as m
            FROM generate_series(0, 5) m
          ),
          rev_combined AS (
            SELECT 
              date_trunc('month', b.bill_date)::date as m,
              b.received as amt,
              CASE WHEN (LOWER(COALESCE(b.payment_mode, '')) = 'cash' OR b.payment_mode IS NULL OR b.payment_mode = '') THEN b.received ELSE 0 END as cash_amt,
              CASE WHEN LOWER(COALESCE(b.payment_mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN b.received ELSE 0 END as upi_amt
            FROM bills b
            JOIN case_datas pb ON pb.regid = b.regid
            WHERE b.bill_date >= date_trunc('month', NOW()) - interval '6 months' 
              AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
              AND pb.clinic_id = ${contextId}
            UNION ALL
            SELECT 
              date_trunc('month', r.created_at)::date as m,
              CAST(NULLIF(r.amount::text, '') AS numeric) as amt,
              CASE WHEN (LOWER(COALESCE(r.mode, '')) = 'cash' OR r.mode IS NULL OR r.mode = '') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END as cash_amt,
              CASE WHEN LOWER(COALESCE(r.mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END as upi_amt
            FROM receipt r
            JOIN case_datas pr ON pr.regid = r.regid
            WHERE r.created_at >= date_trunc('month', NOW()) - interval '6 months'
              AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
              AND pr.clinic_id = ${contextId}
          )
          SELECT 
            to_char(months.m, 'Mon') as month, 
            COALESCE(sum(rc.amt), 0)::int as total,
            COALESCE(sum(rc.cash_amt), 0)::int as cash,
            COALESCE(sum(rc.upi_amt), 0)::int as upi
          FROM months
          LEFT JOIN rev_combined rc ON rc.m = months.m
          GROUP BY months.m
          ORDER BY months.m ASC
        `).then((results: any) => ({
          total: results.map((r: any) => ({ month: r.month, revenue: r.total })),
          cash: results.map((r: any) => ({ month: r.month, revenue: r.cash })),
          upi: results.map((r: any) => ({ month: r.month, revenue: r.upi })),
        }));
      }

      const results = await this.db.execute(sql`
      WITH periods AS (
        SELECT generate_series(${seriesStart}::date, ${seriesEnd}::date, ${sql.raw(`'${interval}'`)}::interval)::date as p
      ),
      rev_combined AS (
        -- Bills
        SELECT 
          date_trunc(${period === 'year' ? 'month' : 'day'}, b.bill_date)::date as p,
          b.received as amt,
          CASE WHEN (LOWER(COALESCE(b.payment_mode, '')) = 'cash' OR b.payment_mode IS NULL OR b.payment_mode = '') THEN b.received ELSE 0 END as cash_amt,
          CASE WHEN LOWER(COALESCE(b.payment_mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN b.received ELSE 0 END as upi_amt
        FROM bills b
        JOIN case_datas pb ON pb.regid = b.regid
        WHERE b.bill_date >= ${seriesStart}::date AND b.bill_date <= ${seriesEnd}::date
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
          AND pb.clinic_id = ${contextId}
        
        UNION ALL
        
        -- Receipts
        SELECT 
          date_trunc(${period === 'year' ? 'month' : 'day'}, r.created_at)::date as p,
          CAST(NULLIF(r.amount::text, '') AS numeric) as amt,
          CASE WHEN (LOWER(COALESCE(r.mode, '')) = 'cash' OR r.mode IS NULL OR r.mode = '') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END as cash_amt,
          CASE WHEN LOWER(COALESCE(r.mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END as upi_amt
        FROM receipt r
        JOIN case_datas pr ON pr.regid = r.regid
        WHERE r.created_at >= ${seriesStart}::date AND r.created_at <= ${seriesEnd}::date
          AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
          AND pr.clinic_id = ${contextId}
      )
      SELECT 
        to_char(periods.p, ${labelFormat}) as month, 
        COALESCE(sum(rc.amt), 0)::int as total,
        COALESCE(sum(rc.cash_amt), 0)::int as cash,
        COALESCE(sum(rc.upi_amt), 0)::int as upi
      FROM periods
      LEFT JOIN rev_combined rc ON rc.p = periods.p
      GROUP BY periods.p
      ORDER BY periods.p ASC
    `);

    const data = results as any[];
    return {
      total: data.map(r => ({ month: r.month, revenue: r.total })),
      cash: data.map(r => ({ month: r.month, revenue: r.cash })),
      upi: data.map(r => ({ month: r.month, revenue: r.upi })),
    };
    });
  }

  async markReminderDone(id: number): Promise<void> {
    await this.db.update(schema.caseReminders)
      .set({ status: 'done' })
      .where(eq(schema.caseReminders.id, id));
  }

  async getRecentTransactions(limit: number, contextId?: number): Promise<RecentTransaction[]> {
    return this.getCached(`recentTransactions:${contextId ?? 'all'}:${limit}`, 60_000, async () => {
      try {
        const results = await this.db.execute(sql`
          WITH combined AS (
            SELECT 
              b.id::text,
              b.regid,
              COALESCE(b.bill_no::text, 'INV-' || b.id::text) AS invoice_no,
              COALESCE(CAST(NULLIF(b.charges::text, '') AS numeric), 0)::int AS amount,
              CASE
                WHEN COALESCE(CAST(NULLIF(b.balance::text, '') AS numeric), 0) <= 0 THEN 'paid'
                WHEN COALESCE(CAST(NULLIF(b.received::text, '') AS numeric), 0) > 0 THEN 'partial'
                ELSE 'due'
              END AS status,
              b.created_at
            FROM bills b
            JOIN case_datas pb ON pb.regid = b.regid
            WHERE (b.deleted_at IS NULL OR b.deleted_at::text = '')
              AND (pb.deleted_at IS NULL OR pb.deleted_at::text = '')
            
            UNION ALL
            
            SELECT 
              'R-' || r.id::text as id,
              r.regid,
              'RCT-' || r.id::text AS invoice_no,
              COALESCE(CAST(NULLIF(r.amount::text, '') AS numeric), 0)::int AS amount,
              'paid' AS status,
              COALESCE(r.created_at, NOW()) as created_at
            FROM receipt r
            JOIN case_datas pr ON pr.regid = r.regid
            WHERE (r.deleted_at IS NULL OR r.deleted_at::text = '')
              AND (pr.deleted_at IS NULL OR pr.deleted_at::text = '')
          )
          SELECT 
            c.*,
            COALESCE(p.first_name || ' ' || p.surname, 'Patient') AS patient_name
          FROM combined c
          LEFT JOIN case_datas p ON c.regid = p.regid
          ORDER BY c.created_at DESC
          LIMIT ${limit}
        `);
        return (results as any[]).map(r => ({
          id: r.id,
          patientName: r.patient_name || 'Patient',
          invoiceNo: r.invoice_no,
          amount: Number(r.amount) || 0,
          status: r.status || 'due',
        }));
      } catch (e: any) {
        console.error('[Dashboard] getRecentTransactions failed:', e?.message);
        return [];
      }
    });
  }


  async getIntelligenceInsights(kpis: DashboardKpis): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = [];

    const revTrend = Number(kpis?.revenueTrend || 0);
    const patTrend = Number(kpis?.patientTrend || 0);
    const collRate = Number(kpis?.collectionRate || 0);
    const avgWait = Number(kpis?.avgWaitTime || 0);
    const collection = Number(kpis?.todaysCollection || 0);

    if (revTrend > 0) {
      insights.push({ color: '#22c55e', text: `Revenue is up ${revTrend}% vs yesterday — clinic is performing well.` });
    } else if (revTrend < -10) {
      insights.push({ color: '#ef4444', text: `Revenue dropped ${Math.abs(revTrend)}% vs yesterday. Review billing pipeline.` });
    } else {
      insights.push({ color: '#22c55e', text: 'Clinic is running smoothly. Revenue on track with yesterday.' });
    }

    if (collRate > 0 && collRate < 90) {
      insights.push({ color: '#f59e0b', text: `Collection rate at ${collRate}% — follow up on pending dues to improve cash flow.` });
    } else if (collRate >= 95) {
      insights.push({ color: '#22c55e', text: `Excellent collection rate of ${collRate}%. Keep it up!` });
    }

    if (avgWait > 20) {
      insights.push({ color: '#f59e0b', text: `Average wait time is ${avgWait} min — consider calling extra staff or adjusting scheduling.` });
    } else if (avgWait > 0) {
      insights.push({ color: '#22c55e', text: `Average wait time of ${avgWait} min is within target range.` });
    }

    if (patTrend > 0) {
      insights.push({ color: '#3b82f6', text: `Patient visits up ${patTrend}% today — ensure adequate staffing.` });
    }

    if (collection === 0) {
      insights.push({ color: '#94a3b8', text: 'No collections recorded yet today. Start seeing patients to track revenue.' });
    }

    return insights.slice(0, 3);
  }


  // ─── Clinic Admin Dashboard ──────────────────────────────────────────────────

  async getRevenueBreakdown(period: string, contextId: number): Promise<RevenueBreakdown> {
    return this.getCached(`revBreakdown:${contextId}:${period}`, 60_000, async () => {
      const { start, boundary } = this.getPeriodDates(period);

      const revInfo = await this.getRevenueTableInfo();

      if (!revInfo) {
        return { physicalCurrency: 0, physicalCurrencyPct: 0, upiCard: 0, upiCardPct: 0, pending: 0, pendingCount: 0, perPatient: 0 };
      }

      const amountCol = revInfo.amountCol;
      const dateCol = revInfo.name === 'receipt' ? 'created_at' : 'bill_date';
      const modeCol = revInfo.name === 'receipt' ? 'mode' : 'payment_mode';

      const [combinedRes, patCountRes] = await Promise.all([
        this.db.execute(sql`
          SELECT
            COALESCE(sum(cash_amt), 0) as cash_total,
            COALESCE(sum(upi_amt), 0) as upi_total,
            COALESCE(sum(charges), 0) as pending_charges,
            COALESCE(sum(received), 0) as pending_received,
            count(*) FILTER (WHERE type = 'B') as pending_count
          FROM (
            SELECT
              'B' as type,
              CASE WHEN (LOWER(COALESCE(b.payment_mode, '')) = 'cash' OR b.payment_mode IS NULL OR b.payment_mode = '') THEN b.received ELSE 0 END as cash_amt,
              CASE WHEN LOWER(COALESCE(b.payment_mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN b.received ELSE 0 END as upi_amt,
              CAST(NULLIF(b.charges::text, '') AS numeric) as charges,
              CAST(NULLIF(b.received::text, '') AS numeric) as received
            FROM bills b
            JOIN case_datas pb ON pb.regid = b.regid
            WHERE b.bill_date >= ${start}::date AND b.bill_date < ${boundary}::date
              AND (b.deleted_at IS NULL OR b.deleted_at::text = '')

            UNION ALL

            SELECT
              'R',
              CASE WHEN (LOWER(COALESCE(r.mode, '')) = 'cash' OR r.mode IS NULL OR r.mode = '') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END,
              CASE WHEN LOWER(COALESCE(r.mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') THEN CAST(NULLIF(r.amount::text, '') AS numeric) ELSE 0 END,
              0, 0
            FROM receipt r
            JOIN case_datas pr ON pr.regid = r.regid
            WHERE r.created_at >= ${start}::timestamp AND r.created_at < ${boundary}::timestamp
              AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
          ) t
        `),
        this.db.execute(sql`
          SELECT count(*)::int as cnt FROM case_datas
          WHERE created_at::date BETWEEN ${start} AND ${boundary}
            AND (deleted_at IS NULL OR deleted_at::text = '')
        `)
      ]);

      const combined = (combinedRes as any[])[0] || {};
      const cashTotal = Number(combined.cash_total) || 0;
      const upiCardTotal = Number(combined.upi_total) || 0;
      const pendingTotal = Math.max(0, (Number(combined.pending_charges) || 0) - (Number(combined.pending_received) || 0));
      const pendingCount = Number(combined.pending_count) || 0;

      const grandTotal = cashTotal + upiCardTotal || 1;
      const patCount = (patCountRes[0] as any)?.cnt || 1;
      const perPatient = grandTotal / patCount;

      return {
        physicalCurrency: cashTotal,
        physicalCurrencyPct: Math.round((cashTotal / grandTotal) * 1000) / 10,
        upiCard: upiCardTotal,
        upiCardPct: Math.round((upiCardTotal / grandTotal) * 1000) / 10,
        pending: pendingTotal,
        pendingCount,
        perPatient: Math.round(perPatient),
      };
    });
  }

  async getTopBilling(period: string, limit: number, contextId: number): Promise<TopBillingItem[]> {
    return this.getCached(`topBilling:${contextId}:${period}:${limit}`, 60_000, async () => {
      const { start, boundary } = this.getPeriodDates(period);

      const results = await this.db.execute(sql`
        SELECT b.id, NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.surname, '')), '') as patient_name,
               p.regid,
               b.charges as total,
               CASE
                 WHEN b.balance <= 0 THEN 'Paid'
                 WHEN b.received > 0 THEN 'Partial'
                 ELSE 'Pending'
               END as status
        FROM bills b
        LEFT JOIN case_datas p ON b.regid = p.regid
        WHERE b.bill_date::date >= ${start}::date AND b.bill_date::date < ${boundary}::date
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
        ORDER BY b.charges DESC NULLS LAST
        LIMIT ${limit}
      `) as any[];

      return (results as any[]).map(r => ({
        id: r.id,
        patientName: r.patient_name || 'Unknown',
        regid: r.regid,
        total: r.total || 0,
        status: r.status,
      }));
    });
  }

  async getMonthlyTargets(period: string, contextId: number): Promise<MonthlyTarget[]> {
    return this.getCached(`targets:${contextId}:${period}`, 60_000, async () => {
      const { start, boundary, prevStart, prevBoundary } = this.getPeriodDates(period);

    // Current month actuals
    const revInfo = await this.getRevenueTableInfo();
    const amountCol = revInfo?.amountCol || 'charges';

    const [combinedRes, waitRes] = await Promise.all([
      // 1. Consolidated Revenue, Patients, and Collection Rate
      this.db.execute(sql`
        SELECT
          COALESCE(sum(curr_rev), 0) as curr_revenue,
          count(*) FILTER (WHERE type = 'P' AND is_curr = true) as curr_patients,
          COALESCE(sum(curr_charges), 0) as curr_charges,
          COALESCE(sum(curr_received), 0) as curr_received,
          COALESCE(sum(prev_rev), 0) as prev_revenue,
          count(*) FILTER (WHERE type = 'P' AND is_curr = false) as prev_patients
        FROM (
          -- Current Month Revenue
          SELECT 'R' as type, true as is_curr, received as curr_rev, 0 as curr_charges, 0 as curr_received, 0 as prev_rev FROM bills WHERE bill_date >= ${start} AND bill_date < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          SELECT 'R', true, CAST(NULLIF(amount::text, '') AS numeric), 0, 0, 0 FROM receipt WHERE created_at >= ${start} AND created_at < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          -- Current Month Patients
          SELECT 'P', true, 0, 0, 0, 0 FROM case_datas WHERE created_at >= ${start} AND created_at < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          -- Current Month Collection Rate (Bills only)
          SELECT 'C', true, 0, CAST(NULLIF(charges::text, '') AS numeric), CAST(NULLIF(received::text, '') AS numeric), 0 FROM bills WHERE bill_date >= ${start} AND bill_date < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          -- Previous Month Revenue
          SELECT 'R', false, 0, 0, 0, received FROM bills WHERE bill_date >= ${prevStart} AND bill_date < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          SELECT 'R', false, 0, 0, 0, CAST(NULLIF(amount::text, '') AS numeric) FROM receipt WHERE created_at >= ${prevStart} AND created_at < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')
          UNION ALL
          -- Previous Month Patients
          SELECT 'P', false, 0, 0, 0, 0 FROM case_datas WHERE created_at >= ${prevStart} AND created_at < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')
        ) t
      `),
      // 2. Wait Time
      this.db.execute(sql`
        SELECT COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60), 0)::int as avg_wait 
        FROM waitlist 
        WHERE date >= ${start} AND date < ${boundary} AND called_at IS NOT NULL AND checked_in_at IS NOT NULL AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
    ]);

    const combined = (combinedRes as any[])[0] || {};
    const revenue = Number(combined.curr_revenue) || 0;
    const patients = Number(combined.curr_patients) || 0;
    const totalCharges = Number(combined.curr_charges) || 0;
    const totalReceived = Number(combined.curr_received) || 0;
    const avgWaitTime = ((waitRes as any[])[0] as any)?.avg_wait || 0;
    const collectionRate = totalCharges > 0 ? Math.round((totalReceived / totalCharges) * 100) : 0;

    const prevRevenue = Number(combined.prev_revenue) || 0;
    const prevPatients = Number(combined.prev_patients) || 0;

    const revenueTarget = Math.max(Math.round((prevRevenue > 0 ? prevRevenue : revenue > 0 ? revenue : 1000) * 1.15), 5000);
    const patientsTarget = Math.max(Math.round((prevPatients > 0 ? prevPatients : patients > 0 ? patients : 5) * 1.15), 10);
    const collectionTarget = 95;
    const waitTimeTarget = 20;

    return [
      {
        label: 'Revenue',
        current: revenue,
        target: revenueTarget,
        unit: '₹',
        status: revenue >= revenueTarget ? 'success' : revenue >= revenueTarget * 0.7 ? 'warning' : 'danger',
      },
      {
        label: 'Patients seen',
        current: patients,
        target: patientsTarget,
        unit: '',
        status: patients >= patientsTarget ? 'success' : patients >= patientsTarget * 0.7 ? 'warning' : 'danger',
      },
      {
        label: 'Collection rate',
        current: collectionRate,
        target: collectionTarget,
        unit: '%',
        status: collectionRate >= collectionTarget ? 'success' : collectionRate >= collectionTarget - 5 ? 'warning' : 'danger',
      },
      {
        label: 'Avg wait time',
        current: avgWaitTime,
        target: waitTimeTarget,
        unit: 'm',
        status: avgWaitTime <= waitTimeTarget ? 'success' : 'danger',
      },
    ];
    });
  }

  async getStaffOnDuty(contextId: number): Promise<{ name: string; role: string; count?: number }[]> {
    return this.getCached(`staff:${contextId}`, 60_000, async () => {
      const docCol = await this.getDoctorColumn();
      const today = new Date().toISOString().split('T')[0]!;

    const [uRes, dRes] = await Promise.all([
      this.db.execute(sql`
        SELECT u.name, u.type as specialty, count(a.id)::int as visit_count
        FROM users u
        LEFT JOIN appointments a ON a.${sql.identifier(docCol)} = u.id AND a.booking_date = ${today} AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
        WHERE (u.deleted_at IS NULL OR u.deleted_at::text = '') 
          AND u.type IN ('Doctor', 'Staff', 'Receptionist', 'Clinicadmin')
        GROUP BY u.name, u.type
        LIMIT 20
      `).catch(() => []),
      this.db.execute(sql`
        SELECT d.name, d.designation as specialty, count(a.id)::int as visit_count
        FROM doctors d
        LEFT JOIN appointments a ON a.${sql.identifier(docCol)} = d.id AND a.booking_date = ${today} AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
        WHERE (d.deleted_at IS NULL OR d.deleted_at::text = '')
        GROUP BY d.name, d.designation
        LIMIT 20
      `).catch(() => [])
    ]);



    const combined = [...(uRes as any[]), ...(dRes as any[])];

    // Sort and de-duplicate by name
    const uniqueMap = new Map();
    combined.forEach(r => {
      if (!uniqueMap.has(r.name) || (Number(r.visit_count) > Number(uniqueMap.get(r.name).visit_count))) {
        uniqueMap.set(r.name, r);
      }
    });

    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => (Number(b.visit_count) || 0) - (Number(a.visit_count) || 0));

    return result.map(r => ({
      name: r.name || 'Unknown',
      role: r.specialty || 'Doctor',
      count: r.visit_count,
    }));
    });
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return this.getCached('platformStats', 60_000, async () => {
      const results = await this.db.execute(sql`
        SELECT
          (SELECT count(*)::int FROM public.organizations WHERE deleted_at IS NULL) as org_count,
          (SELECT count(*)::int FROM users WHERE (deleted_at IS NULL OR deleted_at::text = '') AND is_active = true) as user_count,
          (SELECT count(*)::int FROM public.users WHERE (deleted_at IS NULL OR deleted_at::text = '') AND is_active = true AND type = 'Clinicadmin') as admin_count,
          (SELECT COALESCE(sum(received), 0)::numeric FROM bills WHERE (deleted_at IS NULL OR deleted_at::text = '')) as total_rev,
          (SELECT COALESCE(sum(charges - received), 0)::numeric FROM bills WHERE (deleted_at IS NULL OR deleted_at::text = '')) as pending_dues
      `) as any[];

      const res = results[0] || {};
      const totalRev = Number(res.total_rev) || 0;
      const pendingDues = Number(res.pending_dues) || 0;
      const clinicCount = Number(res.org_count) || 1;
      const revDensity = Math.round(totalRev / (clinicCount || 1));

      return {
        totalClinics: Number(res.org_count) || 0,
        totalStaff: Number(res.user_count) || 0,
        totalClinicAdmins: Number(res.admin_count) || 0,
        revenueDensity: revDensity,
        pendingDues: pendingDues
      };
    });
  }
}
