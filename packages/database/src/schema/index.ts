// ─── Domain Schemas ───
export * from './patients';
export * from './medical-cases';
export * from './appointments';
export * from './users';
export * from './billing';
export * from './consultation';
export * from './rbac';
export * from './inventory';
export * from './patients';
export * from './patient_preferences';
export * from './audit';
export * from './packages';
export * from './logistics';
export * from './crm';
export * from './knowledge';
export * from './records';
export * from './legacy-public-manifest';
export * from './tenant-demo-legacy-schema';
export * from './legacy/index';

// ─── Public Module Aliases ───
// The public repository imports these by short names, but legacy exports use *Legacy suffix
export { faqsLegacy as faqs } from './legacy/faqs';
export { staticpagesLegacy as staticPages } from './legacy/staticpages';