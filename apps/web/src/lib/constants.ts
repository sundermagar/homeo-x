// @ts-nocheck
export const API = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    OTP_SEND: '/api/auth/otp/send',
    OTP_VERIFY: '/api/auth/otp/verify',
  },
  PATIENTS: '/api/patients',
  VISITS: '/api/visits',
  CONSULTATIONS: '/api/consultations',
  PRESCRIPTIONS: '/api/prescriptions',
  SPECIALTIES: '/api/specialties',
  APPOINTMENTS: '/api/appointments',
  DOCTOR_SCHEDULES: '/api/doctor-schedules',
  QUEUE: {
    TODAY: '/api/queue/today',
    STATS: '/api/queue/stats',
    POSITION: (visitId: string) => `/api/queue/position/${visitId}`,
    CALL: (id: string) => `/api/queue/${id}/call`,
    START: (id: string) => `/api/queue/${id}/start`,
    COMPLETE: (id: string) => `/api/queue/${id}/complete`,
    SKIP: (id: string) => `/api/queue/${id}/skip`,
  },
  INVOICES: '/api/invoices',
  PAYMENTS: '/api/payments',
  CONSULTATION_RATES: '/api/consultation-rates',
  BILLING_SUMMARY: '/api/billing/summary',
  NOTIFICATIONS: '/api/notifications',
  CONSENT: '/api/consent',
  AUDIT_LOGS: '/api/audit-logs',
  AI: {
    SUGGEST_SOAP: '/api/ai/suggest/soap',
    SUGGEST_DIAGNOSIS: '/api/ai/suggest/diagnosis',
    SUGGEST_PRESCRIPTION: '/api/ai/suggest/prescription',
    FEEDBACK: '/api/ai/feedback',
    REPERTORIZE_EXTRACT: '/api/ai/repertorize/extract',
    REPERTORIZE_SCORE: '/api/ai/repertorize/score',
    CASE_EXTRACT: '/api/ai/case/extract',
    CASE_SUMMARY: '/api/ai/case/summary',
    TRANSLATE: '/api/ai/translate',
    CONSULT_HOMEOPATHY: '/api/ai/consult/homeopathy',
    PARSE_LAB_REPORT: '/api/ai/parse-lab-report',
    KENT_SEARCH: '/api/ai/rubrics/kent-search',
    SUGGEST_QUESTIONS: '/api/ai/suggest/questions',
    EXTRACT_SYMPTOMS: '/api/ai/extract/symptoms',
  },

  ICD10: {
    SEARCH: '/api/icd10/search',
    DETAIL: (code: string) => `/api/icd10/${code}`,
  },
  DRUG_INTERACTIONS: {
    CHECK: '/api/drug-interactions/check',
    SEARCH: '/api/drug-interactions/search',
  },
  SCRIBING: {
    SESSIONS: '/api/scribing/sessions',
    SESSION: (visitId: string) => `/api/scribing/sessions/${visitId}`,
    SEGMENTS: (sessionId: string) => `/api/scribing/sessions/${sessionId}/segments`,
    PAUSE: (sessionId: string) => `/api/scribing/sessions/${sessionId}/pause`,
    RESUME: (sessionId: string) => `/api/scribing/sessions/${sessionId}/resume`,
    END: (sessionId: string) => `/api/scribing/sessions/${sessionId}/end`,
    UPDATE: (sessionId: string) => `/api/scribing/sessions/${sessionId}`,
    GENERATE_SOAP: (sessionId: string) => `/api/scribing/sessions/${sessionId}/generate-soap`,
    BASE: '/api/scribing',
    PUBLIC: (visitId: string) => `/api/scribing/sessions/${visitId}/public`,
  },
  TRIAGE: '/api/triage',
  PREDICTIONS: '/api/predictions',
  WAITLIST: '/api/waitlist',
  ANALYTICS: '/api/analytics',
  USERS: '/api/users',
  EXPENSES: '/api/expenses',
  SERVICE_CHARGES: '/api/service-charges',
  SERVICE_PACKAGES: '/api/service-packages',
  CASH_DEPOSITS: '/api/cash-deposits',
  DISBURSEMENTS: '/api/disbursements',
  ABHA: {
    RECORD: (patientId: string) => `/api/abha/patients/${patientId}`,
    LINK: (patientId: string) => `/api/abha/patients/${patientId}/link`,
    UNLINK: (patientId: string) => `/api/abha/patients/${patientId}/unlink`,
    VERIFY: (patientId: string) => `/api/abha/patients/${patientId}/verify`,
    SEARCH: '/api/abha/search',
  },
  ADMISSIONS: '/api/admissions',
  RUBRICS: '/api/consultations/rubrics',
  REMEDIES: '/api/consultations/remedies',
  VIDEO_CALL: {
    TOKEN: '/api/video-call/token',
    PATIENT_TOKEN: (roomId: string) => `/api/video-call/patient-token/${roomId}`,
  },
} as const;

export const ROUTES = {
  LOGIN: '/login',

  // ─── Admin / Control Center ───
  DASHBOARD: '/admin/dashboard',
  PATIENTS: '/admin/patients',
  PATIENT_NEW: '/admin/patients/new',
  PATIENT_DETAIL: (id: string) => `/admin/patients/${id}`,
  QUEUE: '/admin/queue',
  VISIT_DETAIL: (id: string) => `/admin/visits/${id}`,
  APPOINTMENTS: '/admin/appointments',
  APPOINTMENT_NEW: '/admin/appointments/new',
  BILLING: '/admin/billing',
  INVOICE_DETAIL: (id: string) => `/admin/billing/${id}`,
  BILLING_RATES: '/admin/billing/rates',
  COMPLIANCE: '/admin/settings/compliance',
  WAITLIST: '/admin/waitlist',
  ANALYTICS: '/admin/analytics',
  STAFF: '/admin/staff',
  EXPENSES: '/admin/expenses',
  SERVICE_CHARGES: '/admin/settings/service-charges',
  SERVICE_PACKAGES: '/admin/settings/service-packages',
  CASH_DEPOSITS: '/admin/cash-deposits',
  DISBURSEMENTS: '/admin/disbursements',
  ADMISSIONS: '/admin/admissions',

  // ─── Doctor OS ───
  DOCTOR_QUEUE: '/appointments/queue',
  CONSULTATION: (visitId: string) => `/doctor/consult/${visitId}`,
  PATIENT_MEET: (roomId: string) => `/meet/${roomId}`,
} as const;

export const VISIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const ABHA_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export const ADMISSION_STATUS_LABELS: Record<string, string> = {
  ADMITTED: 'Admitted',
  DISCHARGED: 'Discharged',
  TRANSFERRED: 'Transferred',
};

export const ROOM_TYPE_LABELS: Record<string, string> = {
  GENERAL_WARD: 'General Ward',
  SEMI_PRIVATE: 'Semi-Private',
  PRIVATE: 'Private',
  DELUXE: 'Deluxe',
  ICU: 'ICU',
  NICU: 'NICU',
  ISOLATION: 'Isolation',
};

export const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};
