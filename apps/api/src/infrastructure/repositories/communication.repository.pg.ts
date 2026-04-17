import { eq, ilike, and, gte, lte, sql, desc, isNull } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import * as schema from '@mmc/database';
import type { ICommunicationRepository } from '../../domains/communication/ports/communication.repository.js';
import type {
  SmsTemplate, CreateSmsTemplateDto, UpdateSmsTemplateDto,
  SmsReport, SmsReportFilters,
  WhatsAppLog,
  OtpResult
} from '@mmc/types';

export class CommunicationRepositoryPG implements ICommunicationRepository {
  constructor(private readonly db: DbClient) { }

  // ─── SMS Templates ─────────────────────────────────────────────────────────

  async listTemplates(): Promise<SmsTemplate[]> {
    const rows = await this.db
      .select()
      .from(schema.smsTemplates)
      .where(isNull(schema.smsTemplates.deletedAt))
      .orderBy(desc(schema.smsTemplates.createdAt));
    return rows as SmsTemplate[];
  }

  async getTemplateById(id: number): Promise<SmsTemplate | null> {
    const [row] = await this.db
      .select()
      .from(schema.smsTemplates)
      .where(and(eq(schema.smsTemplates.id, id), isNull(schema.smsTemplates.deletedAt)))
      .limit(1);
    return (row as SmsTemplate) ?? null;
  }

  async createTemplate(dto: CreateSmsTemplateDto): Promise<SmsTemplate> {
    const [row] = await this.db
      .insert(schema.smsTemplates)
      .values({
        name: dto.name,
        message: dto.message,
        smsType: dto.smsType ?? 'General',
        isActive: dto.isActive ?? true,
      })
      .returning();
    return row as SmsTemplate;
  }

  async updateTemplate(id: number, dto: UpdateSmsTemplateDto): Promise<SmsTemplate> {
    const fields: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) fields.name = dto.name;
    if (dto.message !== undefined) fields.message = dto.message;
    if (dto.smsType !== undefined) fields.smsType = dto.smsType;
    if (dto.isActive !== undefined) fields.isActive = dto.isActive;

    const [row] = await this.db
      .update(schema.smsTemplates)
      .set(fields)
      .where(eq(schema.smsTemplates.id, id))
      .returning();
    return row as SmsTemplate;
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.db
      .update(schema.smsTemplates)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(schema.smsTemplates.id, id));
  }

  // ─── SMS Reports ─────────────────────────────────────────────────────────────

  async listReports(filters: SmsReportFilters): Promise<{ data: SmsReport[]; total: number }> {
    const conditions: any[] = [];

    if (filters.regid) conditions.push(eq(schema.smsReports.regid, filters.regid));
    if (filters.smsType) conditions.push(eq(schema.smsReports.smsType, filters.smsType));
    if (filters.status) conditions.push(eq(schema.smsReports.status, filters.status));
    if (filters.phone) conditions.push(ilike(schema.smsReports.phone, `%${filters.phone}%`));
    if (filters.fromDate) conditions.push(gte(schema.smsReports.sendDate, filters.fromDate));
    if (filters.toDate) conditions.push(lte(schema.smsReports.sendDate, filters.toDate));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const baseWhere = where
      ? and(where, isNull(schema.smsReports.deletedAt))
      : isNull(schema.smsReports.deletedAt);

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.smsReports)
      .where(baseWhere);

    const rows = await this.db
      .select()
      .from(schema.smsReports)
      .where(baseWhere)
      .orderBy(desc(schema.smsReports.createdAt))
      .limit(limit)
      .offset(offset);

    return { data: rows as SmsReport[], total: Number(totalRow?.count ?? 0) };
  }

  async logSms(params: {
    regid: number; phone: string; message: string; smsType: string;
    status?: string; gatewayRef?: string;
  }): Promise<SmsReport> {
    const [row] = await this.db
      .insert(schema.smsReports)
      .values({
        regid: params.regid,
        phone: params.phone,
        message: params.message,
        smsType: params.smsType,
        sendDate: new Date().toISOString(),
        status: params.status ?? 'sent',
        gatewayRef: params.gatewayRef ?? null,
      })
      .returning();
    return row as SmsReport;
  }

  // ─── WhatsApp Logs ───────────────────────────────────────────────────────────

  async logWhatsApp(params: {
    regid?: number; phone: string; message: string; deepLink: string; status?: string;
  }): Promise<WhatsAppLog> {
    const [row] = await this.db
      .insert(schema.whatsappLogs)
      .values({
        regid: params.regid ?? null,
        phone: params.phone,
        message: params.message,
        deepLink: params.deepLink,
        status: params.status ?? 'sent',
        sendDate: new Date().toISOString(),
      })
      .returning();
    return row as WhatsAppLog;
  }

  async listWhatsAppLogs(limit = 100): Promise<WhatsAppLog[]> {
    const rows = await this.db
      .select()
      .from(schema.whatsappLogs)
      .where(isNull(schema.whatsappLogs.deletedAt))
      .orderBy(desc(schema.whatsappLogs.createdAt))
      .limit(limit);
    return rows as WhatsAppLog[];
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────────

  async createOtp(phone: string): Promise<{ otp: string; expiresAt: Date }> {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db
      .update(schema.otps)
      .set({ deletedAt: new Date() })
      .where(eq(schema.otps.phone, phone));

    await this.db.insert(schema.otps).values({ phone, otp: code, expiresAt });

    return { otp: code, expiresAt };
  }

  async verifyOtp(phone: string, otp: string): Promise<OtpResult> {
    const [record] = await this.db
      .select()
      .from(schema.otps)
      .where(and(
        eq(schema.otps.phone, phone),
        eq(schema.otps.otp, otp),
        eq(schema.otps.verified, false),
        isNull(schema.otps.deletedAt)
      ))
      .limit(1);

    if (!record) return { success: false, message: 'Invalid or expired OTP' };
    if (new Date() > record.expiresAt) return { success: false, message: 'OTP has expired' };

    await this.db
      .update(schema.otps)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(schema.otps.id, record.id));

    return { success: true, message: 'OTP verified successfully' };
  }
}
