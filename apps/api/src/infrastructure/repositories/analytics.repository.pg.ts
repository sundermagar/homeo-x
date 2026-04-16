import { eq, sql, desc, and, gte, lte, or, inArray, isNotNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type {
  IAnalyticsRepository
} from '../../domains/analytics/ports/analytics.repository';
import type {
  AnalyticsSummary, PatientTrendResult, MonthWiseResult,
  MonthWiseDueSummary, MonthWiseDueDetail, BirthdayPatient,
  ReferenceListResult
} from '@mmc/types';

export class AnalyticsRepositoryPg implements IAnalyticsRepository {
  constructor(private readonly db: DbClient) { }

  async getSummary(): Promise<AnalyticsSummary> {
    // Run each query independently so a missing legacy table doesn't break the whole summary
    const countPatients = async () => {
      try {
        const [r] = await this.db.select({ total: sql<number>`count(*)::int` }).from(schema.patients).where(sql`(deleted_at IS NULL OR deleted_at::text = '')`);
        return r?.total ?? 0;
      } catch { return 0; }
    };

    const countAppointments = async () => {
      try {
        const [r] = await this.db.select({ total: sql<number>`count(*)::int` }).from(schema.appointments).where(sql`(deleted_at IS NULL OR deleted_at::text = '')`);
        return r?.total ?? 0;
      } catch { return 0; }
    };

    const sumRevenue = async () => {
      try {
        const [r] = await this.db.select({ total: sql<number>`COALESCE(sum(CAST(NULLIF(amount, '') AS numeric)), 0)::int` }).from(schema.receiptLegacy).where(sql`(deleted_at IS NULL OR deleted_at::text = '')`);
        return r?.total ?? 0;
      } catch { return 0; }
    };

    const [totalPatients, totalAppointments, totalRevenue] = await Promise.all([
      countPatients(), countAppointments(), sumRevenue()
    ]);

    return { totalPatients, totalAppointments, totalRevenue };
  }

  async getPatientTrends(from?: Date, to?: Date): Promise<PatientTrendResult> {
    const fromStr = from ? from.toISOString().split('T')[0] : sql`NOW() - INTERVAL '6 months'`;
    const toStr = to ? to.toISOString().split('T')[0] : sql`NOW()`;

    // New Patients
    let newPatients: any[] = [];
    try {
      newPatients = await this.db.execute(sql`
        SELECT to_char(created_at, 'Mon YYYY') as month, count(*)::int as count
        FROM case_datas
        WHERE created_at::date BETWEEN ${fromStr} AND ${toStr} AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY to_char(created_at, 'YYYY-MM'), to_char(created_at, 'Mon YYYY')
        ORDER BY to_char(created_at, 'YYYY-MM') ASC
      `) as any[];
    } catch { newPatients = []; }

    // Revenue
    let revenueByMonth: any[] = [];
    try {
      revenueByMonth = await this.db.execute(sql`
        SELECT to_char(created_at, 'Mon YYYY') as month, sum(CAST(NULLIF(amount, '') AS numeric))::int as total
        FROM receipt
        WHERE created_at::date BETWEEN ${fromStr} AND ${toStr} AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY to_char(created_at, 'YYYY-MM'), to_char(created_at, 'Mon YYYY')
        ORDER BY to_char(created_at, 'YYYY-MM') ASC
      `) as any[];
    } catch { revenueByMonth = []; }

    // Top Diagnoses
    let topDiagnoses: any[] = [];
    try {
      topDiagnoses = await this.db.execute(sql`
        SELECT condition as diagnosis, count(*)::int as count
        FROM medicalcases
        WHERE condition IS NOT NULL AND condition != '' AND (deleted_at IS NULL OR deleted_at::text = '')
        GROUP BY condition
        ORDER BY count DESC
        LIMIT 10
      `) as any[];
    } catch { topDiagnoses = []; }

    return { newPatients, revenueByMonth, topDiagnoses };
  }

  async getMonthWiseBreakdown(fromYearMth: string, toYearMth: string): Promise<MonthWiseResult[]> {
    const start = new Date(`${fromYearMth}-01`);
    const end = new Date(`${toYearMth}-01`);

    // We'll iterate through the months in memory and fire grouped queries to match the PHP/legacy logic.
    const months: { year: number; month: number }[] = [];
    for (let d = start; d <= end; d.setMonth(d.getMonth() + 1)) {
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const results: MonthWiseResult[] = [];

    for (const m of months) {
      const firstDay = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
      const lastDayDate = new Date(m.year, m.month, 0);
      const lastDay = lastDayDate.toISOString().split('T')[0];
      const displaydate = lastDayDate.toLocaleString('default', { month: 'short' }) + '-' + m.year;

      let [newCasesRow]: any[] = [null];
      try {
        [newCasesRow] = await this.db.execute(sql`SELECT count(*)::int as cnt FROM medicalcases WHERE created_at::date BETWEEN ${firstDay} AND ${lastDay} AND (deleted_at IS NULL OR deleted_at::text = '')`) as any[];
      } catch { newCasesRow = { cnt: 0 }; }

      let [followupsRow]: any[] = [null];
      try {
        [followupsRow] = await this.db.execute(sql`SELECT count(*)::int as cnt FROM case_potencies WHERE dateval::date BETWEEN ${firstDay} AND ${lastDay} AND (deleted_at IS NULL OR deleted_at::text = '')`) as any[];
      } catch { followupsRow = { cnt: 0 }; }

      let receipts: any[] = [];
      try {
        receipts = await this.db.execute(sql`
          SELECT mode, sum(CAST(NULLIF(amount, '') AS numeric))::int as total 
          FROM receipt 
          WHERE (deleted_at IS NULL OR deleted_at::text = '') AND mode != 'RB'
            AND extract(month from created_at) = ${m.month} AND extract(year from created_at) = ${m.year}
          GROUP BY mode
        `) as any[];
      } catch { receipts = []; }

      let cash = 0, cheque = 0, online = 0, card = 0, payments = 0;
      for (const r of receipts) {
        const amt = Number(r.total) || 0;
        payments += amt;
        const mode = (r.mode || '').toUpperCase();
        if (mode === 'C' || mode === 'CASH') cash += amt;
        else if (mode === 'B' || mode === 'CH' || mode === 'CHEQUE') cheque += amt;
        else if (mode === 'O' || mode === 'ONLINE' || mode === 'NEFT' || mode === 'UPI') online += amt;
        else if (mode === 'S' || mode === 'CR' || mode === 'CARD') card += amt;
        else cash += amt; // default
      }

      // Expenses
      let expensesRow: any = { total: 0 };
      try {
        [expensesRow] = await this.db.execute(sql`SELECT COALESCE(sum(amount), 0)::int as total FROM expenses WHERE exp_date::date BETWEEN ${firstDay} AND ${lastDay} AND (deleted_at IS NULL OR deleted_at::text = '')`) as any[];
      } catch { expensesRow = { total: 0 }; }

      results.push({
        date: `${m.year}-${String(m.month).padStart(2, '0')}`,
        displaydate,
        new_cases: Number(newCasesRow?.cnt) || 0,
        followups: Number(followupsRow?.cnt) || 0,
        collection: payments,
        cash, cheque, online, card,
        product_charges: 0, // Legacy feature rarely used
        expenses: Number(expensesRow?.total) || 0,
        cash_deposit: 0,
        bank_deposit: 0,
        cash_in_hand: 0,
      });
    }

    return results;
  }

  async getMonthWiseDues(year: number): Promise<MonthWiseDueSummary[]> {
    try {
      const dues = await this.db.execute(sql`
        SELECT extract(month from created_at)::int as month, count(DISTINCT regid)::int as count, sum("Balance")::int as total_due
        FROM bill
        WHERE "Balance" > 0 
          AND (deleted_at IS NULL OR deleted_at::text = '') 
          AND extract(year from created_at) = ${year}
        GROUP BY extract(month from created_at)
      `);
      return dues as any as MonthWiseDueSummary[];
    } catch { return []; }
  }

  async getDueDetails(year: number, month: number): Promise<MonthWiseDueDetail[]> {
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
          AND extract(year from b.created_at) = ${year} AND extract(month from b.created_at) = ${month}
        GROUP BY p.regid, p.first_name, p.surname, p.mobile1, p.city
        ORDER BY total_due DESC
      `);
      return details as any as MonthWiseDueDetail[];
    } catch { return []; }
  }

  async getBirthdays(fromMonthDay: string, toMonthDay: string): Promise<BirthdayPatient[]> {
    try {
      // Input format MM-DD
      // MM-DD format check for birthday
      const res = await this.db.execute(sql`
        SELECT id, regid, first_name, surname, phone, mobile1, dob as date_birth, dob
        FROM case_datas
        WHERE dob IS NOT NULL AND (deleted_at IS NULL OR deleted_at::text = '')
          AND to_char(dob::date, 'MM-DD') BETWEEN ${fromMonthDay} AND ${toMonthDay}
      `);
      return res as any as BirthdayPatient[];
    } catch {
      return [];
    }
  }

  async getSmsSentIds(date: Date, smsType: string): Promise<number[]> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const res = await this.db.execute(sql`
        SELECT regid FROM sms_reports WHERE sms_type = ${smsType} AND status = 'sent' AND created_at::date = ${dateStr}
      `);
      return (res as any[]).map(r => r.regid);
    } catch {
      return [];
    }
  }

  async getReferenceListing(from: Date, to: Date): Promise<ReferenceListResult[]> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    try {
      const res = await this.db.execute(sql`
        SELECT COALESCE(p.reference, 'Direct') as reference, count(*)::int as count, sum(CAST(NULLIF(r.amount, '') AS numeric))::int as totalcollection
        FROM case_datas p
        LEFT JOIN receipt r ON r.regid = p.regid AND (r.deleted_at IS NULL OR r.deleted_at::text = '') AND r.created_at::date BETWEEN ${fromStr} AND ${toStr}
        WHERE p.created_at::date BETWEEN ${fromStr} AND ${toStr} AND (p.deleted_at IS NULL OR p.deleted_at::text = '')
        GROUP BY p.reference
        ORDER BY count DESC
      `);
      return res as any as ReferenceListResult[];
    } catch { return []; }
  }
}
