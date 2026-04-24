import { pgTable, serial, integer, varchar, timestamp, text, boolean, real, jsonb, decimal } from 'drizzle-orm/pg-core';

export const growthReferences = pgTable('growth_references', {
  id: serial('id').primaryKey(),
  months: integer('months').notNull(),
  gender: varchar('gender', { length: 1 }).notNull(), // 'M' or 'F'
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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ─── AI Remedy Chart Session ─────────────────────────────────────────────────
// Migrated from legacy: managetreedatas → remedy_tree_nodes

export const remedyTreeNodes = pgTable('remedy_tree_nodes', {
  id:          serial('id').primaryKey(),
  parentId:    integer('parent_id').default(0),
  label:       varchar('label',       { length: 255 }).notNull(),
  description: text('description'),
  nodeType:    varchar('node_type',   { length: 50 }).default('RUBRIC'), // RUBRIC | REMEDY | CATEGORY
  sortOrder:   integer('sort_order').default(0),
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

// Migrated from legacy: medicine_others → remedy_alternatives
export const remedyAlternatives = pgTable('remedy_alternatives', {
  id:        serial('id').primaryKey(),
  treeId:    integer('tree_id').notNull(),       // FK → remedy_tree_nodes.id
  remedy:    varchar('remedy',  { length: 255 }),
  potency:   varchar('potency', { length: 100 }),
  notes:     text('notes'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
