import {
  pgTable, serial, integer, varchar, text, boolean, real,
  timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Rubrics (Kent Repertory) ─────────────────────────────────────────────────
export const rubrics = pgTable('rubrics', {
  id: serial('id').primaryKey(),
  chapter: varchar('chapter', { length: 100 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(), // MIND, GENERAL, PARTICULAR
  description: varchar('description', { length: 500 }).notNull(),
  importance: integer('importance').default(2), // 1-4 scale
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  chapterIdx: index('idx_rubrics_chapter').on(table.chapter),
  categoryIdx: index('idx_rubrics_category').on(table.category),
  descriptionIdx: index('idx_rubrics_description').on(table.description),
}));

// ─── Remedies ─────────────────────────────────────────────────────────────────
export const remedies = pgTable('remedies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  commonName: varchar('common_name', { length: 200 }),
  abbreviation: varchar('abbreviation', { length: 20 }),
  kingdom: varchar('kingdom', { length: 30 }), // PLANT, MINERAL, ANIMAL, NOSODE
  mentalKeywords: jsonb('mental_keywords').$type<string[]>().default([]),
  modalities: jsonb('modalities').$type<string[]>().default([]),
  generals: jsonb('generals').$type<string[]>().default([]),
  keynotes: jsonb('keynotes').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('idx_remedies_name').on(table.name),
  abbrIdx: index('idx_remedies_abbr').on(table.abbreviation),
}));

// ─── Remedy Profiles (thermal, constitutional, miasm) ─────────────────────────
export const remedyProfiles = pgTable('remedy_profiles', {
  id: serial('id').primaryKey(),
  remedyId: integer('remedy_id').notNull(),
  thermalType: varchar('thermal_type', { length: 30 }), // HOT, CHILLY, AMBITHERMAL
  constitutionType: varchar('constitution_type', { length: 100 }),
  miasm: varchar('miasm', { length: 50 }), // PSORA, SYCOSIS, SYPHILIS, TUBERCULAR
  commonPotencies: jsonb('common_potencies').$type<string[]>().default(['30C', '200C', '1M']),
  mentalEssence: text('mental_essence'),
  physicalEssence: text('physical_essence'),
}, (table) => ({
  remedyIdx: uniqueIndex('idx_profile_remedy').on(table.remedyId),
}));

// ─── Rubric ↔ Remedy Mapping (Kent Grade 1/2/3) ──────────────────────────────
export const rubricRemedyMap = pgTable('rubric_remedy_map', {
  id: serial('id').primaryKey(),
  rubricId: integer('rubric_id').notNull(),
  remedyId: integer('remedy_id').notNull(),
  grade: integer('grade').notNull().default(1), // 1=plain, 2=italic, 3=bold
}, (table) => ({
  rubricIdx: index('idx_rrm_rubric').on(table.rubricId),
  remedyIdx: index('idx_rrm_remedy').on(table.remedyId),
  uniqueMapping: uniqueIndex('idx_rrm_unique').on(table.rubricId, table.remedyId),
}));

// ─── SOAP Notes ───────────────────────────────────────────────────────────────
export const soapNotes = pgTable('soap_notes', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }),
  visitId: varchar('visit_id', { length: 50 }).notNull(),
  subjective: text('subjective'),
  objective: text('objective'),
  assessment: text('assessment'),
  plan: text('plan'),
  advice: text('advice'),
  followUp: varchar('follow_up', { length: 200 }),
  icdCodes: jsonb('icd_codes').$type<Array<{ code: string; description: string }>>().default([]),
  specialtyData: jsonb('specialty_data'),
  doctorApproved: boolean('doctor_approved').default(false),
  approvedAt: timestamp('approved_at'),
  aiGenerated: boolean('ai_generated').default(false),
  confidence: real('confidence'),
  auditLogId: varchar('audit_log_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  visitIdx: uniqueIndex('idx_soap_visit').on(table.visitId),
  tenantIdx: index('idx_soap_tenant').on(table.tenantId),
}));

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const prescriptions = pgTable('prescriptions', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }),
  visitId: varchar('visit_id', { length: 50 }).notNull(),
  specialty: varchar('specialty', { length: 50 }),
  notes: text('notes'),
  status: varchar('status', { length: 30 }).default('DRAFT'), // DRAFT, APPROVED, DISPENSED
  doctorApproved: boolean('doctor_approved').default(false),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  visitIdx: index('idx_rx_visit').on(table.visitId),
  tenantIdx: index('idx_rx_tenant').on(table.tenantId),
}));

// ─── Prescription Items ──────────────────────────────────────────────────────
export const prescriptionItems = pgTable('prescription_items', {
  id: serial('id').primaryKey(),
  prescriptionId: integer('prescription_id').notNull(),
  medicationName: varchar('medication_name', { length: 200 }).notNull(),
  genericName: varchar('generic_name', { length: 200 }),
  dosage: varchar('dosage', { length: 100 }),
  frequency: varchar('frequency', { length: 100 }),
  duration: varchar('duration', { length: 100 }),
  route: varchar('route', { length: 50 }).default('Oral'),
  instructions: text('instructions'),
  quantity: integer('quantity'),
  specialtyData: jsonb('specialty_data'), // potency, scale, etc. for homeopathy
  aiSuggested: boolean('ai_suggested').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  rxIdx: index('idx_rxi_prescription').on(table.prescriptionId),
}));
