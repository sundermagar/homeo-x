import type {
  SmsTemplate, CreateSmsTemplateDto, UpdateSmsTemplateDto,
  SmsReport, SmsReportFilters,
  WhatsAppLog,
  OtpResult
} from '@mmc/types';

export interface ICommunicationRepository {
  // ─── SMS Templates ───────────────────────────────────────────────────────────
  listTemplates(): Promise<SmsTemplate[]>;
  getTemplateById(id: number): Promise<SmsTemplate | null>;
  createTemplate(dto: CreateSmsTemplateDto): Promise<SmsTemplate>;
  updateTemplate(id: number, dto: UpdateSmsTemplateDto): Promise<SmsTemplate>;
  deleteTemplate(id: number): Promise<void>;

  // ─── SMS Reports ──────────────────────────────────────────────────────────────
  listReports(filters: SmsReportFilters): Promise<{ data: SmsReport[]; total: number }>;
  logSms(params: {
    regid: number;
    phone: string;
    message: string;
    smsType: string;
    status?: string;
    gatewayRef?: string;
  }): Promise<SmsReport>;

  // ─── WhatsApp Logs ────────────────────────────────────────────────────────────
  logWhatsApp(params: {
    regid?: number;
    phone: string;
    message: string;
    deepLink: string;
    status?: string;
  }): Promise<WhatsAppLog>;
  listWhatsAppLogs(limit?: number): Promise<WhatsAppLog[]>;

  // ─── OTP ──────────────────────────────────────────────────────────────────────
  createOtp(phone: string): Promise<{ otp: string; expiresAt: Date }>;
  verifyOtp(phone: string, otp: string): Promise<OtpResult>;
}
