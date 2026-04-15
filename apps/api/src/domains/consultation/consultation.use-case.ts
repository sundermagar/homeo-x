// ─── Consultation Use Case ────────────────────────────────────────────────────
// Orchestrates the complete AI consultation pipeline.
// Hexagonal Architecture: Domain use case that depends on ports, not adapters.

import { createLogger } from '../../shared/logger';
import { AiProviderChain, getAiProviderChain } from '../../infrastructure/ai/ai-provider-chain';
import { TranslatorEngine } from './engines/translator.engine';
import { SoapStructuringEngine } from './engines/soap-structuring.engine';
import { ClinicalExtractionEngine } from './engines/clinical-extraction.engine';
import { RepertorizationEngine } from './engines/repertorization.engine';
import { HomeopathyPrescriptionEngine } from './engines/homeopathy-prescription.engine';
import { CaseSummaryEngine } from './engines/case-summary.engine';
import type { SoapSuggestion } from './engines/soap-structuring.engine';
import type { ClinicalExtractionResult } from './engines/clinical-extraction.engine';
import type { RubricExtractionResult, RepertorizationResult } from './engines/repertorization.engine';
import type { HomeopathyPrescriptionDraft } from './engines/homeopathy-prescription.engine';
import type { CaseSummary } from './engines/case-summary.engine';

const logger = createLogger('consultation-use-case');

export interface HomeopathyConsultInput {
  transcript: string;
  labReports?: Record<string, string>;
  patientAge?: number;
  patientGender?: string;
  chiefComplaint?: string;
  specialty?: string;
}

export interface HomeopathyConsultResult {
  soap: SoapSuggestion;
  clinicalData: ClinicalExtractionResult;
  diagnosisData: any;
  rubricsResult: RubricExtractionResult;
  remedyScores: RepertorizationResult;
  prescriptionDraft: HomeopathyPrescriptionDraft;
  gnmAnalysis?: any;
  caseSummary: string;
  pipeline: {
    phasesCompleted: number;
    totalPhases: number;
    totalLatencyMs: number;
  };
}

export class ConsultationUseCase {
  private translator: TranslatorEngine;
  private soapEngine: SoapStructuringEngine;
  private extractionEngine: ClinicalExtractionEngine;
  private repertorizationEngine: RepertorizationEngine;
  private prescriptionEngine: HomeopathyPrescriptionEngine;
  private summaryEngine: CaseSummaryEngine;

  constructor(private providerChain?: AiProviderChain) {
    const chain = providerChain || getAiProviderChain();
    this.translator = new TranslatorEngine(chain);
    this.soapEngine = new SoapStructuringEngine(chain);
    this.extractionEngine = new ClinicalExtractionEngine(chain);
    this.repertorizationEngine = new RepertorizationEngine(chain);
    this.prescriptionEngine = new HomeopathyPrescriptionEngine(chain);
    this.summaryEngine = new CaseSummaryEngine(chain);
  }

  /**
   * Full 7-phase AI consultation pipeline:
   * 1. Translation (Hindi→English)
   * 2. Clinical Extraction
   * 3. SOAP Structuring
   * 4. Rubric Extraction
   * 5. Repertorization Scoring
   * 6. Prescription Generation
   * 7. Case Summary
   */
  async consultHomeopathy(
    tenantId: string,
    userId: string,
    input: HomeopathyConsultInput,
  ): Promise<HomeopathyConsultResult> {
    const start = Date.now();
    let phasesCompleted = 0;

    // Phase 1: Translate transcript
    logger.info({ tenantId }, 'Phase 1: Translation');
    const englishTranscript = await this.translator.translateToEnglish(tenantId, userId, input.transcript);
    phasesCompleted++;

    // Phase 2: Clinical extraction
    logger.info({ tenantId }, 'Phase 2: Clinical extraction');
    const extraction = await this.extractionEngine.extract(tenantId, userId, {
      transcript: englishTranscript,
      labReports: input.labReports,
      chiefComplaint: input.chiefComplaint,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      specialty: input.specialty || 'HOMEOPATHY',
    });
    phasesCompleted++;

    // Phase 3: SOAP generation
    logger.info({ tenantId }, 'Phase 3: SOAP structuring');
    const soap = await this.soapEngine.generateSoap(tenantId, userId, {
      transcript: englishTranscript,
      chiefComplaint: input.chiefComplaint,
      specialty: input.specialty || 'HOMEOPATHY',
      patientAge: input.patientAge,
      patientGender: input.patientGender,
    });
    phasesCompleted++;

    // Phase 4: Rubric extraction
    logger.info({ tenantId }, 'Phase 4: Rubric extraction');
    const rubrics = await this.repertorizationEngine.extractRubrics(tenantId, userId, {
      chiefComplaint: input.chiefComplaint,
      subjective: soap.subjective,
      assessment: soap.assessment,
      observations: extraction.observations,
      clinicalFindings: extraction.clinicalFindings,
      mentalSymptoms: extraction.mentalState,
      generalSymptoms: extraction.generalSymptoms,
      particularSymptoms: extraction.physicalSymptoms,
      modalities: extraction.modalities,
      thermalReaction: extraction.thermalReaction,
    });
    phasesCompleted++;

    // Phase 5: Remedy scoring
    logger.info({ tenantId }, 'Phase 5: Repertorization scoring');
    const repertorization = await this.repertorizationEngine.scoreRemedies(tenantId, userId, {
      selectedRubrics: rubrics.suggestedRubrics.map(r => ({
        rubricId: r.rubricId,
        description: r.description,
        category: r.category,
        importance: r.importance,
      })),
      thermalReaction: extraction.thermalReaction,
      miasm: extraction.miasm,
    });
    phasesCompleted++;

    // Phase 6: Prescription
    logger.info({ tenantId }, 'Phase 6: Prescription generation');
    const prescription = await this.prescriptionEngine.generatePrescription(
      tenantId,
      userId,
      {
        transcript: englishTranscript,
        clinicalData: extraction,
        diagnosisData: {
          primaryDiagnosis: rubrics.provisionalDiagnosis,
          differentials: rubrics.differentials,
          redFlags: rubrics.redFlags || [],
          suggestedInvestigations: rubrics.suggestedInvestigations || [],
        },
        selectedRubrics: rubrics.suggestedRubrics,
        remedyScores: repertorization,
      }
    );
    phasesCompleted++;

    // Phase 7: Summary
    logger.info({ tenantId }, 'Phase 7: Case summary');
    const summary = await this.summaryEngine.generateSummary(tenantId, userId, {
      observations: extraction.observations,
      clinicalFindings: extraction.clinicalFindings,
      selectedRemedies: repertorization.scoredRemedies.slice(0, 3).map(r => ({
        name: r.remedyName,
        score: r.normalizedScore,
      })),
      soapData: { subjective: soap.subjective, objective: soap.objective, assessment: soap.assessment, plan: soap.plan },
    });
    phasesCompleted++;

    const totalLatencyMs = Date.now() - start;
    logger.info({ tenantId, totalLatencyMs, phasesCompleted }, 'Consultation pipeline complete');

    return {
      soap,
      clinicalData: extraction,
      diagnosisData: {
        primaryDiagnosis: rubrics.provisionalDiagnosis,
        differentials: rubrics.differentials,
        redFlags: rubrics.redFlags || [],
        suggestedInvestigations: rubrics.suggestedInvestigations || [],
        confidence: rubrics.overallConfidence || 0.8,
        auditLogId: 'merged-from-extraction',
      },
      rubricsResult: rubrics,
      remedyScores: repertorization,
      prescriptionDraft: prescription,
      gnmAnalysis: prescription.gnmAnalysis || null,
      caseSummary: summary.summary,
      pipeline: {
        phasesCompleted,
        totalPhases: 7,
        totalLatencyMs,
      },
    };
  }

