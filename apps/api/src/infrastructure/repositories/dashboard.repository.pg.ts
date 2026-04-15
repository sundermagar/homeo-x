import { sql, eq, and, desc, gte, lte, isNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { 
  DashboardKpis, 
  QueueItem, 
  ActivityItem, 
  SimpleReminder, 
  BirthdayPatient,
  RevenueSeries
} from '@mmc/types';
import type { IDashboardRepository } from '../../domains/dashboard/ports/dashboard.repository';

export class DashboardRepositoryPg implements IDashboardRepository {
  constructor(private readonly db: DbClient) {}

  private async getRevenueTableInfo(): Promise<{ name: string; amountCol: string; hasMode: boolean } | null> {
    const res = await this.db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('receipt', 'bills') AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);
    if (!res[0]) return null;
    const name = (res[0] as any).table_name;
    
    // Check if mode column exists
    const modeRes = await this.db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${name} AND column_name = 'mode' AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);
    
    return { name, amountCol: name === 'receipt' ? 'amount' : 'charges', hasMode: !!modeRes[0] };
  }

  private async getDoctorColumn(): Promise<string> {
    const res = await this.db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'appointments' AND column_name IN ('assistant_doctor', 'doctor_id') AND table_schema = CURRENT_SCHEMA() 
      LIMIT 1
    `);
    return res[0] ? (res[0] as any).column_name : 'assistant_doctor';
  }

  async getKpis(period: string, contextId: number, doctorId?: number): Promise<DashboardKpis> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Period calculation logic mirroring legacy getPeriodDates
    const getDates = (p: string) => {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      switch (p) {
        case 'day': return { start: today, end: today };
        case 'week': {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay());
          const start = d.toISOString().split('T')[0];
          d.setDate(d.getDate() + 6);
          return { start, end: d.toISOString().split('T')[0] };
        }
        case 'year': return { start: `${year}-01-01`, end: `${year}-12-31` };
        default: return { 
          start: `${year}-${month}-01`, 
          end: new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0] 
        };
      }
    };

    const { start, end } = getDates(period);
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    const diffMs = endDate.getTime() - startDate.getTime() + 86400000;
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diffMs + 86400000);
    const prevStDate = prevStart.toISOString().split('T')[0];
    const prevEndDate = prevEnd.toISOString().split('T')[0];

    // Detect revenue table Info
    const revInfo = await this.getRevenueTableInfo();

    // Parallel queries for non-dynamic parts
    const [
      [currPatients], [prevPatients],
      [expenses]
    ] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.patients).where(sql`created_at::date BETWEEN ${start} AND ${end} AND (deleted_at IS NULL OR deleted_at::text = '')`),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.patients).where(sql`created_at::date BETWEEN ${prevStDate} AND ${prevEndDate} AND (deleted_at IS NULL OR deleted_at::text = '')`),
      this.db.select({ total: sql<number>`COALESCE(sum(amount), 0)::int` }).from(schema.expensesLegacy).where(sql`exp_date::date BETWEEN ${start} AND ${end} AND (deleted_at IS NULL OR deleted_at::text = '')`)
    ]);

    let currE = 0;
    let prevE = 0;

    if (revInfo) {
      const [revCurr, revPrev] = await Promise.all([
        this.db.execute(sql`
          SELECT COALESCE(sum(CAST(NULLIF(${sql.identifier(revInfo.amountCol)}::text, '') AS numeric)), 0)::int as total 
          FROM ${sql.identifier(revInfo.name)}
          WHERE created_at::date BETWEEN ${start} AND ${end} 
            ${sql.raw(revInfo.hasMode ? "AND (mode IS NULL OR mode != 'RB')" : "")}
            AND (deleted_at IS NULL OR deleted_at::text = '')
        `).then(res => res[0] as any),
        this.db.execute(sql`
          SELECT COALESCE(sum(CAST(NULLIF(${sql.identifier(revInfo.amountCol)}::text, '') AS numeric)), 0)::int as total 
          FROM ${sql.identifier(revInfo.name)}
          WHERE created_at::date BETWEEN ${prevStDate} AND ${prevEndDate} 
            ${sql.raw(revInfo.hasMode ? "AND (mode IS NULL OR mode != 'RB')" : "")}
            AND (deleted_at IS NULL OR deleted_at::text = '')
        `).then(res => res[0] as any)
      ]);
      currE = revCurr?.total || 0;
      prevE = revPrev?.total || 0;
    }

    const currP = currPatients?.count || 0;
    const prevP = prevPatients?.count || 0;

    const revTrend = prevE > 0 ? ((currE - prevE) / prevE * 100).toFixed(1) : '0.0';
    const patTrend = prevP > 0 ? ((currP - prevP) / prevP * 100).toFixed(1) : '0.0';

    return {
      newPatientsCount: currP,
      followUpsCount: 0, 
      todaysCollection: currE,
      todaysExpenses: expenses?.total || 0,
      revenueTrend: revTrend,
      patientTrend: patTrend,
      collectionRate: 91, 
      avgWaitTime: 18
    };
  }

  async getTodayQueue(contextId: number, doctorId?: number): Promise<QueueItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const docCol = await this.getDoctorColumn();
    
    // Subquery deduplicates rows from the token JOIN (DISTINCT ON requires id first in ORDER BY),
    // then outer query re-orders by clinical priority so CONSULTATION is first, WAITING by token, etc.
    const results = await this.db.execute(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (a.patient_id)
          a.id, a.patient_id, a.booking_time, a.status, 
          p.first_name || ' ' || p.surname as patient_name,
          p.regid, p.gender, 
          extract(year from age(p.dob))::int as age,
          t.token_no,
          d.name as doctor_name,
          v.systolic_bp || '/' || v.diastolic_bp as bp,
          v.pulse_rate as pulse,
          v.weight_kg as weight,
          v.temperature_f as temp
        FROM appointments a
        JOIN case_datas p ON a.patient_id = p.id
        LEFT JOIN tokens t ON t.patient_id = a.patient_id AND t.date::date = a.booking_date::date
        LEFT JOIN doctors d ON d.id = a.${sql.identifier(docCol)}
        LEFT JOIN vitals v ON v.visit_id = a.id
        WHERE a.booking_date::date = ${today}
          AND (a.deleted_at IS NULL OR a.deleted_at::text = '')
          ${doctorId ? sql`AND a.${sql.identifier(docCol)} = ${doctorId}` : sql``}
        ORDER BY a.patient_id, 
          CASE UPPER(a.status)
            WHEN 'CONSULTATION' THEN 1
            WHEN 'WAITLIST'     THEN 2
            WHEN 'PENDING'      THEN 3
            ELSE 4
          END ASC,
          a.id DESC
      ) q
      ORDER BY
        CASE 
          WHEN UPPER(q.status) = 'CONSULTATION' THEN 1
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
      FROM appointments a JOIN case_datas p ON a.patient_id = p.id
      WHERE (a.deleted_at IS NULL OR a.deleted_at::text = '')
      ORDER BY a.id DESC LIMIT ${limit}
    `));

    // Conditionally query revenue table
    if (revInfo) {
      queries.push(this.db.execute(sql`
        SELECT 'payment' as type, 'Invoice paid - ' || p.first_name as title, 'Rs.' || r.${sql.identifier(revInfo.amountCol)} as subtitle, r.created_at
        FROM ${sql.identifier(revInfo.name)} r JOIN case_datas p ON r.regid = p.regid
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
      createdAt: a.created_at
    }));
  }

  async getPendingReminders(contextId: number, limit: number): Promise<SimpleReminder[]> {
    const results = await this.db.execute(sql`
      SELECT cr.id, cr.patient_id, p.first_name || ' ' || p.surname as patient_name,
             cr.heading, cr.comments, cr.start_date, cr.status
      FROM case_reminder cr
      JOIN case_datas p ON cr.patient_id = p.id
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
      FROM case_datas
      WHERE to_char(dob, 'MM-DD') = ${mmdd}
        AND (deleted_at IS NULL OR deleted_at::text = '')
    `);
    
    return results as any as BirthdayPatient[];
  }

  async getRevenueSeries(period: string, contextId: number): Promise<RevenueSeries[]> {
    const revInfo = await this.getRevenueTableInfo();
    if (!revInfo) return [];

    const results = await this.db.execute(sql`
      SELECT to_char(created_at, 'Mon') as month, sum(CAST(NULLIF(${sql.identifier(revInfo.amountCol)}::text, '') AS numeric))::int as revenue
      FROM ${sql.identifier(revInfo.name)}
      WHERE extract(year from created_at) = extract(year from NOW())
        ${sql.raw(revInfo.hasMode ? "AND (mode IS NULL OR mode != 'RB')" : "")}
        AND (deleted_at IS NULL OR deleted_at::text = '')
      GROUP BY to_char(created_at, 'Mon'), extract(month from created_at)
      ORDER BY extract(month from created_at) ASC
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
}
