import { pgTable, serial, integer, varchar, timestamp, text, boolean, real, jsonb } from 'drizzle-orm/pg-core';

export const medicalCases = pgTable('medicalcases', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  clinicId: integer('clinic_id'),
  doctorId: integer('doctor_id'),
  status: varchar('status', { length: 50 }).default('Active'),
  condition: text('condition'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const vitals = pgTable('vitals', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().unique(),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  bmi: real('bmi'),
  temperatureF: real('temperature_f'),
  pulseRate: integer('pulse_rate'),
  systolicBp: integer('systolic_bp'),
  diastolicBp: integer('diastolic_bp'),
  respiratoryRate: integer('respiratory_rate'),
  oxygenSaturation: real('oxygen_saturation'),
  bloodSugar: real('blood_sugar'),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const soapNotes = pgTable('soap_notes', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().unique(),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  advice: text('advice'),
  followUp: text('follow_up'),
  icdCodes: jsonb('icd_codes'),
  aiGenerated: boolean('ai_generated').default(false),
  aiConfidence: real('ai_confidence'),
  doctorApproved: boolean('doctor_approved').default(false),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const homeoDetails = pgTable('homeo_details', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(), // One-to-one with patient
  thermal: varchar('thermal', { length: 50 }),
  constitutional: varchar('constitutional', { length: 100 }),
  miasm: varchar('miasm', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const caseNotes = pgTable('case_notes', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  notes: text('notes'),
  notesType: varchar('notes_type', { length: 50 }).default('General'), // General, Mental, Physical, etc.
  dateval: varchar('dateval', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const caseExamination = pgTable('case_examination', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  examinationDate: varchar('examination_date', { length: 20 }),
  bpSystolic: integer('bp_systolic'),
  bpDiastolic: integer('bp_diastolic'),
  findings: text('findings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const caseImages = pgTable('case_images', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  picture: text('picture'), // Base64 or Path
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const investigations = pgTable('investigations', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  visitId: integer('visit_id'),
  type: varchar('type', { length: 50 }).notNull(), // CBC, Urine, Stool, etc.
  data: jsonb('data').notNull(), // Unified JSON storage for any lab type
  investDate: varchar('invest_date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const prescriptions = pgTable('case_potencies', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  visitId: integer('visit_id'),
  dateval: varchar('dateval', { length: 20 }),
  medicineId: integer('medicine_id'), // Links to stocks.id
  potencyId: integer('potency_id'),
  frequencyId: integer('frequency_id'),
  days: integer('days'),
  instructions: text('instructions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