  // ─── Individual endpoint methods ───

  async suggestSoap(tenantId: string, userId: string, input: { transcript: string; specialty?: string; patientAge?: number; patientGender?: string; allergies?: string[]; vitals?: Record<string, unknown> }) {
    return this.soapEngine.generateSoap(tenantId, userId, input);
  }

  async extractRubrics(tenantId: string, userId: string, input: any) {
    return this.repertorizationEngine.extractRubrics(tenantId, userId, input);
  }

  async scoreRemedies(tenantId: string, userId: string, input: any) {
    return this.repertorizationEngine.scoreRemedies(tenantId, userId, input);
  }

  async extractCase(tenantId: string, userId: string, input: any) {
    return this.extractionEngine.extract(tenantId, userId, input);
  }

  async generateSummary(tenantId: string, userId: string, input: any) {
    return this.summaryEngine.generateSummary(tenantId, userId, input);
  }

  async translateText(tenantId: string, userId: string, input: { text: string }) {
    return { translatedText: await this.translator.translateToEnglish(tenantId, userId, input.text) };
  }

  async searchKentRubrics(query: string) {
    return this.repertorizationEngine.searchKentRubrics(query);
  }

  async generateQuestions(tenantId: string, userId: string, input: { transcript: string }) {
    if (!input.transcript) return { questions: [] };
    const chain = this.providerChain || getAiProviderChain();
    
    try {
      const response = await chain.complete({
        systemPrompt: `You are an expert homeopathic doctor assisting a clinician. Based on the conversation transcript, suggest 3-4 short follow-up questions the doctor should ask the patient.
Focus on:
- Uncovered symptoms or modalities
- Mental/emotional state
- Duration/onset
- Physical generals

Respond ONLY with a JSON array of objects with keys "q" (the question text) and "c" (category: one of symptom, modality, mental, general, history). Do not output any other text.`,
        userPrompt: input.transcript.slice(-2000), // only last part of transcript
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: 'json' as any,
      });
      
      try {
        const parsed = JSON.parse(response.content);
        return { questions: Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []) };
      } catch (parseErr) {
        const match = response.content.match(/\[[\s\S]*\]/);
        if (match) {
          try { return { questions: JSON.parse(match[0]) }; } catch {}
        }
        return { questions: [] };
      }
    } catch (error) {
      return { questions: [] };
    }
  }

  async parseLabReport(tenantId: string, userId: string, input: { filename: string; mimeType: string; base64: string }) {
    if (!input.base64) throw new Error('No document data provided');
    
    const chain = this.providerChain || getAiProviderChain();
    
    const response = await chain.complete({
      systemPrompt: 'You are an advanced medical OCR system. Extract all text, tabular data, and lab findings from the provided document. Format it as rigorous markdown, preserving all numerical values, reference ranges, and units precisely. Do not add conversational filler.',
      userPrompt: 'Extract this lab report:',
      documents: [{ base64: input.base64, mimeType: input.mimeType || 'application/pdf' }],
      maxTokens: 4000,
      temperature: 0.1,
    });
    
    return { parsedText: response.content };
  }
}

// Singleton
let _instance: ConsultationUseCase | null = null;
export function getConsultationUseCase(): ConsultationUseCase {
  if (!_instance) _instance = new ConsultationUseCase();
  return _instance;
}
