import { pgTable, serial, varchar, text, boolean, timestamp, bigint, integer, index } from 'drizzle-orm/pg-core';
import { investigations, medicalCases } from './medical-cases';

// ─── ICD-10/ICD-11 Master Table ────────────────────────────────────────────────
export const icdCodes = pgTable('icd_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  version: varchar('version', { length: 10 }).notNull().default('ICD-10'),
  description: text('description').notNull(),
  chapter: varchar('chapter', { length: 100 }),
  category: varchar('category', { length: 255 }),
  parentCode: varchar('parent_code', { length: 20 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  codeIdx: index('icd_code_idx').on(table.code),
  descIdx: index('icd_desc_idx').on(table.description),
}));

// ─── SNOMED CT Master Table ────────────────────────────────────────────────────
export const snomedConcepts = pgTable('snomed_concepts', {
  id: serial('id').primaryKey(),
  conceptId: bigint('concept_id', { mode: 'number' }).notNull().unique(),
  fsn: text('fsn').notNull(),
  term: text('term').notNull(),
  conceptType: varchar('concept_type', { length: 50 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  conceptIdIdx: index('snomed_concept_id_idx').on(table.conceptId),
  termIdx: index('snomed_term_idx').on(table.term),
}));

// ─── LOINC Master Table ───────────────────────────────────────────────────────
export const loincCodes = pgTable('loinc_codes', {
  id: serial('id').primaryKey(),
  loincNum: varchar('loinc_num', { length: 20 }).notNull().unique(),
  component: text('component').notNull(),
  property: varchar('property', { length: 50 }),
  system: varchar('system', { length: 100 }),
  scale: varchar('scale', { length: 20 }),
  method: varchar('method', { length: 100 }),
  units: varchar('units', { length: 50 }),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  loincNumIdx: index('loinc_num_idx').on(table.loincNum),
  componentIdx: index('loinc_component_idx').on(table.component),
}));

// ─── Lab Panels (group of LOINC codes) ────────────────────────────────────────
export const labPanels = pgTable('lab_panels', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Lab Panel ↔ LOINC Junction ───────────────────────────────────────────────
export const labPanelLoincLinks = pgTable('lab_panel_loinc_links', {
  id: serial('id').primaryKey(),
  labPanelId: integer('lab_panel_id').notNull().references(() => labPanels.id),
  loincCodeId: integer('loinc_code_id').notNull().references(() => loincCodes.id),
  sortOrder: integer('sort_order').default(0),
});

// ─── ICD ↔ SNOMED Cross-Map ────────────────────────────────────────────────────
export const codeMappings = pgTable('code_mappings', {
  id: serial('id').primaryKey(),
  sourceSystem: varchar('source_system', { length: 20 }).notNull(),
  sourceCode: varchar('source_code', { length: 50 }).notNull(),
  targetSystem: varchar('target_system', { length: 20 }).notNull(),
  targetCode: varchar('target_code', { length: 50 }).notNull(),
  mapType: varchar('map_type', { length: 20 }).default('equivalent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sourceIdx: index('code_map_source_idx').on(table.sourceCode),
}));

// ─── Medical Case Diagnosis (junction) ─────────────────────────────────────────
export const medicalCaseDiagnoses = pgTable('medical_case_diagnoses', {
  id: serial('id').primaryKey(),
  medicalCaseId: integer('medical_case_id').notNull().references(() => medicalCases.id),
  icdCodeId: integer('icd_code_id').references(() => icdCodes.id),
  snomedCodeId: integer('snomed_code_id').references(() => snomedConcepts.id),
  isPrimary: boolean('is_primary').default(false),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow(),
  recordedBy: varchar('recorded_by', { length: 36 }),
});

// ─── Investigation Results ──────────────────────────────────────────────────────
export const investigationResults = pgTable('investigation_results', {
  id: serial('id').primaryKey(),
  investigationId: integer('investigation_id').notNull().references(() => investigations.id),
  loincCodeId: integer('loinc_code_id').references(() => loincCodes.id),
  observationValue: varchar('observation_value', { length: 100 }),
  observationUnit: varchar('observation_unit', { length: 20 }),
  referenceRange: varchar('reference_range', { length: 50 }),
  isAbnormal: boolean('is_abnormal').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});


// ─── Procedure Codes (for billing) ────────────────────────────────────────────
export const procedureCodes = pgTable('procedure_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  standard: varchar('standard', { length: 20 }).default('CPT'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('proc_code_name_idx').on(table.name),
}));