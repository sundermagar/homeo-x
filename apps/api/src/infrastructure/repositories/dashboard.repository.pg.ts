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
import type { IDashboardRepository } from '../../domains/dashboard/ports/dashboard.repository';

export class DashboardRepositoryPg implements IDashboardRepository {
  private static cachedRevInfo: Record<string, any> = {};
  private static cachedDocCol: Record<string, string> = {};

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
    const todayStr = now.toISOString().split('T')[0] || '';
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

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
    const { start, boundary, prevStart, prevBoundary } = this.getPeriodDates(period);

    // Optimized multi-query round-trip
    const [patientsRes, expensesRes, billsRes, receiptRes, prevBillsRes, prevReceiptRes, followUpsRes, waitTimeRes, prevWaitTimeRes] = await Promise.all([
      // 1. Patients: current + previous
      this.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp AND (deleted_at IS NULL OR deleted_at::text = ''))::int as curr_patients,
          count(*) FILTER (WHERE created_at >= ${prevStart}::timestamp AND created_at < ${prevBoundary}::timestamp AND (deleted_at IS NULL OR deleted_at::text = ''))::int as prev_patients
        FROM patients
      `),
      // 2. Expenses: current period
      this.db.execute(sql`
        SELECT COALESCE(sum(amount), 0)::int as total
        FROM expenses
        WHERE exp_date >= ${start}::date AND exp_date < ${boundary}::date
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 3. Current Bills
      this.db.execute(sql`
        SELECT
          COALESCE(sum(charges), 0)::numeric as charges,
          COALESCE(sum(received), 0)::numeric as received
        FROM bills
        WHERE bill_date >= ${start}::date AND bill_date < ${boundary}::date
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 4. Current Receipts
      this.db.execute(sql`
        SELECT COALESCE(sum(CAST(NULLIF(amount::text, '') AS numeric)), 0) as revenue
        FROM receipt
        WHERE created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 5. Previous Bills
      this.db.execute(sql`
        SELECT
          COALESCE(sum(charges), 0)::numeric as charges,
          COALESCE(sum(received), 0)::numeric as received
        FROM bills
        WHERE bill_date >= ${prevStart}::date AND bill_date < ${prevBoundary}::date
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 6. Previous Receipts
      this.db.execute(sql`
        SELECT COALESCE(sum(CAST(NULLIF(amount::text, '') AS numeric)), 0) as revenue
        FROM receipt
        WHERE created_at >= ${prevStart}::timestamp AND created_at < ${prevBoundary}::timestamp
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 7. Follow-ups: current period
      this.db.execute(sql`
        SELECT count(*)::int as count
        FROM appointments
        WHERE booking_date >= ${start} AND booking_date < ${boundary}
          AND visit_type = 'FollowUp'
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 8. Wait Time: Current period average
      this.db.execute(sql`
        SELECT COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60), 0)::int as avg_wait
        FROM waitlist
        WHERE date >= ${start}::date AND date < ${boundary}::date
          AND called_at IS NOT NULL AND checked_in_at IS NOT NULL
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // 9. Wait Time: Previous period average for trend
      this.db.execute(sql`
        SELECT COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60), 0)::int as avg_wait
        FROM waitlist
        WHERE date >= ${prevStart}::date AND date < ${prevBoundary}::date
          AND called_at IS NOT NULL AND checked_in_at IS NOT NULL
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
    ]) as any[];

    const currB = billsRes[0] || { charges: 0, received: 0 };
    const currR = receiptRes[0] || { revenue: 0 };
    const prevB = prevBillsRes[0] || { charges: 0, received: 0 };
    const prevR = prevReceiptRes[0] || { revenue: 0 };

    const currE = Number(currB.received) + Number(currR.revenue);
    const prevE = Number(prevB.received) + Number(prevR.revenue);

    const curr = { charges: Number(currB.charges), received: Number(currB.received), revenue: currE };
    const prev = { charges: Number(prevB.charges), received: Number(prevB.received), revenue: prevE };
    const pat = patientsRes[0] || { curr_patients: 0, prev_patients: 0 };
    const exp = expensesRes[0] || { total: 0 };
    const fup = followUpsRes[0] || { count: 0 };
    const wait = waitTimeRes[0] || { avg_wait: 0 };
    const pWait = prevWaitTimeRes[0] || { avg_wait: 0 };

    const currP = pat.curr_patients || 0;
    const prevP = pat.prev_patients || 0;
    const currW = Number(wait.avg_wait) || 0;
    const prevW = Number(pWait.avg_wait) || 0;

    const revTrend = prevE > 0 ? ((currE - prevE) / prevE * 100).toFixed(1) : '0.0';
    const patTrend = prevP > 0 ? ((currP - prevP) / prevP * 100).toFixed(1) : '0.0';

    const currRate = Number(curr.charges) > 0 ? Math.round((Number(curr.received) / Number(curr.charges)) * 100) : 0;
    const prevRate = Number(prev.charges) > 0 ? Math.round((Number(prev.received) / Number(prev.charges)) * 100) : 0;
    const collTrend = prevRate > 0 ? ((currRate - prevRate) / prevRate * 100).toFixed(1) : '0.0';
    
    const waitTrend = prevW > 0 ? ((currW - prevW) / prevW * 100).toFixed(1) : '0.0';

    return {
      newPatientsCount: currP,
      followUpsCount: Number(fup.count) || 0,
      todaysCollection: currE,
      todaysExpenses: Number(exp.total) || 0,
      revenueTrend: revTrend,
      patientTrend: patTrend,
      collectionRate: currRate,
      collectionRateTrend: collTrend,
      avgWaitTime: currW,
      avgWaitTimeTrend: waitTrend
    };
  }

  async getTodayQueue(contextId: number, doctorId?: number): Promise<QueueItem[]> {
    const today = new Date().toISOString().split('T')[0]!;

    // Step 1: Get today's waitlist (source of truth for Token Queue)
    let waitlistRows: any[] = [];
    try {
      const wlResult = await this.db.execute(sql`
        SELECT
          w.id                                    AS wl_id,
          COALESCE(a.id, w.id * -1)               AS id,
          COALESCE(w.patient_id, a.patient_id)    AS patient_id,
          w.doctor_id,
          w.waiting_number                        AS token_no,
          CASE
            WHEN w.status = 1 THEN 'Consultation'
            WHEN w.status = 2 THEN 'Completed'
            ELSE 'Waitlist'
          END                                     AS status,
          COALESCE(
            p.first_name || ' ' || p.surname,
            a.patient_name, 'Unknown Patient'
          )                                       AS patient_name,
          COALESCE(p.regid, p.id, w.patient_id)   AS regid,
          w.checked_in_at                         AS created_at,
          w.checked_in_at                         AS updated_at,
          COALESCE(a.booking_time, '')            AS booking_time,
          COALESCE(
            (SELECT name FROM doctors WHERE id = w.doctor_id LIMIT 1),
            (SELECT name FROM users   WHERE id = w.doctor_id LIMIT 1),
            'Practitioner'
          )                                       AS doctor_name,
          v.systolic_bp,
          v.diastolic_bp,
          v.weight_kg,
          v.temperature_f
        FROM waitlist w
        LEFT JOIN patients     p ON p.id = w.patient_id
        LEFT JOIN appointments a ON a.id = w.appointment_id
        LEFT JOIN vitals       v ON v.visit_id = COALESCE(a.id, w.appointment_id)
        WHERE w.date = ${today}::date
          AND (w.deleted_at IS NULL OR w.deleted_at::text = '')
        ORDER BY w.waiting_number ASC
      `);
      waitlistRows = wlResult as any[];
    } catch (e: any) {
      console.error('[Dashboard] waitlist query failed:', e?.message);
    }

    // Step 2: Get appointments today NOT in waitlist
    let apptRows: any[] = [];
    try {
      const apResult = await this.db.execute(sql`
        SELECT
          a.id,
          a.patient_id,
          a.token_no,
          a.status,
          COALESCE(p.first_name || ' ' || p.surname, a.patient_name, 'Unknown Patient') AS patient_name,
          COALESCE(p.regid, p.id, a.patient_id) AS regid,
          a.doctor_id,
          a.booking_time,
          a.created_at,
          a.updated_at,
          COALESCE(
            (SELECT name FROM doctors WHERE id = a.doctor_id LIMIT 1),
            (SELECT name FROM users   WHERE id = a.doctor_id LIMIT 1),
            'Practitioner'
          ) AS doctor_name,
          v.systolic_bp,
          v.diastolic_bp,
          v.weight_kg,
          v.temperature_f
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN vitals v ON v.visit_id = a.id
        WHERE a.booking_date = ${today}
          AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
          AND NOT EXISTS (
            SELECT 1 FROM waitlist w2
            WHERE (w2.appointment_id = a.id OR w2.patient_id = a.patient_id)
              AND w2.date = ${today}::date
              AND (w2.deleted_at IS NULL OR w2.deleted_at::text = '')
          )
        ORDER BY a.token_no ASC NULLS LAST, a.id ASC
      `);
      apptRows = apResult as any[];
    } catch (e: any) {
      console.error('[Dashboard] appointments query failed:', e?.message);
    }

    let allRows = [...waitlistRows, ...apptRows];

    // Filter by doctorId
    if (doctorId) {
      let doctorName = '';
      try {
        const dnRes = await this.db.execute(sql`
          SELECT COALESCE(
            (SELECT name FROM doctors WHERE id = ${doctorId} LIMIT 1),
            (SELECT name FROM users   WHERE id = ${doctorId} LIMIT 1),
            ''
          ) AS dname
        `);
        doctorName = ((dnRes as any[])[0]?.dname || '').toLowerCase().trim();
      } catch { }

      allRows = allRows.filter(r => {
        const rowDoctorId = Number(r.doctor_id);
        if (rowDoctorId === doctorId) return true;
        if (doctorName && r.doctor_name) {
          const rowDoctorName = (r.doctor_name || '').toLowerCase().trim();
          if (rowDoctorName === doctorName || rowDoctorName.includes(doctorName) || doctorName.includes(rowDoctorName)) {
            return true;
          }
        }
        return false;
      });
    }

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
      vitals: r.systolic_bp || r.weight_kg || r.temperature_f ? {
        bp: r.systolic_bp && r.diastolic_bp ? `${r.systolic_bp}/${r.diastolic_bp}` : undefined,
        weight: r.weight_kg ? Number(r.weight_kg) : undefined,
        temp: r.temperature_f ? Number(r.temperature_f) : undefined,
      } : undefined,
    }));
  }




  async getRecentActivity(contextId: number, limit: number): Promise<ActivityItem[]> {
    const revInfo = await this.getRevenueTableInfo();


    const queries: any[] = [];

    // Always query appointments
    queries.push(this.db.execute(sql`
      SELECT 'appointment' as type, 'Appointment - ' || p.first_name as title, a.booking_date::text as subtitle, a.created_at
      FROM appointments a JOIN patients p ON a.patient_id = p.id
      WHERE (a.deleted_at IS NULL OR a.deleted_at::text = '')
      ORDER BY a.id DESC LIMIT ${limit}
    `));

    // Conditionally query revenue table
    if (revInfo) {
      queries.push(this.db.execute(sql`
        SELECT 'payment' as type, 'Invoice paid - ' || p.first_name as title, 'Rs.' || r.${sql.identifier(revInfo.amountCol)} as subtitle, r.created_at, p.regid
        FROM ${sql.identifier(revInfo.name)} r JOIN patients p ON r.regid = p.regid
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
  }

  async getPendingReminders(contextId: number, limit: number): Promise<SimpleReminder[]> {
    const results = await this.db.execute(sql`
      SELECT cr.id, cr.patient_id, p.first_name || ' ' || p.surname as patient_name,
             cr.heading, cr.comments, cr.start_date, cr.status
      FROM case_reminder cr
      JOIN patients p ON cr.patient_id = p.id
      WHERE cr.status = 'pending'
      ORDER BY cr.id DESC LIMIT ${limit}
    `);

    return results as any as SimpleReminder[];
  }

  async getBirthdays(contextId: number): Promise<BirthdayPatient[]> {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const results = await this.db.execute(sql`
      SELECT id, regid, first_name, surname, phone, mobile1, dob
      FROM patients
      WHERE to_char(dob, 'MM-DD') = ${mmdd}
        AND (deleted_at IS NULL OR deleted_at::text = '')
    `);

    return results as any as BirthdayPatient[];
  }

  async getRevenueSeries(period: string, contextId: number, paymentMode?: string): Promise<RevenueSeries[]> {
    const revInfo = await this.getRevenueTableInfo();
    if (!revInfo) return [];

    const isReceipt = revInfo.name === 'receipt';
    const amountCol = isReceipt ? 'amount' : 'received';
    const dateCol = isReceipt ? 'created_at' : 'bill_date';
    const modeCol = isReceipt ? 'mode' : 'payment_mode';

    let modeFilter = '';
    if (paymentMode === 'Cash') {
      modeFilter = `AND (LOWER(COALESCE(${modeCol}, '')) = 'cash' OR ${modeCol} IS NULL OR ${modeCol} = '')`;
    } else if (paymentMode === 'UPI/Card') {
      modeFilter = `AND LOWER(COALESCE(${modeCol}, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm')`;
    }

    let interval = 'months';
    let count = 5;
    let trunc = 'month';
    let format = 'Mon';

    if (period === 'day') {
      interval = 'hours';
      count = 23;
      trunc = 'hour';
      format = 'HH24:00';
    } else if (period === 'week') {
      interval = 'days';
      count = 6;
      trunc = 'day';
      format = 'DD Mon';
    } else if (period === 'month') {
      interval = 'days';
      count = 29;
      trunc = 'day';
      format = 'DD Mon';
    }

    const results = await this.db.execute(sql`
      WITH periods AS (
        SELECT (date_trunc(${trunc}, NOW()) - (p || ${' ' + interval})::interval)::timestamp as p
        FROM generate_series(0, ${count}) p
      ),
      rev_data AS (
        SELECT 
          date_trunc(${trunc}, ${sql.identifier(dateCol)})::timestamp as p, 
          sum(CAST(NULLIF(${sql.identifier(amountCol)}::text, '') AS numeric)) as amt 
        FROM ${sql.identifier(revInfo.name)}
        WHERE ${sql.identifier(dateCol)} >= date_trunc(${trunc}, NOW()) - (${count} || ${' ' + interval})::interval
          ${sql.raw(modeFilter)}
          AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY 1
      )
      SELECT to_char(periods.p, ${format}) as label, 
             COALESCE(rev_data.amt, 0)::int as revenue
      FROM periods
      LEFT JOIN rev_data ON rev_data.p = periods.p
      ORDER BY periods.p ASC
    `);

    return (results as any[]).map(r => ({
      month: r.label, // keeping 'month' key for frontend compatibility
      revenue: Number(r.revenue) || 0
    }));
  }

  async markReminderDone(id: number): Promise<void> {
    await this.db.update(schema.caseReminders)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(schema.caseReminders.id, id));
  }

  async getRecentTransactions(limit: number): Promise<RecentTransaction[]> {
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
          WHERE (b.deleted_at IS NULL OR b.deleted_at::text = '')
          
          UNION ALL
          
          SELECT 
            'R-' || r.id::text as id,
            r.regid,
            'RCT-' || r.id::text AS invoice_no,
            COALESCE(CAST(NULLIF(r.amount::text, '') AS numeric), 0)::int AS amount,
            'paid' AS status,
            COALESCE(r.created_at, NOW()) as created_at
          FROM receipt r
          WHERE (r.deleted_at IS NULL OR r.deleted_at::text = '')
        )
        SELECT 
          c.*,
          COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.surname, '')), ''), 'Patient') AS patient_name
        FROM combined c
        LEFT JOIN patients p ON c.regid = p.regid
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
    const { start, boundary } = this.getPeriodDates(period);
    const revInfo = await this.getRevenueTableInfo();

    if (!revInfo) {
      return { physicalCurrency: 0, physicalCurrencyPct: 0, upiCard: 0, upiCardPct: 0, pending: 0, pendingCount: 0, perPatient: 0 };
    }

    const isReceipt = revInfo.name === 'receipt';
    const amountCol = isReceipt ? 'amount' : 'received';
    const dateCol = isReceipt ? 'created_at' : 'bill_date';
    const modeCol = isReceipt ? 'mode' : 'payment_mode';

    const [cashRes, upiCardRes, pendingRes] = await Promise.all([
      this.db.execute(sql`
        SELECT COALESCE(sum(CAST(NULLIF(${sql.identifier(amountCol)}::text, '') AS numeric)), 0) as total
        FROM ${sql.identifier(revInfo.name)}
        WHERE ${sql.identifier(dateCol)} >= ${start} AND ${sql.identifier(dateCol)} < ${boundary}
          AND (LOWER(COALESCE(${sql.identifier(modeCol)}, '')) = 'cash' OR ${sql.identifier(modeCol)} IS NULL OR ${sql.identifier(modeCol)} = '')
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      this.db.execute(sql`
        SELECT COALESCE(sum(CAST(NULLIF(${sql.identifier(amountCol)}::text, '') AS numeric)), 0) as total
        FROM ${sql.identifier(revInfo.name)}
        WHERE ${sql.identifier(dateCol)} >= ${start} AND ${sql.identifier(dateCol)} < ${boundary}
          AND LOWER(COALESCE(${sql.identifier(modeCol)}, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm')
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      this.db.execute(sql`
        SELECT
          COALESCE(sum(CAST(NULLIF(charges::text, '') AS numeric)), 0)::int as total_charges,
          COALESCE(sum(CAST(NULLIF(received::text, '') AS numeric)), 0)::int as total_received,
          count(*)::int as invoice_count
        FROM bills
        WHERE bill_date >= ${start}::date AND bill_date < ${boundary}::date
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `)
    ]);

    const cashTotal = Number((cashRes as any[])[0]?.total || 0);
    const upiCardTotal = Number((upiCardRes as any[])[0]?.total || 0);
    const pendingCharges = (pendingRes[0] as any)?.total_charges || 0;
    const pendingReceived = (pendingRes[0] as any)?.total_received || 0;
    const pendingCount = (pendingRes[0] as any)?.invoice_count || 0;
    const pendingTotal = Math.max(0, pendingCharges - pendingReceived);

    const grandTotal = cashTotal + upiCardTotal || 1;

    // Per-patient avg
    const patCountRes = await this.db.execute(sql`
      SELECT count(*)::int as cnt FROM patients
      WHERE created_at::date BETWEEN ${start} AND ${boundary}
        AND (deleted_at IS NULL OR deleted_at::text = '')
    `) as any[];
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
  }

  async getTopBilling(period: string, limit: number, contextId: number): Promise<TopBillingItem[]> {
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
      LEFT JOIN patients p ON b.regid = p.regid
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
  }

  async getMonthlyTargets(period: string, contextId: number): Promise<MonthlyTarget[]> {
    const { start, boundary, prevStart, prevBoundary } = this.getPeriodDates(period);

    // Current month actuals
    const revInfo = await this.getRevenueTableInfo();
    const amountCol = revInfo?.amountCol || 'charges';

    const [revRes, patRes, collRes, waitRes, prevRevRes, prevPatRes] = await Promise.all([
      this.db.execute(sql`
        SELECT (
          COALESCE((SELECT sum(received) FROM bills WHERE bill_date >= ${start} AND bill_date < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')), 0) +
          COALESCE((SELECT sum(CAST(NULLIF(amount::text, '') AS numeric)) FROM receipt WHERE created_at >= ${start} AND created_at < ${boundary} AND (deleted_at IS NULL OR deleted_at::text = '')), 0)
        ) as total
      `),
      this.db.execute(sql`
        SELECT count(*)::int as cnt FROM patients
        WHERE created_at >= ${start} AND created_at < ${boundary}
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      this.db.execute(sql`
        SELECT
          COALESCE(sum(CAST(NULLIF(charges::text, '') AS numeric)), 0)::int as total_charges,
          COALESCE(sum(CAST(NULLIF(received::text, '') AS numeric)), 0)::int as total_received
        FROM bills
        WHERE bill_date >= ${start} AND bill_date < ${boundary}
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      this.db.execute(sql`
        SELECT COALESCE(avg(extract(epoch from (called_at - checked_in_at))/60), 0)::int as avg_wait 
        FROM waitlist WHERE date >= ${start} AND date < ${boundary} AND called_at IS NOT NULL AND checked_in_at IS NOT NULL AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      this.db.execute(sql`
        SELECT (
          COALESCE((SELECT sum(received) FROM bills WHERE bill_date >= ${prevStart} AND bill_date < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')), 0) +
          COALESCE((SELECT sum(CAST(NULLIF(amount::text, '') AS numeric)) FROM receipt WHERE created_at >= ${prevStart} AND created_at < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')), 0)
        ) as total
      `),
      this.db.execute(sql`
        SELECT count(*)::int as cnt FROM patients
        WHERE created_at >= ${prevStart} AND created_at < ${prevBoundary} AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
    ]);

    const revenue = ((revRes as any[])[0] as any)?.total || 0;
    const patients = ((patRes as any[])[0] as any)?.cnt || 0;
    const totalCharges = ((collRes as any[])[0] as any)?.total_charges || 0;
    const totalReceived = ((collRes as any[])[0] as any)?.total_received || 0;
    const avgWaitTime = ((waitRes as any[])[0] as any)?.avg_wait || 0;
    const collectionRate = totalCharges > 0 ? Math.round((totalReceived / totalCharges) * 100) : 0;

    const prevRevenue = ((prevRevRes as any[])[0] as any)?.total || 0;
    const prevPatients = ((prevPatRes as any[])[0] as any)?.cnt || 0;

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
  }

  async getStaffOnDuty(contextId: number): Promise<{ name: string; role: string; count?: number }[]> {
    const docCol = await this.getDoctorColumn();

    // Query 1: Modern Users table
    const usersPromise = this.db.execute(sql`
      SELECT 
        name, 
        type as specialty,
        (SELECT count(id)::int FROM appointments a WHERE a.${sql.identifier(docCol)} = users.id AND a.booking_date = CURRENT_DATE::text AND (a.deleted_at IS NULL OR a.deleted_at::text = '' OR a.deleted_at::text = '0')) as visit_count
      FROM users
      WHERE (deleted_at IS NULL OR deleted_at::text = '') 
        AND (context_id = ${contextId} OR context_id::text = ${String(contextId)})
        AND LOWER(type) IN ('doctor', 'practitioner', 'practitioner_id')
      LIMIT 20
    `).catch((err) => {
      console.error('[Dashboard] Users Duty Query Failed:', err.message);
      return [] as any[];
    });

    // Query 2: Legacy Doctors table
    const doctorsPromise = this.db.execute(sql`
      SELECT 
        name, 
        designation as specialty,
        (SELECT count(id)::int FROM appointments a WHERE a.${sql.identifier(docCol)} = doctors.id AND a.booking_date = CURRENT_DATE::text AND (a.deleted_at IS NULL OR a.deleted_at::text = '' OR a.deleted_at::text = '0')) as visit_count
      FROM doctors
      WHERE (deleted_at IS NULL OR deleted_at::text = '') 
        AND (clinic_id = ${contextId} OR clinic_id::text = ${String(contextId)})
      LIMIT 20
    `).catch((err) => {
      console.error('[Dashboard] Doctors Duty Query Failed:', err.message);
      return [] as any[];
    });

    const [uRes, dRes] = await Promise.all([usersPromise, doctorsPromise]);
    
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
      count: Number(r.visit_count) || 0,
    }));
  }

  async getPlatformStats(): Promise<PlatformStats> {
    // These tables always live in the public schema
    const [orgCount] = await this.db.execute(sql`
      SELECT count(*)::int as count FROM public.organizations WHERE deleted_at IS NULL
    `) as any[];

    const [userCount] = await this.db.execute(sql`
      SELECT count(*)::int as count FROM users WHERE (deleted_at IS NULL OR deleted_at::text = '') AND is_active = true
    `) as any[];

    return {
      totalClinics: orgCount?.count || 0,
      totalStaff: userCount?.count || 0,
    };
  }
}
