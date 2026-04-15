// ─── Shared Utilities ───
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; code?: string };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = string>(error: E, code?: string): Result<never, E> {
  return { success: false, error, code };
}

// ─── Domain Entities ───
export * from './domains/patient.js';
export * from './domains/medical-case.js';
export * from './domains/appointment.js';
export * from './domains/consultation.js';
export * from './domains/prescription.js';
export * from './domains/billing.js';
export * from './domains/user.js';
export * from './domains/package.js';
export * from './domains/communication.js';
export * from './domains/analytics.js';
export * from './domains/platform.js';
export * from './domains/staff.js';
export * from './domains/crm.js';
export * from './domains/logistics.js';
export * from './domains/knowledge.js';

// ─── API Contracts ───
export * from './api/requests.js';
export * from './api/responses.js';

// ─── Real-time Events ───
export * from './events/consultation-events.js';
export * from './events/transcription-events.js';

// ─── Shared Enums ───
export * from './enums.js';
