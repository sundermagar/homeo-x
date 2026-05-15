// ─── Domain Schemas ───
export * from './patients.js';
export { medicalCases, vitals, homeoDetails, caseNotes, caseExamination, caseImages, investigations, growthReferences, vaccineMaster, caseVaccines, caseReminders, soapNotes as legacySoapNotes, prescriptions as legacyPrescriptions } from './medical-cases.js';
export * from './appointments.js';
export * from './users.js';
export { bills, payments, charges, additionalCharges } from './billing.js';
export * from './consultation.js';
export * from './consultation-extended.js';
export * from './rbac.js';
export * from './inventory.js';
export * from './audit.js';
export * from './packages.js';
export * from './communication.js';
export * from './platform.js';
export * from './settings.js';
export * from './crm.js';
export * from './logistics.js';
export * from './clinical-codes.js';
export * from './records.js';
export * from './knowledge.js';
export * from './legacy-public-manifest.js';
export * from './tenant-demo-legacy-schema.js';
export * from './legacy/index.js';
export * from './notifications.js';

// Aliases for legacy tables used in the merged Patient repository
export { 
  caseDatasLegacy as patientsLegacy,
  familygroupsLegacy, 
  doctorsLegacy, 
  religionLegacy, 
  occupationLegacy, 
  refrencetypeLegacy 
} from './legacy/index.js';