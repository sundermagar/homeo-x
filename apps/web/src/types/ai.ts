export interface SoapSuggestion {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes: Array<{ code: string; description: string }>;
  confidence: number;
  auditLogId: string;
}

export interface DiagnosisSuggestion {
  primaryDiagnosis: {
    name: string;
    icdCode: string;
    icdDescription: string;
    reasoning: string;
  };
  differentials: Array<{
    name: string;
    icdCode: string;
    icdDescription: string;
    likelihood: string;
  }>;
  redFlags: string[];
  suggestedInvestigations: string[];
  confidence: number;
  auditLogId: string;
}

export interface MedicationSuggestion {
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

export interface PrescriptionSuggestion {
  medications: MedicationSuggestion[];
  interactions: DrugInteractionWarning[];
  allergyWarnings: string[];
  confidence: number;
  auditLogId: string;
}

export interface DrugInteractionWarning {
  drugA: string;
  drugB: string;
  severity: 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'UNKNOWN';
  description: string;
  mechanism?: string | null;
  management?: string | null;
}

export interface AiFeedbackInput {
  auditLogId: string;
  action: 'accepted' | 'modified' | 'rejected';
  feedback?: string;
}

export interface SuggestSoapInput {
  visitId: string;
  chiefComplaint?: string;

  specialty?: string;
  vitals?: Record<string, unknown>;
  patientAge?: number;
  patientGender?: string;
  allergies?: string[];
  previousNotes?: string;
  transcript?: string;
}

export interface SuggestDiagnosisInput {
  symptoms: string[];
  vitals?: Record<string, unknown>;
  patientAge?: number;
  patientGender?: string;
  specialty?: string;
  medicalHistory?: string;
  transcript?: string;
}

export interface SuggestPrescriptionInput {
  diagnoses: string[];
  patientAge?: number;
  patientGender?: string;
  patientWeight?: number;
  allergies?: string[];
  currentMedications?: string[];
  specialty?: string;
  transcript?: string;
}

export interface Icd10Code {
  id: string;
  code: string;
  shortDesc: string;
  longDesc?: string;
  category?: string;
  isLeaf: boolean;
}

// ─── Consultation Mode ───

export type ConsultationMode = 'acute' | 'chronic' | 'followup';

export interface SuggestedConsultQuestion {
  question: string;
  category: 'symptom' | 'modality' | 'mental' | 'general' | 'history' | 'followup';
  alternates: string[];
  options?: string[];
}

export interface QuestionSuggestionResult {
  questions: SuggestedConsultQuestion[];
  consultationMode: string;
}

export interface CategorizedSymptoms {
  mental: string[];
  physical: string[];
  particular: string[];
}

export interface SuggestQuestionsInput {
  consultationMode: ConsultationMode;
  transcript?: string;
  answeredQuestions?: string[];
  chiefComplaint?: string;
  patientAge?: number;
  patientGender?: string;
}

export interface ExtractSymptomsInput {
  consultationMode: ConsultationMode;
  question: string;
  answer: string;
  existingSymptoms?: CategorizedSymptoms;
  labContext?: string;
}

// ─── Repertorization Types ───

export interface RubricExtractionInput {
  chiefComplaint?: string;

