import { createLogger } from '../logger';

const logger = createLogger('audit');

export enum AuditAction {
  // Auth
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  PASSWORD_CHANGE = 'auth.password_change',

  // Patient
  PATIENT_CREATE = 'patient.create',
  PATIENT_UPDATE = 'patient.update',
  PATIENT_DELETE = 'patient.delete',

  // Medical Case
  CASE_CREATE = 'case.create',
  CASE_UPDATE = 'case.update',
  CASE_COMPLETE = 'case.complete',
  CASE_FINALIZE = 'case.finalize',

  // Consultation
  CONSULTATION_START = 'consultation.start',
  CONSULTATION_COMPLETE = 'consultation.complete',
  AI_PIPELINE_RUN = 'consultation.ai_pipeline',

  // Prescription
  PRESCRIPTION_CREATE = 'prescription.create',
  PRESCRIPTION_UPDATE = 'prescription.update',

  // Billing
  BILL_CREATE = 'billing.create',
  PAYMENT_RECORD = 'billing.payment',

  // Appointment
  APPOINTMENT_CREATE = 'appointment.create',
  APPOINTMENT_UPDATE = 'appointment.update',
  APPOINTMENT_CANCEL = 'appointment.cancel',

  // Settings
  SETTINGS_CREATE = 'settings.create',
  SETTINGS_UPDATE = 'settings.update',
  SETTINGS_DELETE = 'settings.delete',
  ROLE_UPDATE = 'settings.role_update',
}

export interface AuditEntry {
  action: AuditAction;
  tenantId: string;
  userId: number | null;
  correlationId: string;
  resourceType: string;
  resourceId: string | number;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Port interface for audit persistence.
 * Adapters can write to PostgreSQL, Elasticsearch, or external services.
 */
export interface AuditRepository {
  log(entry: AuditEntry): Promise<void>;
  query(filters: {
    tenantId: string;
    resourceType?: string;
    resourceId?: string | number;
    userId?: number;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditEntry[]; total: number }>;
}

/**
 * Audit logging service — logs to structured logger immediately,
 * and persists to database asynchronously (fire-and-forget to not block requests).
 */
export class AuditLogger {
  constructor(private readonly repo?: AuditRepository) {}

  async log(entry: AuditEntry): Promise<void> {
    // Always log to structured logger (stdout → log aggregation)
    logger.info(
      {
        audit: true,
        action: entry.action,
        tenant: entry.tenantId,
        user: entry.userId,
        resource: `${entry.resourceType}:${entry.resourceId}`,
        correlationId: entry.correlationId,
      },
      `AUDIT: ${entry.action} on ${entry.resourceType}:${entry.resourceId} by user:${entry.userId}`,
    );

    // Persist to database (fire-and-forget — never block the request)
    if (this.repo) {
      this.repo.log(entry).catch((err) => {
        logger.error({ err, auditAction: entry.action }, 'Failed to persist audit entry');
      });
    }
  }
}
