import { eq, sql, desc, and, gte, lte, or, inArray, isNotNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type {
  IAnalyticsRepository
} from '../../domains/analytics/ports/analytics.repository.js';
import type {
  AnalyticsSummary, PatientTrendResult, MonthWiseResult,
  MonthWiseDueSummary, MonthWiseDueDetail, BirthdayPatient,
  ReferenceListResult
} from '@mmc/types';

export class AnalyticsRepositoryPg implements IAnalyticsRepository {
  constructor(private readonly db: DbClient) { }

  async getSummary(clinicId?: number): Promise<AnalyticsSummary> {
    const countPatients = async () => {
      try {
        const conditions = [sql`(deleted_at IS NULL OR deleted_at::text = '')` as any];
        if (clinicId) conditions.push(eq(schema.patients.clinicId, clinicId));
        const [r] = await this.db.select({ total: sql<number>`count(*)::int` }).from(schema.patients).where(and(...conditions));
        return r?.total ?? 0;
      } catch { return 0; }
    };

    const countAppointments = async () => {
      try {
        const conditions = [sql`(deleted_at IS NULL OR deleted_at::text = '')` as any];
        if (clinicId) conditions.push(eq(schema.appointments.clinicId, clinicId));
        const [r] = await this.db.select({ total: sql<number>`count(*)::int` }).from(schema.appointments).where(and(...conditions));
        return r?.total ?? 0;
      } catch { return 0; }
    };

    const sumRevenue = async () => {
      try {
        const conditions = [sql`(${schema.receiptLegacy.deletedAt} IS NULL OR ${schema.receiptLegacy.deletedAt}::text = '')` as any];
        if (clinicId) conditions.push(eq(schema.patients.clinicId, clinicId));
        
        const [r] = await this.db.select({ 
          total: sql<number>`COALESCE(sum(CAST(NULLIF(${schema.receiptLegacy.amount}, '') AS numeric)), 0)::int` 
        })
          .from(schema.receiptLegacy)
          .innerJoin(schema.patients, eq(schema.patients.regid, schema.receiptLegacy.regid))
          .where(and(...conditions));
        return r?.total ?? 0;
      } catch (err) { 
        console.error("[sumRevenue] Error:", err);
        return 0; 
      }
    };

    const [totalPatients, totalAppointments, totalRevenue] = await Promise.all([
      countPatients(), countAppointments(), sumRevenue()
    ]);

    return { totalPatients, totalAppointments, totalRevenue };
  }

  async getPatientTrends(clinicId?: number, from?: Date, to?: Date): Promise<PatientTrendResult> {
    const fromStr = from ? from.toISOString().split('T')[0] : sql`NOW() - INTERVAL '6 months'`;
    const toStr = to ? to.toISOString().split('T')[0] : sql`NOW()`;

    // New Patients
    let newPatients: any[] = [];
    try {
      newPatients = await this.db.execute(sql`
        SELECT to_char(created_at, 'Mon YYYY') as month, count(*)::int as count
        FROM case_datas
        WHERE (clinic_id = ${clinicId} OR clinic_id IS NULL) AND created_at::date BETWEEN ${fromStr} AND ${toStr} AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY to_char(created_at, 'YYYY-MM'), to_char(created_at, 'Mon YYYY')
        ORDER BY to_char(created_at, 'YYYY-MM') ASC
      `) as any[];
    } catch { newPatients = []; }

    // Revenue
    let revenueByMonth: any[] = [];
    try {
      revenueByMonth = await this.db.execute(sql`
        SELECT to_char(r.created_at, 'Mon YYYY') as month, sum(CAST(NULLIF(r.amount, '') AS numeric))::int as total
        FROM receipt r
        JOIN case_datas p ON p.regid = r.regid
        WHERE (p.clinic_id = ${clinicId} OR p.clinic_id IS NULL) AND r.created_at::date BETWEEN ${fromStr} AND ${toStr} AND (r.deleted_at IS NULL OR r.deleted_at::text = '')
        GROUP BY to_char(r.created_at, 'YYYY-MM'), to_char(r.created_at, 'Mon YYYY')
        ORDER BY to_char(r.created_at, 'YYYY-MM') ASC
      `) as any[];
    } catch { revenueByMonth = []; }

    // Top Diagnoses
    let topDiagnoses: any[] = [];
    try {
      topDiagnoses = await this.db.execute(sql`
        SELECT m.condition as diagnosis, count(*)::int as count
        FROM medicalcases m
        JOIN case_datas p ON p.regid = m.regid
        WHERE (p.clinic_id = ${clinicId} OR p.clinic_id IS NULL) AND m.condition IS NOT NULL AND m.condition != '' AND (m.deleted_at IS NULL OR m.deleted_at::text = '')
        GROUP BY m.condition
        ORDER BY count DESC
        LIMIT 10
      `) as any[];
    } catch { topDiagnoses = []; }

    return { newPatients, revenueByMonth, topDiagnoses };
  }

  async getMonthWiseBreakdown(clinicId?: number, fromYearMth?: string, toYearMth?: string): Promise<MonthWiseResult[]> {
    const firstDay = `${fromYearMth}-01`;
    const lastDayDate = new Date(`${toYearMth}-01`);
    lastDayDate.setMonth(lastDayDate.getMonth() + 1);
    lastDayDate.setDate(0);
    const lastDay = lastDayDate.toISOString().split('T')[0];

    // Single aggregated query to eliminate N+1 performance issues
    const query = sql`
      WITH months AS (
        SELECT 
          to_char(m, 'YYYY-MM') as month_key,
          to_char(m, 'Mon-YYYY') as display_date
        FROM generate_series(
          ${firstDay}::date, 
          ${lastDay}::date, 
          '1 month'::interval
        ) m
      ),
      new_cases AS (
        SELECT to_char(m.created_at, 'YYYY-MM') as month_key, count(*)::int as cnt
        FROM medicalcases m
        JOIN case_datas p ON p.regid = m.regid
        WHERE (m.deleted_at IS NULL OR m.deleted_at::text = '')
          ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
          AND m.created_at::date BETWEEN ${firstDay} AND ${lastDay}
        GROUP BY 1
      ),
      followups AS (
        SELECT to_char(cp.dateval::date, 'YYYY-MM') as month_key, count(*)::int as cnt
        FROM case_potencies cp
        JOIN case_datas p ON p.regid = cp.regid
        WHERE (cp.deleted_at IS NULL OR cp.deleted_at::text = '')
          ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
          AND cp.dateval::date BETWEEN ${firstDay} AND ${lastDay}
        GROUP BY 1
      ),
      receipts AS (
        SELECT 
          to_char(r.created_at, 'YYYY-MM') as month_key,
          sum(CASE 
            WHEN upper(r.mode) IN ('C', 'CASH') THEN CAST(NULLIF(r.amount, '') AS numeric) 
            ELSE 0 
          END)::int as cash,
          sum(CASE 
            WHEN upper(r.mode) IN ('B', 'CH', 'CHEQUE') THEN CAST(NULLIF(r.amount, '') AS numeric) 
            ELSE 0 
          END)::int as cheque,
          sum(CASE 
            WHEN upper(r.mode) IN ('O', 'ONLINE', 'NEFT', 'UPI') THEN CAST(NULLIF(r.amount, '') AS numeric) 
            ELSE 0 
          END)::int as online,
          sum(CASE 
            WHEN upper(r.mode) IN ('S', 'CR', 'CARD') THEN CAST(NULLIF(r.amount, '') AS numeric) 
            ELSE 0 
          END)::int as card,
          sum(CAST(NULLIF(r.amount, '') AS numeric))::int as total
        FROM receipt r
        JOIN case_datas p ON p.regid = r.regid
        WHERE (r.deleted_at IS NULL OR r.deleted_at::text = '')
          AND r.mode != 'RB'
          ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
          AND r.created_at::date BETWEEN ${firstDay} AND ${lastDay}
        GROUP BY 1
      ),
      exp AS (
        SELECT to_char(exp_date::date, 'YYYY-MM') as month_key, sum(amount)::int as total
        FROM expenses
        WHERE (deleted_at IS NULL OR deleted_at::text = '')
          ${clinicId ? sql`AND clinic_id = ${clinicId}` : sql``}
          AND exp_date::date BETWEEN ${firstDay} AND ${lastDay}
        GROUP BY 1
      )
      SELECT 
        m.month_key as date,
        m.display_date as displaydate,
        COALESCE(nc.cnt, 0)::int as new_cases,
        COALESCE(f.cnt, 0)::int as followups,
        COALESCE(r.total, 0)::int as collection,
        COALESCE(r.cash, 0)::int as cash,
        COALESCE(r.cheque, 0)::int as cheque,
        COALESCE(r.online, 0)::int as online,
        COALESCE(r.card, 0)::int as card,
        COALESCE(ex.total, 0)::int as expenses
      FROM months m
      LEFT JOIN new_cases nc ON m.month_key = nc.month_key
      LEFT JOIN followups f ON m.month_key = f.month_key
      LEFT JOIN receipts r ON m.month_key = r.month_key
      LEFT JOIN exp ex ON m.month_key = ex.month_key
      ORDER BY m.month_key ASC
    `;

    try {
      const rows = await this.db.execute(query) as any[];
      return rows.map(r => ({
        date: r.date,
        displaydate: r.displaydate,
        new_cases: r.new_cases,
        followups: r.followups,
        collection: r.collection,
        cash: r.cash,
        cheque: r.cheque,
        online: r.online,
        card: r.card,
        expenses: r.expenses,
        product_charges: 0,
        cash_deposit: 0,
        bank_deposit: 0,
        cash_in_hand: 0,
      }));
    } catch (err) {
      console.error("[MonthWiseBreakdown] Error executing optimized query:", err);
      return [];
    }
  }

  async getMonthWiseDues(clinicId?: number, year?: number): Promise<MonthWiseDueSummary[]> {
    try {
      const dues = await this.db.execute(sql`
        SELECT extract(month from b.created_at)::int as month, count(DISTINCT b.regid)::int as count, sum(b."Balance")::int as total_due
        FROM bill b
        JOIN case_datas p ON p.regid = b.regid
        WHERE b."Balance" > 0 
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '') 
          ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
          AND extract(year from b.created_at) = ${year}
        GROUP BY extract(month from b.created_at)
      `);
      return dues as any as MonthWiseDueSummary[];
    } catch { return []; }
  }

  async getDueDetails(clinicId?: number, year?: number, month?: number): Promise<MonthWiseDueDetail[]> {
    try {
      const details = await this.db.execute(sql`
        SELECT
          p.regid, p.first_name, p.surname, p.mobile1, p.city,
          sum(b."Balance")::int as total_due, sum(b.charges)::int as total_charges, sum(b.received)::int as total_received,
          max(b.created_at) as last_bill_date
        FROM bill b
        JOIN case_datas p ON b.regid = p.regid
        WHERE b."Balance" > 0 
          AND (b.deleted_at IS NULL OR b.deleted_at::text = '') 
          AND (p.deleted_at IS NULL OR p.deleted_at::text = '')
          ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
          AND extract(year from b.created_at) = ${year} AND extract(month from b.created_at) = ${month}
        GROUP BY p.regid, p.first_name, p.surname, p.mobile1, p.city
        ORDER BY total_due DESC
      `);
      return details as any as MonthWiseDueDetail[];
    } catch { return []; }
  }

  async getBirthdays(clinicId?: number, fromMonthDay?: string, toMonthDay?: string): Promise<BirthdayPatient[]> {
    try {
      const res = await this.db.execute(sql`
        SELECT id, regid, first_name, surname, phone, mobile1, dob as date_birth, dob
        FROM case_datas
        WHERE (deleted_at IS NULL OR deleted_at::text = '')
          ${clinicId ? sql`AND clinic_id = ${clinicId}` : sql``}
          AND (
            (dob IS NOT NULL AND to_char(dob::date, 'MM-DD') = ${fromMonthDay})
            OR
            (date_of_birth IS NOT NULL AND date_of_birth != '' AND 
             CASE 
               WHEN date_of_birth ~ '^\d{4}-\d{2}-\d{2}$' THEN substring(date_of_birth from 6 for 5) = ${fromMonthDay}
               ELSE FALSE
             END
            )
          )
      `);
      return res as any as BirthdayPatient[];
    } catch {
      return [];
    }
  }

  async getSmsSentIds(clinicId?: number, date?: Date, smsType?: string): Promise<number[]> {
    try {
      const d = date || new Date();
      const dateStr = d.toISOString().split('T')[0];
      const res = await this.db.execute(sql`
        SELECT s.regid 
        FROM sms_reports s
        JOIN case_datas p ON p.regid = s.regid
        WHERE s.sms_type = ${smsType} AND s.status = 'sent' AND s.created_at::date = ${dateStr}
        ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
      `);
      return (res as any[]).map(r => r.regid);
    } catch {
      return [];
    }
  }

  async getReferenceListing(clinicId?: number, from?: Date, to?: Date): Promise<ReferenceListResult[]> {
    const f = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const t = to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const fromStr = f.toISOString().split('T')[0];
    const toStr = t.toISOString().split('T')[0];
    try {
      const res = await this.db.execute(sql`
        SELECT COALESCE(p.reference, 'Direct') as reference, count(*)::int as count, sum(CAST(NULLIF(r.amount, '') AS numeric))::int as totalcollection
        FROM case_datas p
        LEFT JOIN receipt r ON r.regid = p.regid AND (r.deleted_at IS NULL OR r.deleted_at::text = '') AND r.created_at::date BETWEEN ${fromStr} AND ${toStr}
        WHERE p.created_at::date BETWEEN ${fromStr} AND ${toStr} AND (p.deleted_at IS NULL OR p.deleted_at::text = '')
        ${clinicId ? sql`AND p.clinic_id = ${clinicId}` : sql``}
        GROUP BY p.reference
        ORDER BY count DESC
      `);
      return res as any as ReferenceListResult[];
    } catch { return []; }
  }
}
