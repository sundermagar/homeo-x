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

    const res = await this.db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'appointments' AND column_name IN ('assistant_doctor', 'doctor_id') AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);
    const col = res[0] ? (res[0] as any).column_name : 'assistant_doctor';
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
        d.setHours(0,0,0,0);
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

    // Single round-trip: 4 queries instead of 9 (merged prev/curr + eliminated duplicate bills scans)
    const [patientsRes, expensesRes, currRes, prevRes] = await Promise.all([
      // Patients: current + previous in one query
      this.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp AND (deleted_at IS NULL OR deleted_at::text = ''))::int as curr_patients,
          count(*) FILTER (WHERE created_at >= ${prevStart}::timestamp AND created_at < ${prevBoundary}::timestamp AND (deleted_at IS NULL OR deleted_at::text = ''))::int as prev_patients
        FROM patients
      `),
      // Expenses for current period only
      this.db.execute(sql`
        SELECT COALESCE(sum(amount), 0)::int as total
        FROM expenses
        WHERE exp_date >= ${start}::date AND exp_date < ${boundary}::date
          AND (deleted_at IS NULL OR deleted_at::text = '')
      `),
      // Current period: bills charges/received + receipt total
      this.db.execute(sql`
        SELECT
          COALESCE(sum(b.charges), 0)::numeric as charges,
          COALESCE(sum(b.received), 0)::numeric as received,
          COALESCE(sum(b.received), 0) + COALESCE(sum(CAST(NULLIF(r.amount::text, '') AS numeric)), 0) as revenue
        FROM bills b
        LEFT JOIN receipt r ON r.created_at >= ${start}::timestamp AND r.created_at < ${boundary}::timestamp AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
        WHERE b.bill_date >= ${start}::date AND b.bill_date < ${boundary}::date
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
      `),
      // Previous period: same structure
      this.db.execute(sql`
        SELECT
          COALESCE(sum(b.charges), 0)::numeric as charges,
          COALESCE(sum(b.received), 0)::numeric as received,
          COALESCE(sum(b.received), 0) + COALESCE(sum(CAST(NULLIF(r.amount::text, '') AS numeric)), 0) as revenue
        FROM bills b
        LEFT JOIN receipt r ON r.created_at >= ${prevStart}::timestamp AND r.created_at < ${prevBoundary}::timestamp AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
        WHERE b.bill_date >= ${prevStart}::date AND b.bill_date < ${prevBoundary}::date
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '')
      `),
    ]) as any[];

    const curr = currRes[0] || { charges: 0, received: 0, revenue: 0 };
    const prev = prevRes[0] || { charges: 0, received: 0, revenue: 0 };
    const pat = patientsRes[0] || { curr_patients: 0, prev_patients: 0 };
    const exp = expensesRes[0] || { total: 0 };

    const currE = Number(curr.revenue) || 0;
    const prevE = Number(prev.revenue) || 0;
    const currP = pat.curr_patients || 0;
    const prevP = pat.prev_patients || 0;

    const revTrend = prevE > 0 ? ((currE - prevE) / prevE * 100).toFixed(1) : '0.0';
    const patTrend = prevP > 0 ? ((currP - prevP) / prevP * 100).toFixed(1) : '0.0';

    const currRate = Number(curr.charges) > 0 ? Math.round((Number(curr.received) / Number(curr.charges)) * 100) : 0;
    const prevRate = Number(prev.charges) > 0 ? Math.round((Number(prev.received) / Number(prev.charges)) * 100) : 0;
    const collTrend = prevRate > 0 ? ((currRate - prevRate) / prevRate * 100).toFixed(1) : '0.0';

    return {
      newPatientsCount: currP,
      followUpsCount: 0,
      todaysCollection: currE,
      todaysExpenses: Number(exp.total) || 0,
      revenueTrend: revTrend,
      patientTrend: patTrend,
      collectionRate: currRate,
      collectionRateTrend: collTrend,
      avgWaitTime: 0,
      avgWaitTimeTrend: '0.0'
    };
  }

  async getTodayQueue(contextId: number, doctorId?: number): Promise<QueueItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const docCol = await this.getDoctorColumn();

    // Subquery deduplicates rows from the token JOIN (DISTINCT ON requires id first in ORDER BY),
    // then outer query re-orders by clinical priority so CONSULTATION is first, WAITING by token, etc.
    const results = await this.db.execute(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (a.id)
          a.id, a.patient_id, a.booking_time, a.status, 
          COALESCE(p.first_name || ' ' || p.surname, a.patient_name) as patient_name,
          p.regid, p.gender, 
          extract(year from age(p.dob))::int as age,
          a.token_no,
          d.name as doctor_name,
          v.systolic_bp || '/' || v.diastolic_bp as bp,
          v.pulse_rate as pulse,
          v.weight_kg as weight,
          v.temperature_f as temp
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN tokens t ON t.patient_id = a.patient_id AND t.date::date = a.booking_date::date
        LEFT JOIN doctors d ON d.id = a.${sql.identifier(docCol)}
        LEFT JOIN vitals v ON v.visit_id = a.id
        WHERE a.booking_date::date = ${today}
          AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
          ${doctorId ? sql`AND a.${sql.identifier(docCol)} = ${doctorId}` : sql``}
        ORDER BY a.id, 
          CASE UPPER(a.status)
            WHEN 'CONSULTATION' THEN 1
            WHEN 'CONFIRMED'    THEN 2
            WHEN 'WAITLIST'     THEN 2
            WHEN 'PENDING'      THEN 3
            ELSE 4
          END ASC,
          a.id DESC
      ) q
      ORDER BY
        CASE 
          WHEN UPPER(q.status) = 'CONSULTATION' THEN 1
          WHEN UPPER(q.status) = 'CONFIRMED'    THEN 2
          WHEN UPPER(q.status) = 'WAITLIST'     THEN 2
          WHEN UPPER(q.status) = 'WAITING'      THEN 2
          WHEN UPPER(q.status) = 'PENDING'      THEN 3
          WHEN UPPER(q.status) = 'COMPLETED'    THEN 4
          ELSE 5
        END ASC,
        q.token_no ASC NULLS LAST,
        q.booking_time ASC
    `);

    return (results as any[]).map(r => ({
      id: r.id,
      patientId: r.patient_id,
      regid: r.regid,
      patientName: r.patient_name,
      doctorName: r.doctor_name || 'Clinic',
      bookingTime: r.booking_time,
      tokenNo: r.token_no,
      status: r.status,
      isUrgent: false,
      age: r.age,
      gender: r.gender,
      vitals: r.bp ? {
        bp: r.bp,
        pulse: r.pulse,
        weight: r.weight,
        temp: r.temp
      } : undefined
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
    let modeFilter = '';
    if (paymentMode === 'Cash') {
      modeFilter = "AND LOWER(COALESCE(payment_mode, '')) = 'cash'";
    } else if (paymentMode === 'UPI/Card') {
      modeFilter = "AND LOWER(COALESCE(payment_mode, '')) IN ('upi', 'card', 'online')";
    }

    const results = await this.db.execute(sql`
      WITH months AS (
        SELECT (date_trunc('month', NOW()) - (m || ' months')::interval)::date as m
        FROM generate_series(0, 5) m
      ),
      rev_bills AS (
        SELECT date_trunc('month', bill_date)::date as m, sum(received) as amt FROM bills 
        WHERE bill_date >= date_trunc('month', NOW()) - interval '6 months' 
          ${sql.raw(modeFilter ? modeFilter : "")}
          AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY 1
      ),
      rev_receipts AS (
        SELECT date_trunc('month', created_at)::date as m, sum(CAST(NULLIF(amount::text, '') AS numeric)) as amt FROM receipt 
        WHERE created_at >= date_trunc('month', NOW()) - interval '6 months'
          ${sql.raw(modeFilter ? modeFilter.replace('payment_mode', 'mode') : "")}
          AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY 1
      )
      SELECT to_char(months.m, 'Mon') as month, 
             COALESCE((
               SELECT sum(amt) FROM (
                 SELECT amt FROM rev_bills b WHERE b.m = months.m 
                 UNION ALL 
                 SELECT amt FROM rev_receipts r WHERE r.m = months.m
               ) t
             ), 0)::int as revenue
      FROM months
      ORDER BY months.m ASC
    `);

    return (results as any[]).map(r => ({
      month: r.month,
      revenue: r.revenue
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
        SELECT 
          b.id,
          COALESCE(p.first_name || ' ' || p.surname, 'Unknown') AS patient_name,
          COALESCE(b.bill_no::text, 'INV-' || b.id::text) AS invoice_no,
          COALESCE(CAST(NULLIF(b.charges::text, '') AS numeric), 0)::int AS amount,
          CASE
            WHEN COALESCE(CAST(NULLIF(b.balance::text, '') AS numeric), 0) <= 0 THEN 'paid'
            WHEN COALESCE(CAST(NULLIF(b.received::text, '') AS numeric), 0) > 0 THEN 'partial'
            ELSE 'due'
          END AS status
        FROM bills b
        LEFT JOIN patients p ON b.regid = p.regid
        WHERE (b.deleted_at IS NULL OR b.deleted_at::text = '')
        ORDER BY b.id DESC
        LIMIT ${limit}
      `);
      return (results as any[]).map(r => ({
        id: r.id,
        patientName: r.patient_name || 'Unknown',
        invoiceNo: r.invoice_no || `INV-${r.id}`,
        amount: Number(r.amount) || 0,
        status: r.status || 'due',
      }));
    } catch {
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

    // Consolidated Cash vs UPI/Card
    const results = await Promise.all([
      this.db.execute(sql`
        SELECT (
          COALESCE((SELECT sum(received) FROM bills WHERE bill_date >= ${start}::date AND bill_date < ${boundary}::date AND (LOWER(COALESCE(payment_mode, '')) = 'cash' OR payment_mode IS NULL OR payment_mode = '') AND (deleted_at IS NULL OR deleted_at::text = '')), 0) +
          COALESCE((SELECT sum(CAST(NULLIF(amount::text, '') AS numeric)) FROM receipt WHERE created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp AND (LOWER(COALESCE(mode, '')) = 'cash' OR mode IS NULL OR mode = '') AND (deleted_at IS NULL OR deleted_at::text = '')), 0)
        ) as total
      `),
      this.db.execute(sql`
        SELECT (
          COALESCE((SELECT sum(received) FROM bills WHERE bill_date >= ${start}::date AND bill_date < ${boundary}::date AND LOWER(COALESCE(payment_mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') AND (deleted_at IS NULL OR deleted_at::text = '')), 0) +
          COALESCE((SELECT sum(CAST(NULLIF(amount::text, '') AS numeric)) FROM receipt WHERE created_at >= ${start}::timestamp AND created_at < ${boundary}::timestamp AND LOWER(COALESCE(mode, '')) IN ('upi', 'card', 'online', 'bank', 'gpay', 'phonepe', 'paytm') AND (deleted_at IS NULL OR deleted_at::text = '')), 0)
        ) as total
      `)
    ]);

    const cashRes = (results[0] as any[]) || [];
    const upiCardRes = (results[1] as any[]) || [];

    const pendingRes = await this.db.execute(sql`
      SELECT
        COALESCE(sum(CAST(NULLIF(charges::text, '') AS numeric)), 0)::int as total_charges,
        COALESCE(sum(CAST(NULLIF(received::text, '') AS numeric)), 0)::int as total_received,
        count(*)::int as invoice_count
      FROM bills
      WHERE bill_date::date BETWEEN ${start} AND ${boundary}
        AND (deleted_at IS NULL OR deleted_at::text = '')
    `) as any[];

    const cashTotal = Number(cashRes?.[0]?.total || 0);
    const upiCardTotal = Number(upiCardRes?.[0]?.total || 0);
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
      SELECT b.id, p.first_name || ' ' || p.surname as patient_name,
             p.regid,
             b.charges as total,
             CASE
               WHEN b.balance <= 0 THEN 'Paid'
               WHEN b.received > 0 THEN 'Partial'
               ELSE 'Pending'
             END as status
      FROM bills b
      LEFT JOIN patients p ON b.regid = p.regid
      WHERE b.bill_date >= ${start}::date AND b.bill_date < ${boundary}::date
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
    const { start, boundary } = this.getPeriodDates(period);

    // Current month actuals
    const revInfo = await this.getRevenueTableInfo();
    const amountCol = revInfo?.amountCol || 'charges';

    const [revRes, patRes, collRes, waitRes] = await Promise.all([
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
    ]);

    const revenue = ((revRes as any[])[0] as any)?.total || 0;
    const patients = ((patRes as any[])[0] as any)?.cnt || 0;
    const totalCharges = ((collRes as any[])[0] as any)?.total_charges || 0;
    const totalReceived = ((collRes as any[])[0] as any)?.total_received || 0;
    const avgWaitTime = ((waitRes as any[])[0] as any)?.avg_wait || 0;
    const collectionRate = totalCharges > 0 ? Math.round((totalReceived / totalCharges) * 100) : 0;

    // Hardcoded targets for now (could be made configurable)
    const revenueTarget = 500000; // ₹5L
    const patientsTarget = 350;
    const collectionTarget = 95;
    const waitTimeTarget = 20; // minutes

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
    const today = new Date().toISOString().split('T')[0];
    const docCol = await this.getDoctorColumn();

    const results = await this.db.execute(sql`
      SELECT DISTINCT d.name, d.specialty,
             count(a.id)::int as visit_count
      FROM appointments a
      JOIN doctors d ON a.${sql.identifier(docCol)} = d.id
      WHERE a.booking_date::date = ${today}
        AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
      GROUP BY d.name, d.specialty
      ORDER BY visit_count DESC
      LIMIT 10
    `) as any[];

    if ((results as any[]).length === 0) {
      return [];
    }

    return (results as any[]).map(r => ({
      name: r.name || 'Unknown',
      role: r.specialty || 'Doctor',
      count: r.visit_count,
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
