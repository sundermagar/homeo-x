// ─── Clinical Extraction Engine ───────────────────────────────────────────────
// Module 2: Unified clinical extraction from conversation, labs, and notes.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/clinical-extraction.engine.ts

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('clinical-extraction-engine');

export interface ClinicalExtractionInput {
  transcript?: string;
  labReports?: Record<string, string>;
  chiefComplaint?: string;
  patientAge?: number;
  patientGender?: string;
  specialty?: string;
}

export interface ClinicalExtractionResult {
  observations: string[];
  clinicalFindings: string[];
  mentalState: string[];
  emotionProfile: Array<{ emotion: string; intensity: number; context: string }>;
  physicalSymptoms: string[];
  generalSymptoms: string[];
  modalities: { aggravation: string[]; amelioration: string[] };
  thermalReaction?: string;
  constitution?: string;
  miasm?: string;
  confidence: number;
}

export class ClinicalExtractionEngine {
  constructor(private providerChain: AiProviderChain) {}

  async extract(tenantId: string, userId: string, input: ClinicalExtractionInput): Promise<ClinicalExtractionResult> {
    const systemPrompt = `You are an expert homeopathic clinical data extractor.
Analyze the provided transcript and clinical data to extract structured findings.

Extract these categories:
1. observations: Doctor-observed clinical findings
2. clinicalFindings: Physical examination results
3. mentalState: Mental/emotional symptoms (key for homeopathy)
4. emotionProfile: Emotions detected with intensity (0-10) and context
5. physicalSymptoms: Specific physical complaints
6. generalSymptoms: Constitutional/general symptoms (energy, sleep, appetite, thirst, thermal preference)
7. modalities: What makes symptoms worse (aggravation) and better (amelioration)
8. thermalReaction: HOT, CHILLY, or AMBITHERMAL
9. constitution: Constitutional type if identifiable
10. miasm: Predominant miasm if identifiable (PSORA, SYCOSIS, SYPHILIS, TUBERCULAR)

IMPORTANT: Extract ONLY what is explicitly present. Do NOT fabricate.

Respond in valid JSON matching the structure above.`;

    const userPrompt = `Patient: Age ${input.patientAge || 'Unknown'}, Gender ${input.patientGender || 'Unknown'}
Chief Complaint: ${input.chiefComplaint || 'Not specified'}
Specialty: ${input.specialty || 'HOMEOPATHY'}

${input.transcript ? `--- TRANSCRIPT ---\n${input.transcript}\n--- END TRANSCRIPT ---` : ''}
${input.labReports ? `--- LAB REPORTS ---\n${JSON.stringify(input.labReports)}\n--- END LAB ---` : ''}

Extract all clinical data:`;

    try {
      const response = await this.providerChain.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(response.content);

      logger.info({ tenantId }, 'Clinical extraction complete');

      return {
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        clinicalFindings: Array.isArray(parsed.clinicalFindings) ? parsed.clinicalFindings : [],
        mentalState: Array.isArray(parsed.mentalState) ? parsed.mentalState : [],
        emotionProfile: Array.isArray(parsed.emotionProfile) ? parsed.emotionProfile : [],
        physicalSymptoms: Array.isArray(parsed.physicalSymptoms) ? parsed.physicalSymptoms : [],
        generalSymptoms: Array.isArray(parsed.generalSymptoms) ? parsed.generalSymptoms : [],
        modalities: {
          aggravation: Array.isArray(parsed.modalities?.aggravation) ? parsed.modalities.aggravation : [],
          amelioration: Array.isArray(parsed.modalities?.amelioration) ? parsed.modalities.amelioration : [],
        },
        thermalReaction: parsed.thermalReaction || undefined,
        constitution: parsed.constitution || undefined,
        miasm: parsed.miasm || undefined,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Clinical extraction failed');
      return {
        observations: [], clinicalFindings: [], mentalState: [],
        emotionProfile: [], physicalSymptoms: [], generalSymptoms: [],
        modalities: { aggravation: [], amelioration: [] },
        confidence: 0,
      };
    }
  }
}
