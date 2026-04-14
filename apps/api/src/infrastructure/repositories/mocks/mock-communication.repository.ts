import type { ICommunicationRepository } from '../../../domains/communication/ports/communication.repository.js';
import type {
  SmsTemplate, CreateSmsTemplateDto, UpdateSmsTemplateDto,
  SmsReport, SmsReportFilters,
  WhatsAppLog,
  OtpResult
} from '@mmc/types';

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_TEMPLATES: SmsTemplate[] = [
  { id: 1, name: 'Appointment Reminder', message: 'Dear {#name#}, your appointment at HomeoX is scheduled for {#date#}.', smsType: 'Appointment', isActive: true,  createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 2, name: 'Package Expiry',       message: 'Dear {#name#}, your HomeoX package expires on {#date#}. Renew now.',      smsType: 'Package Expiry', isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 3, name: 'Medicine Reminder',    message: 'Dear {#name#}, please remember to take your medicine today.',              smsType: 'Reminder', isActive: true,  createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 4, name: 'Birthday Greeting',    message: 'Happy Birthday {#name#}! Wishing you good health from HomeoX.',            smsType: 'Birthday', isActive: true,  createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 5, name: 'New Case Welcome',     message: 'Welcome to HomeoX, {#name#}! Your health journey begins today.',         smsType: 'General', isActive: true,  createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 6, name: 'General Promotional',  message: 'Dear {#name#}, special health checkup offer at HomeoX this month!',       smsType: 'Promotional', isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
];

const SEED_REPORTS: SmsReport[] = [
  { id: 1,  regid: 101, phone: '9876543210', message: 'Your appointment is confirmed for 10 Apr 2026.', smsType: 'Appointment', sendDate: '2026-04-09T10:00:00Z', status: 'delivered', gatewayRef: 'GW001', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 2,  regid: 102, phone: '9876543211', message: 'Your package expires in 7 days.',                     smsType: 'Package Expiry', sendDate: '2026-04-08T09:00:00Z', status: 'sent', gatewayRef: 'GW002', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 3,  regid: 103, phone: '9876543212', message: 'Happy Birthday! Wishing you good health.',             smsType: 'Birthday', sendDate: '2026-04-05T08:00:00Z', status: 'delivered', gatewayRef: 'GW003', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 4,  regid: 101, phone: '9876543210', message: 'Please remember your medicine today.',                 smsType: 'Reminder', sendDate: '2026-04-10T07:30:00Z', status: 'sent', gatewayRef: 'GW004', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: 5,  regid: 104, phone: '9876543213', message: 'Welcome to HomeoX!',                                   smsType: 'General', sendDate: '2026-04-01T11:00:00Z', status: 'delivered', gatewayRef: 'GW005', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
];

let nextTemplateId = 7;
let nextReportId   = 6;

export class MockCommunicationRepository implements ICommunicationRepository {
  private templates: SmsTemplate[] = [...SEED_TEMPLATES];
  private reports: SmsReport[]      = [...SEED_REPORTS];
  private whatsappLogs: WhatsAppLog[] = [];

  // ─── Templates ─────────────────────────────────────────────────────────────

  async listTemplates(): Promise<SmsTemplate[]> {
    return this.templates.filter(t => !t.deletedAt);
  }

  async getTemplateById(id: number): Promise<SmsTemplate | null> {
    return this.templates.find(t => t.id === id && !t.deletedAt) ?? null;
  }

  async createTemplate(dto: CreateSmsTemplateDto): Promise<SmsTemplate> {
    const t: SmsTemplate = {
      id:        nextTemplateId++,
      name:      dto.name,
      message:   dto.message,
      smsType:   dto.smsType ?? 'General',
      isActive:  dto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.templates.unshift(t);
    return t;
  }

  async updateTemplate(id: number, dto: UpdateSmsTemplateDto): Promise<SmsTemplate> {
    const idx = this.templates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Template not found');
    const existing = this.templates[idx]!;
    const updated: SmsTemplate = {
      ...existing,
      name:     dto.name     ?? existing.name,
      message:  dto.message  ?? existing.message,
      smsType:  dto.smsType  ?? existing.smsType,
      isActive: dto.isActive ?? existing.isActive,
      updatedAt: new Date(),
    };
    this.templates[idx] = updated;
    return updated;
  }

  async deleteTemplate(id: number): Promise<void> {
    const idx = this.templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      const existing = this.templates[idx]!;
      this.templates[idx] = { ...existing, deletedAt: new Date(), isActive: false };
    }
  }

  // ─── Reports ────────────────────────────────────────────────────────────────

  async listReports(filters: SmsReportFilters): Promise<{ data: SmsReport[]; total: number }> {
    let data = [...this.reports];
    if (filters.regid)    data = data.filter(r => r.regid === filters.regid);
    if (filters.smsType) data = data.filter(r => r.smsType === filters.smsType);
    if (filters.status)   data = data.filter(r => r.status === filters.status);
    if (filters.phone)    data = data.filter(r => r.phone?.includes(filters.phone!));
    if (filters.fromDate) data = data.filter(r => r.sendDate >= filters.fromDate!);
    if (filters.toDate)   data = data.filter(r => r.sendDate <= filters.toDate!);

    const total = data.length;
    const page  = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  }

  async logSms(params: { regid: number; phone: string; message: string; smsType: string; status?: string; gatewayRef?: string }): Promise<SmsReport> {
    const r: SmsReport = {
      id:         nextReportId++,
      regid:      params.regid,
      phone:      params.phone,
      message:    params.message,
      smsType:    params.smsType,
      sendDate:   new Date().toISOString(),
      status:     params.status ?? 'sent',
      gatewayRef: params.gatewayRef ?? null,
      createdAt:  new Date(),
      updatedAt:  new Date(),
      deletedAt:  null,
    };
    this.reports.unshift(r);
    return r;
  }

  // ─── WhatsApp ───────────────────────────────────────────────────────────────

  async logWhatsApp(params: { regid?: number; phone: string; message: string; deepLink: string; status?: string }): Promise<WhatsAppLog> {
    const w: WhatsAppLog = {
      id:        this.whatsappLogs.length + 1,
      regid:     params.regid ?? null,
      phone:     params.phone,
      message:   params.message,
      deepLink:  params.deepLink,
      status:    params.status ?? 'sent',
      sendDate:  new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.whatsappLogs.unshift(w);
    return w;
  }

  async listWhatsAppLogs(limit = 100): Promise<WhatsAppLog[]> {
    return this.whatsappLogs.slice(0, limit);
  }

  // ─── OTP ───────────────────────────────────────────────────────────────────

  async createOtp(_phone: string): Promise<{ otp: string; expiresAt: Date }> {
    return { otp: '1234', expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  }

  async verifyOtp(_phone: string, otp: string): Promise<OtpResult> {
    return otp === '1234'
      ? { success: true, message: 'OTP verified successfully' }
      : { success: false, message: 'Invalid or expired OTP' };
  }
}
