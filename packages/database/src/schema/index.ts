// ─── Domain Schemas ───
export * from './patients';
export * from './medical-cases';
export * from './appointments';
export * from './users';
export * from './billing';
export * from './consultation';
export * from './rbac';
export * from './inventory';
export * from './audit';
export * from './packages';
export * from './communication';
export * from './platform';
export * from './settings';
export * from './crm';
export * from './logistics';
export * from './records';
export * from './knowledge';
export * from './legacy-public-manifest';
export * from './tenant-demo-legacy-schema';
export * from './legacy/index';

// Aliases for legacy tables used in the merged Patient repository
export { 
  caseDatasLegacy as patientsLegacy,
  familygroupsLegacy, 
  doctorsLegacy, 
  religionLegacy, 
  occupationLegacy, 
  refrencetypeLegacy 
} from './legacy/index';