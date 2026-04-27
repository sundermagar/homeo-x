// ─── Engines Index ────────────────────────────────────────────────────────────
// Re-exports all AI engine classes for easy import.

export { TranslatorEngine } from './translator.engine';
export { SoapStructuringEngine } from './soap-structuring.engine';
export type { SoapSuggestion, SoapGenerationInput } from './soap-structuring.engine';
export { ClinicalExtractionEngine } from './clinical-extraction.engine';
export type { ClinicalExtractionInput, ClinicalExtractionResult } from './clinical-extraction.engine';
export { RepertorizationEngine } from './repertorization.engine';
export type {
  SuggestedRubric,
  RubricExtractionResult,
  ScoredRemedy,
  RepertorizationResult,
  RepertorizeExtractInput,
  RepertorizeScoreInput,
} from './repertorization.engine';
export { HomeopathyPrescriptionEngine } from './homeopathy-prescription.engine';
export type { HomeopathyPrescriptionDraft, GnmAnalysis } from './homeopathy-prescription.engine';
export { CaseSummaryEngine } from './case-summary.engine';
export type { CaseSummary, CaseSummaryInput } from './case-summary.engine';
