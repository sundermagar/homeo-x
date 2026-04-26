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
  /** Doctor's case-type pick from PATIENT_INFO — drives Pass 1 prompt directives. */
  consultationMode?: 'acute' | 'chronic' | 'followup';
  thermalReaction?: string;
  miasm?: string;
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

    // Phase 1.5: Medical-intent gate — short-circuit if the transcript is clearly
    // non-medical (greetings only, mic test, silence). Saves ~5 expensive AI calls
    // and prevents nonsense remedies from being suggested for non-medical input.
    const isMedical = this.checkMedicalIntent(englishTranscript, input.chiefComplaint);
    if (!isMedical) {
      logger.info({ tenantId, transcriptLength: englishTranscript.length }, 'Pipeline short-circuited: no medical content detected');
      return this.buildEmptyConsultResult(start, phasesCompleted);
    }

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
    logger.info({ tenantId, consultationMode: input.consultationMode }, 'Phase 4: Rubric extraction');
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
      thermalReaction: input.thermalReaction || extraction.thermalReaction,
      consultationMode: input.consultationMode,
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
      // Doctor input takes precedence over AI-detected values from extraction.
      thermalReaction: input.thermalReaction || extraction.thermalReaction,
      miasm: input.miasm || extraction.miasm,
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

    // Step 1 — extract real text from the PDF on the server.
    // Claude Haiku 4.5 doesn't reliably read base64 PDFs; sending it the file
    // attachment was making it hallucinate generic lab findings (hypertension,
    // hyperlipidemia, diabetes — the textbook "metabolic syndrome" trio).
    // Use pdf-parse to pull the actual text first.
    const isPdf = (input.mimeType || '').toLowerCase().includes('pdf')
      || input.filename?.toLowerCase().endsWith('.pdf');

    let extractedText = '';
    if (isPdf) {
      try {
        const buffer = Buffer.from(input.base64, 'base64');
        // pdf-parse v1's package index.js eagerly tries to read a test PDF
        // (a known bug). Importing the inner module path bypasses that.
        // @ts-ignore — no types for the inner module path
        const pdfParseModule: any = await import('pdf-parse/lib/pdf-parse.js');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const result = await pdfParse(buffer);
        extractedText = (result?.text || '').trim();
      } catch (err: any) {
        logger.error({ err: err?.message, filename: input.filename }, 'PDF text extraction failed');
        extractedText = '';
      }
    }

    if (!extractedText) {
      logger.warn({ filename: input.filename }, 'No text extractable from PDF — returning empty');
      return { parsedText: '' };
    }

    // Step 2 — normalize the raw PDF text into clean markdown so the
    // downstream symptom-extraction prompt sees structured, easy-to-read
    // values + reference ranges. We give the AI the REAL text (not the PDF)
    // so it can't hallucinate.
    const chain = this.providerChain || getAiProviderChain();

    const response = await chain.complete({
      systemPrompt: `You are a lab-report normalizer. You will be given the RAW TEXT extracted from a lab PDF (possibly with broken layout, OCR artifacts, repeated headers).

Your job: produce a clean markdown summary that preserves EVERY numerical value, unit, and reference range exactly as written. Group values by panel (CBC, LFT, RFT, Lipid, Thyroid, etc.) when possible.

For EACH abnormal value, append a clear flag in parentheses: (HIGH), (LOW), or (CRITICAL). Determine abnormality ONLY by:
1. An explicit flag in the source text (H, L, *, ↑, ↓, "High", "Low", asterisks).
2. The value being clearly outside the reference range printed alongside it.

If a value has no reference range AND no explicit flag, leave it without a flag — do not guess.

Output format example:
### Complete Blood Count
- Hemoglobin: 8.2 g/dL (Ref: 12-16) (LOW)
- WBC: 7800 /uL (Ref: 4000-11000)
- Platelets: 1.5 lakh /uL (Ref: 1.5-4.5 lakh)

### Lipid Profile
- Total Cholesterol: 245 mg/dL (Ref: <200) (HIGH)

DO NOT invent values. DO NOT add interpretive prose. DO NOT skip values.`,
      userPrompt: `Raw PDF text from "${input.filename || 'lab.pdf'}":
"""
${extractedText.slice(0, 20000)}
"""

Output the cleaned markdown summary now. If the text contains no actual lab data (e.g. only headers or random PDF artifacts), return the literal string "NO_LAB_DATA".`,
      maxTokens: 2000,
      temperature: 0.1,
    });

    const cleaned = (response.content || '').trim();
    if (!cleaned || cleaned === 'NO_LAB_DATA') {
      return { parsedText: '' };
    }

    return { parsedText: cleaned };
  }

  // ─── Medical-intent gate ─────────────────────────────────────────────────
  // Heuristic check: does the transcript contain enough medical signal to be
  // worth running the full repertorization pipeline? Returns true unless the
  // transcript is clearly empty, too short, or pure non-medical chitchat.
  private checkMedicalIntent(transcript: string, chiefComplaint?: string): boolean {
    const cleaned = (transcript || '').trim();
    // Always proceed if the doctor recorded a chief complaint at intake.
    if (chiefComplaint && chiefComplaint.trim().length >= 3) return true;
    // Too short to act on.
    if (cleaned.length < 30) return false;

    const medicalRegex = /\b(pain|ache|fever|cough|headache|migraine|nausea|vomit|diarrhea|constipat|cold|flu|symptom|complaint|rash|allergy|allergic|itch|swell|injury|wound|burn|bp|blood\s*pressure|sleep|insomnia|appetite|chest|stomach|abdomen|head|throat|skin|eye|ear|nose|fatigue|weak|dizz|anxious|depress|sad|angry|stress|menstrual|period|pregnan|sick|ill|disease|medicat|treatment|dose|tablet|drug|hospital|clinic|doctor|patient|chronic|acute|symptom|since|started|onset|hurts|hurting|sore|burning|tingling|numb|pressure|tight|cramp|spasm|pulse|breath|shortness|cough|sneeze|wheez)\b/i;
    if (medicalRegex.test(cleaned)) return true;

    // Hindi/Hinglish medical keywords (transcripts come translated, but be safe)
    const hindiMedRegex = /\b(dard|bukhar|dawai|dawaai|ilaaj|illness|takleef|tabiyat|sar|pet|bimari|saans|nazla|khansi|jukam)\b/i;
    if (hindiMedRegex.test(cleaned)) return true;

    return false;
  }

  // Build a zero-state result so the frontend's handleHomeopathyConsultGenerated
  // doesn't crash when the gate short-circuits.
  private buildEmptyConsultResult(start: number, phasesCompleted: number): HomeopathyConsultResult {
    const message = 'No medical content was detected in the conversation. Continue speaking with the patient and try again.';
    return {
      soap: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        advice: message,
      } as any,
      clinicalData: {
        observations: [],
        clinicalFindings: [],
        mentalState: [],
        emotionProfile: [],
        physicalSymptoms: [],
        generalSymptoms: [],
        modalities: { aggravation: [], amelioration: [] },
        confidence: 0,
      } as any,
      diagnosisData: {
        primaryDiagnosis: null,
        differentials: [],
        redFlags: [],
        suggestedInvestigations: [],
        confidence: 0,
        auditLogId: 'short-circuited-no-medical-content',
      },
      rubricsResult: {
        suggestedRubrics: [],
        provisionalDiagnosis: null,
        differentials: [],
        overallConfidence: 0,
      } as any,
      remedyScores: { scoredRemedies: [] } as any,
      prescriptionDraft: {
        consultationSummary: message,
        suggestedRemedies: [],
        advice: [message],
        followUp: '',
      } as any,
      gnmAnalysis: null,
      caseSummary: message,
      pipeline: {
        phasesCompleted,
        totalPhases: 7,
        totalLatencyMs: Date.now() - start,
      },
    };
  }
}

// Singleton
let _instance: ConsultationUseCase | null = null;
export function getConsultationUseCase(): ConsultationUseCase {
  if (!_instance) _instance = new ConsultationUseCase();
  return _instance;
}
