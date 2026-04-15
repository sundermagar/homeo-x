// ─── Domain Schemas ───
export * from './patients';
export { medicalCases, vitals, homeoDetails, caseNotes, caseExamination, caseImages, investigations, soapNotes as legacySoapNotes, prescriptions as legacyPrescriptions } from './medical-cases';
export * from './appointments';
export * from './users';
export * from './billing';
export * from './consultation';
export * from './consultation-extended';
export * from './rbac';
export * from './inventory';
export * from './audit';
export * from './packages';
export * from './logistics';
export * from './crm';
export * from './knowledge';
export * from './records';
export * from './legacy-public-manifest';
export * from './tenant-demo-legacy-schema';
export * from './legacy/index';