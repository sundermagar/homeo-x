import { pgTable, serial, integer, varchar, text, boolean, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const scribingSessions = pgTable('scribing_sessions', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }),
  visitId: varchar('visit_id', { length: 50 }).notNull(),
  userId: integer('user_id'),
  status: varchar('status', { length: 20 }).default('ACTIVE'),
  language: varchar('language', { length: 10 }).default('en-US'),
  totalDurationMs: integer('total_duration_ms').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transcriptSegments = pgTable('transcript_segments', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  text: text('text').notNull(),
  speaker: varchar('speaker', { length: 20 }).default('DOCTOR'),
  confidence: real('confidence').default(1.0),
  startTimeMs: integer('start_time_ms'),
  endTimeMs: integer('end_time_ms'),
  isFinal: boolean('is_final').default(true),
  source: varchar('source', { length: 30 }).default('WEB_SPEECH_API'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const labOrders = pgTable('lab_orders', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }),
  visitId: integer('visit_id').notNull(),
  patientId: integer('patient_id'),
  orderedBy: integer('ordered_by'),
  status: varchar('status', { length: 30 }).default('ORDERED'),
  notes: text('notes'),
  orderedAt: timestamp('ordered_at').defaultNow(),
});

export const labOrderItems = pgTable('lab_order_items', {
  id: serial('id').primaryKey(),
  labOrderId: integer('lab_order_id').notNull(),
  testName: varchar('test_name', { length: 200 }).notNull(),
  testCode: varchar('test_code', { length: 50 }),
  category: varchar('category', { length: 100 }),
  priority: varchar('priority', { length: 20 }).default('ROUTINE'),
  status: varchar('status', { length: 30 }),
  resultValue: varchar('result_value', { length: 100 }),
  referenceRange: varchar('reference_range', { length: 100 }),
  unit: varchar('unit', { length: 50 }),
  flag: varchar('flag', { length: 20 }),
  aiSuggested: boolean('ai_suggested').default(false),
  resultAt: timestamp('result_at'),
});

// Legacy alias — consultations maps to soap_notes table
export const consultations = pgTable('soap_notes_view', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull(),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  advice: text('advice'),
  followUp: text('follow_up'),
  icdCodes: jsonb('icd_codes'),
  aiGenerated: boolean('ai_generated'),
  aiConfidence: real('ai_confidence'),
  doctorApproved: boolean('doctor_approved'),
  approvedAt: timestamp('approved_at'),
  specialtyData: jsonb('specialty_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
