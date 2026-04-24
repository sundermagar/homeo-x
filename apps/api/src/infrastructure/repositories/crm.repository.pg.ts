import { sql, eq, and, like, desc, isNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { ILeadRepository } from '../../domains/crm/ports/lead.repository';

export class CrmRepositoryPg implements ILeadRepository {
  constructor(private readonly db: DbClient) { }

  // ── Leads ──────────────────────────────────────────────────────────────────

  async findManyLeads(filters: { search?: string; status?: string; page: number; limit: number }): Promise<{ data: any[]; total: number }> {
    const { search, status, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [isNull(schema.leads.deletedAt)];
    if (status) conditions.push(eq(schema.leads.status, status));
    if (search) {
      const s = `%${search}%`;
      conditions.push(sql`(${schema.leads.name} LIKE ${s} OR ${schema.leads.mobile} LIKE ${s} OR ${schema.leads.email} LIKE ${s})`);
    }

    const [rows, countRows] = await Promise.all([
      this.db.select().from(schema.leads).where(and(...conditions)).orderBy(desc(schema.leads.id)).limit(limit).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.leads).where(and(...conditions))
    ]);

    return { data: rows, total: countRows[0]?.count ?? 0 };
  }

  async findLeadById(id: number): Promise<any | null> {
    const [row] = await this.db.select().from(schema.leads).where(and(eq(schema.leads.id, id), isNull(schema.leads.deletedAt))).limit(1);
    return row || null;
  }

  async createLead(dto: any): Promise<number> {
    const res = await this.db.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS "maxId" FROM leads`);
    const nextId = (res[0] as any)?.maxId ?? 1;

    const [row] = await this.db.insert(schema.leads).values({
      id: nextId,
      name: dto.name,
      mobile: dto.mobile || dto.phone || '',
      phone: dto.phone || '',
      email: dto.email || '',
      address: dto.address || '',
      source: dto.source || '',
      status: dto.status || 'new',
      notes: dto.notes || '',
      assignedTo: dto.assigned_to || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).returning({ id: schema.leads.id });
    return row!.id;
  }

  async updateLead(id: number, dto: any): Promise<void> {
    await this.db.update(schema.leads).set({
      ...dto,
      mobile: dto.mobile || dto.phone,
      updatedAt: new Date(),
    }).where(eq(schema.leads.id, id));
  }

  async deleteLead(id: number): Promise<void> {
    await this.db.update(schema.leads).set({ deletedAt: new Date() }).where(eq(schema.leads.id, id));
  }

  // ── Followups ──────────────────────────────────────────────────────────────

  async findFollowupsByLeadId(leadId: number): Promise<any[]> {
    return this.db.select().from(schema.leadFollowups)
      .where(and(eq(schema.leadFollowups.leadId, leadId), isNull(schema.leadFollowups.deletedAt)))
      .orderBy(desc(schema.leadFollowups.createdAt));
  }

  async createFollowup(leadId: number, dto: any): Promise<number> {
    const res = await this.db.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS "maxId" FROM lead_followups`);
    const nextId = (res[0] as any)?.maxId ?? 1;

    const [row] = await this.db.insert(schema.leadFollowups).values({
      id: nextId,
      leadId,
      name: dto.notes || dto.name || '',
      task: dto.task || dto.followup_type || '',
      taskstatus: dto.taskstatus || dto.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).returning({ id: schema.leadFollowups.id });
    return row!.id;
  }

  async updateFollowup(id: number, dto: any): Promise<void> {
    await this.db.update(schema.leadFollowups).set({
      name: dto.notes || dto.name,
      task: dto.task || dto.followup_type,
      taskstatus: dto.taskstatus || dto.status,
      updatedAt: new Date(),
    }).where(eq(schema.leadFollowups.id, id));
  }

  async deleteFollowup(id: number): Promise<void> {
    await this.db.update(schema.leadFollowups).set({ deletedAt: new Date() }).where(eq(schema.leadFollowups.id, id));
  }

  // ── Referrals ──────────────────────────────────────────────────────────────

  async findReferralSummary(): Promise<any[]> {
    const res = await this.db.execute(sql`
      SELECT 
        SUM(CAST(NULLIF(r.total_amount, '') AS DECIMAL(10,2))) as total_amount, 
        SUM(CAST(NULLIF(r.used_amount, '') AS DECIMAL(10,2))) as used_amount, 
        r.referral_id, 
        c.first_name, 
        c.surname
      FROM referral r
      LEFT JOIN case_datas c ON c.regid::text = r.referral_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.referral_id, c.first_name, c.surname
    `);
    return res as any[];
  }

  async findReferralDetails(referralId: number): Promise<any[]> {
    return this.db.select().from(schema.referrals)
      .where(and(eq(schema.referrals.referralId, referralId), isNull(schema.referrals.deletedAt)))
      .orderBy(desc(schema.referrals.createdAt));
  }

  async createReferral(dto: any): Promise<number> {
    const res = await this.db.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS "maxId" FROM referral`);
    const nextId = (res[0] as any)?.maxId ?? 1;

    const [row] = await this.db.insert(schema.referrals).values({
      id: nextId,
      regid: dto.regid,
      referralId: dto.referral_id,
      totalAmount: String(dto.total_amount || 0) as any,
      usedAmount: String(dto.used_amount || 0) as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).returning({ id: schema.referrals.id });
    return row!.id;
  }

  async deleteReferral(id: number): Promise<void> {
    await this.db.update(schema.referrals).set({ deletedAt: new Date() }).where(eq(schema.referrals.id, id));
  }

  // ── Reminders ──────────────────────────────────────────────────────────────

  async findReminders(filters: { status?: string; page: number; limit: number; date?: string }): Promise<{ data: any[]; total: number }> {
    const { status, page, limit, date } = filters;
    const offset = (page - 1) * limit;

    const conditions = [isNull(schema.caseReminders.deletedAt)];
    if (status) conditions.push(eq(schema.caseReminders.status, status));
    if (date) conditions.push(eq(schema.caseReminders.startDate, date));

    const [rows, countRows] = await Promise.all([
      this.db.execute(sql`
        SELECT cr.*, CONCAT(cd.first_name, ' ', cd.surname) AS patient_name, cd.mobile1 AS patient_mobile
        FROM case_reminder cr
        LEFT JOIN case_datas cd ON cr.patient_id = cd.id
        WHERE cr.deleted_at IS NULL ${status ? sql`AND cr.status = ${status}` : sql``}
        ORDER BY cr.id DESC LIMIT ${limit} OFFSET ${offset}
      `),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.caseReminders).where(and(...conditions))
    ]);

    return { data: rows as any[], total: countRows[0]?.count ?? 0 };
  }

  async findReminderById(id: number): Promise<any | null> {
    const res = await this.db.execute(sql`
      SELECT cr.*, CONCAT(cd.first_name, ' ', cd.surname) AS patient_name, cd.mobile1 AS patient_mobile
      FROM case_reminder cr LEFT JOIN case_datas cd ON cr.patient_id = cd.id
      WHERE cr.id = ${id} AND cr.deleted_at IS NULL LIMIT 1
    `);
    const rows = res as any[];
    return rows[0] || null;
  }

  async createReminder(dto: any): Promise<number> {
    const res = await this.db.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS "maxId" FROM case_reminder`);
    const nextId = (res[0] as any)?.maxId ?? 1;

    const patientRes = await this.db.execute(sql`SELECT first_name, surname FROM case_datas WHERE regid = ${dto.regid || 0}`);
    const p = patientRes[0] as any;
    const pName = p ? `${p.first_name} ${p.surname || ''}`.trim() : `Patient ${dto.regid}`;

    const startDate = dto.start_date || dto.followup_date || new Date().toISOString().split('T')[0];
    const remindTime = dto.remind_time || '09:00';
    const heading = dto.heading || dto.reminder_type || '';
    const comments = dto.comments || dto.notes || '';
    const status = dto.status || 'pending';
    const patientId = dto.patient_id || parseInt(dto.regid || '0', 10);

    await this.db.execute(sql`
      INSERT INTO case_reminder (
        id, patient_id, patient_name, start_date, end_date, 
        remind_time, remind_after, heading, comments, status, 
        created_at, updated_at
      ) VALUES (
        ${nextId}, ${patientId},${pName}, ${startDate}, ${startDate}, 
        ${remindTime}, '1 day', ${heading}, ${comments}, ${status}, 
        NOW(), NOW()
      )
    `);

    return nextId;
  }

  async updateReminder(id: number, dto: any): Promise<void> {
    await this.db.update(schema.caseReminders).set({
      ...dto,
      updatedAt: new Date(),
    }).where(eq(schema.caseReminders.id, id));
  }

  async markReminderDone(id: number): Promise<void> {
    await this.db.update(schema.caseReminders).set({ status: 'done', updatedAt: new Date() }).where(eq(schema.caseReminders.id, id));
  }

  async deleteReminder(id: number): Promise<void> {
    await this.db.update(schema.caseReminders).set({ deletedAt: new Date().toISOString() as any }).where(eq(schema.caseReminders.id, id));
  }
}
