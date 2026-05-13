import { pgTable, serial, integer, text, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { patients } from './patients.js';

/**
 * Consent records track explicit permissions given by Data Principals (Patients)
 * as required by the DPDP Act 2023.
 */
export const consentRecords = pgTable('consent_records', {
  id: serial('id').primaryKey(),
  
  // Link to patient
  patientRegid: integer('patient_regid').notNull().references(() => patients.regid),
  
  // Type of consent (e.g., 'data_processing', 'ai_analysis', 'sms_marketing')
  consentType: varchar('consent_type', { length: 50 }).notNull(),
  
  // Specific purpose of collection
  purpose: text('purpose').notNull(),
  
  // Status
  granted: boolean('granted').notNull().default(false),
  
  // Audit trail
  grantedAt: timestamp('granted_at'),
  revokedAt: timestamp('revoked_at'),
  
  // Context for legal proof
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Version of the privacy policy/notice at time of consent
  consentVersion: integer('consent_version').default(1),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