  subjective?: string;
  objective?: string;
  assessment?: string;
  mentalSymptoms?: string[];
  generalSymptoms?: string[];
  particularSymptoms?: string[];
  modalities?: { aggravation?: string[]; amelioration?: string[] };
  thermalReaction?: string;
  patientAge?: number;
  patientGender?: string;
  visitId?: string;
  consultationMode?: ConsultationMode;
}

export interface SuggestedRubric {
  rubricId: string;
  description: string;
  category: 'MIND' | 'GENERAL' | 'PARTICULAR';
  chapter: string | null;
  importance: number;
  source: 'db' | 'ai' | 'both';
  confidence: number;
  remedyCount: number;
}

export interface RubricExtractionResult {
  suggestedRubrics: SuggestedRubric[];
  overallConfidence: number;
  auditLogId: string;
  observations: string[];
  clinicalFindings: string[];
  provisionalDiagnosis?: {
    name: string;
    icdCode: string;
    reasoning: string;
  };
  differentials?: Array<{
    name: string;
    likelihood: 'probable' | 'possible' | 'unlikely';
  }>;
}


export interface RepertorizeScoreInput {
  selectedRubrics: Array<{ rubricId: string; importance: number }>;
  thermalReaction?: string;
  miasm?: string;
}

export interface RemedyCoverage {
  rubricId: string;
  rubricDescription: string;
  rubricCategory: string;
  grade: number;
  importance: number;
  contribution: number;
}

export interface ScoredRemedy {
  remedyId: string;
  remedyName: string;
  commonName: string | null;
  totalScore: number;
  normalizedScore: number;
  coverage: RemedyCoverage[];
  coveredRubricCount: number;
  totalRubricCount: number;
  thermalType: string | null;
  constitutionType: string | null;
  miasm: string | null;
  commonPotencies: string[];
  keynotes: string[];
  thermalBonus: boolean;
  miasmBonus: boolean;
  matchExplanation: string[];
}

export interface AnalyzeCaseInput {
  conversation?: string;
  labReports?: string;
  doctorNotes?: string;
  patientAge?: number;
  patientGender?: string;
  visitId?: string;
}

export interface ClinicalExtractionResult {
  observations: string[];
  clinicalFindings: string[];
  suggestedRubrics: SuggestedRubric[];
  mentalState: string[];
  physicalGenerals?: string[];
  particularSymptoms?: string[];
  provisionalDiagnosis?: {
    name: string;
    icdCode: string;
    reasoning: string;
  };
  differentials?: Array<{
    name: string;
    likelihood: 'probable' | 'possible' | 'unlikely';
  }>;
  auditLogId: string;
}


export interface SummaryOutput {
  summary: string;
  confidence: number;
}

export interface RepertorizationResult {
  scoredRemedies: ScoredRemedy[];
  maxPossibleScore: number;
  totalRubricsUsed: number;
  confidence: number;
  auditLogId: string;
}

export interface TranslateTextInput {
  text: string;
}

export interface TranslationResponse {
  translated: string;
}

// ─── GNM Analysis Types ───

export interface GnmAnalysis {
  coreConflict: {
    conflictType: string;
    affectedTissue: string;
    biologicalMeaning: string;
    triggerEvents: string[];
  };
  phases: {
    conflictActive: string;
    healingPhase: string;
    isRecurrentTrack: boolean;
    trackTriggers: string[];
  };
  homeopathicTotality: {
    mentalEmotional: string[];
    physicalGenerals: string[];
  };
  emotionalIntensities?: Array<{
    emotion: string;
    intensity: number;
  }>;
  rankedRemedies: Array<{
    rank: number;
    name: string;
    matchStrength: 'strongest' | 'strong' | 'moderate';
    keynotes: string[];
    suggestedPotency: string;
    whenToUse: string;
  }>;
  resolutionStrategy: {
    directions: string[];
    prognosis: string;
  };
  confidence: number;
}

export interface HomeopathyConsultResult {
  clinicalData: ClinicalExtractionResult;
  diagnosisData: DiagnosisSuggestion;
  rubricsResult: RubricExtractionResult;
  remedyScores: RepertorizationResult;
  prescriptionDraft: {
    consultationSummary: string;
    diagnosis: string;
    materiaMedicaValidation: string;
    suggestedRemedy: string;
    suggestedRemedies?: Array<{
      remedyName: string;
      potency: string;
      dosage: string;
    }>;
    potency: string;
    dosage: string;
    safetyWarnings: string[];
    missingInformation: string[];
    advice: string[];
    followUp: string;
    confidence: number;
  };
  caseSummary?: string;
  gnmAnalysis?: GnmAnalysis | null;
}
