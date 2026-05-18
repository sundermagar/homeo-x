import { pgTable, serial, integer, varchar, timestamp, text, boolean, real, jsonb, decimal } from 'drizzle-orm/pg-core';

export const growthReferences = pgTable('growth_references', {
  id: serial('id').primaryKey(),
  months: integer('months').notNull(),
  gender: varchar('gender', { length: 1 }).notNull(), // 'M' or 'F.js'
  idealHeightCm: decimal('ideal_height_cm', { precision: 5, scale: 2 }),
  idealWeightKg: decimal('ideal_weight_kg', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});


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
  regid: integer('regid'),
  visitId: integer('visit_id'),
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
  regid: integer('regid'),
  visitId: integer('visit_id'),
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
  specialtyData: jsonb('specialty_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const homeoDetails = pgTable('homeo_details', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull().unique(),
  thermal: varchar('thermal', { length: 50 }),
  constitutional: varchar('constitutional', { length: 100 }),
  // miasm: varchar('miasm', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const caseNotes = pgTable('case_notes', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  notes: text('notes'),
  notesType: varchar('notes_type', { length: 50 }).default('General'),
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
  picture: text('picture'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const investigations = pgTable('investigations', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  visitId: integer('visit_id'),
  type: varchar('type', { length: 50 }).notNull(),
  data: jsonb('data'), // Made nullable for legacy parity
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
  medicineId: integer('medicine_id'),
  potencyId: integer('potency_id'),
  frequencyId: integer('frequency_id'),
  days: integer('days'),
  instructions: text('instructions'),
  rxremedy: varchar('rxremedy', { length: 255 }),
  rxpotency: varchar('rxpotency', { length: 100 }),
  rxfrequency: varchar('rxfrequency', { length: 100 }),
  rxdays: varchar('rxdays', { length: 50 }),
  rxprescription: text('rxprescription'),
  additionalName: varchar('additional_name', { length: 255 }),
  additionalPrice: real('additional_price').default(0),
  receivedPrice: real('received_price').default(0),
  receivedDate: varchar('received_date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ─── AI Remedy Chart Session ─────────────────────────────────────────────────
// Migrated from legacy: medicine_others → remedy_alternatives
export const remedyAlternatives = pgTable('remedy_alternatives', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull(),       // FK → remedy_tree_nodes.id
  remedy: varchar('remedy', { length: 255 }),
  potency: varchar('potency', { length: 100 }),
  notes: text('notes'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Vaccines & Reminders ────────────────────────────────────────────────────

export const vaccineMaster = pgTable('vaccinedatas', {
  id: serial('id').primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  months: integer('months'), // Recommended age in months
  parentId: integer('parent_id').default(0),
});

export const caseVaccines = pgTable('case_vaccins', {
  id: serial('id').primaryKey(),
  regid: integer('reg_id').notNull(),
  vaccineId: integer('vaccinee_id').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const caseReminders = pgTable('case_reminders', {
  id: serial('id').primaryKey(),
  regid: integer('regid').notNull(),
  reminderDate: timestamp('reminder_date'),
  message: text('message'),
  status: varchar('status', { length: 20 }).default('Pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
