import type { Request, Response, NextFunction } from 'express';
import { AuditLogger, AuditAction } from '../../../shared/audit/audit-logger';

const auditLogger = new AuditLogger();

// Map HTTP method + path patterns to audit actions
const AUDIT_ROUTES: Array<{ method: string; pattern: RegExp; action: AuditAction; resourceType: string }> = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/, action: AuditAction.LOGIN, resourceType: 'auth' },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, action: AuditAction.LOGOUT, resourceType: 'auth' },
  { method: 'POST', pattern: /^\/api\/patients$/, action: AuditAction.PATIENT_CREATE, resourceType: 'patient' },
  { method: 'PUT', pattern: /^\/api\/patients\//, action: AuditAction.PATIENT_UPDATE, resourceType: 'patient' },
  { method: 'DELETE', pattern: /^\/api\/patients\//, action: AuditAction.PATIENT_DELETE, resourceType: 'patient' },
  { method: 'POST', pattern: /^\/api\/consultations\/start$/, action: AuditAction.CONSULTATION_START, resourceType: 'consultation' },
  { method: 'POST', pattern: /^\/api\/consultations\/complete$/, action: AuditAction.CONSULTATION_COMPLETE, resourceType: 'consultation' },
  { method: 'POST', pattern: /^\/api\/ai\/consult-homeopathy$/, action: AuditAction.AI_PIPELINE_RUN, resourceType: 'ai' },
  { method: 'POST', pattern: /^\/api\/medicalcases$/, action: AuditAction.CASE_CREATE, resourceType: 'case' },
  { method: 'POST', pattern: /^\/api\/medicalcases\/.*\/finalize$/, action: AuditAction.CASE_FINALIZE, resourceType: 'case' },
  { method: 'POST', pattern: /^\/api\/billing$/, action: AuditAction.BILL_CREATE, resourceType: 'billing' },
  { method: 'POST', pattern: /^\/api\/appointments$/, action: AuditAction.APPOINTMENT_CREATE, resourceType: 'appointment' },
];

/**
 * Automatically logs state-changing API requests to the audit trail.
 * Runs AFTER the response is sent (non-blocking).
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    // Only audit successful state-changing operations
    if (res.statusCode >= 400) return;

    const match = AUDIT_ROUTES.find(
      (r) => r.method === req.method && r.pattern.test(req.path),
    );

    if (match) {
      const resourceId = req.params?.regid || req.params?.id || req.body?.visitId || req.body?.regid || 'unknown';
      auditLogger.log({
        action: match.action,
        tenantId: req.tenantSlug || 'unknown',
        userId: req.user?.id || null,
        correlationId: req.correlationId || 'unknown',
        resourceType: match.resourceType,
        resourceId,
        newData: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 200),
      });
    }
  });

  next();
}
