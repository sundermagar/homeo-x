// ─── Enums ─────────────────────────────────────────────────────────────────────
export enum SmsType {
  General       = 'General',
  Promotional   = 'Promotional',
  Transactional = 'Transactional',
  Appointment   = 'Appointment',
  Group         = 'Group',
  OTP           = 'OTP',
  Birthday      = 'Birthday',
  PackageExpiry = 'Package Expiry',
  Reminder      = 'Reminder',
}

export enum SmsStatus {
  Pending   = 'pending',
  Sent      = 'sent',
  Delivered = 'delivered',
  Failed    = 'failed',
}

export enum WhatsAppStatus {
  Sent     = 'sent',
  Failed   = 'failed',
  Clicked  = 'clicked',
}

// ─── SMS Templates ─────────────────────────────────────────────────────────────
export interface SmsTemplate {
  id:        number;
  name:      string;
  message:   string;
  smsType:   SmsType | string;
  isActive:  boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateSmsTemplateDto {
  name:     string;
  message:  string;
  smsType?: SmsType;
  isActive?: boolean;
}

export interface UpdateSmsTemplateDto {
  name?:     string;
  message?:  string;
  smsType?:  SmsType;
  isActive?: boolean;
}

// ─── SMS Reports ───────────────────────────────────────────────────────────────
export interface SmsReport {
  id:         number;
  regid:      number;
  phone:      string | null;
  message:    string;
  smsType:    string;
  sendDate:   string;
  status:     SmsStatus | string;
  gatewayRef: string | null;
  createdAt:  Date;
  updatedAt:  Date;
  deletedAt:  Date | null;
}

export interface SmsReportFilters {
  regid?:      number;
  smsType?:    string;
  status?:     string;
  fromDate?:   string;
  toDate?:     string;
  phone?:      string;
  search?:     string;
  page?:       number;
  limit?:      number;
}

// ─── WhatsApp Logs ─────────────────────────────────────────────────────────────
export interface WhatsAppLog {
  id:        number;
  regid:     number | null;
  phone:     string;
  message:   string;
  deepLink:  string | null;
  status:    WhatsAppStatus | string;
  sendDate:  string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ─── Send SMS ──────────────────────────────────────────────────────────────────
export interface SendSmsDto {
  phone:    string;
  message:  string;
  smsType?: string;
  regid?:   number;
}

export interface BroadcastSmsDto {
  patientIds?: number[];
  doctorId?:   number;
  message:     string;
  smsType?:    string;
  // Placeholders: {#name#}, {#date#}, {#clinic#} — replaced server-side
}

export interface SendSmsResult {
  success:   boolean;
  sent:      number;
  failed:    number;
  gatewayRef?: string;
  details?: Array<{ phone: string; status: string; error?: string }>;
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────────
export interface SendWhatsAppDto {
  phone:   string;
  message: string;
  regid?:  number;
}

export interface BroadcastWhatsAppDto {
  patientIds?: number[];
  phone?:     string[];
  message:    string;
}

export interface SendWhatsAppResult {
  success: boolean;
  sent:    number;
  failed:  number;
  details?: Array<{ phone: string; deepLink: string }>;
}

// ─── OTP ────────────────────────────────────────────────────────────────────────
export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp:   string;
}

export interface OtpResult {
  success:    boolean;
  expiresIn?: number; // seconds
  message?:   string;
}
