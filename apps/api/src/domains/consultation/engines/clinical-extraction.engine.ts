// ─── Clinical Extraction Engine ───────────────────────────────────────────────
// Module 2: Unified clinical extraction from conversation, labs, and notes.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/clinical-extraction.engine.ts

import { createLogger } from '../../../shared/logger.js';
import { safeJsonParse } from '../../../shared/safe-json-parse.js';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain.js';

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
  thirstPattern?: string;
  sleepPosition?: string;
  perspiration?: string;
  causation: string[];
  location: string[];
  concomitants: string[];
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
8. thermalReaction: "chilly", "hot", or "ambithermal" (Infer from sensitivity to weather, need for covering, bathing preferences. E.g. "I can't stand the cold" -> chilly)
9. constitution: Constitutional type
10. miasm: "psora", "sycosis", "syphilis", "tubercular" (Infer from pathology: psora=functional/itching, sycosis=overgrowth/warts/damp agg, syphilis=destructive/ulcers/night agg, tubercular=wasting/changeable)
11. thirstPattern: "thirsty", "thirstless", or "sips" (Infer from drinking habits)
12. sleepPosition: "knees", "abdomen", "left", "right", "back" (Infer from sleep habits)
13. perspiration: "profuse", "scanty", "offensive", etc. (Infer from sweat complaints)
14. causation: Ailments from, triggers, or etiologies (e.g., "grief", "exposure to cold", "overwork").
15. location: Specific body parts or side affinities (e.g., "left-sided", "right knee").
16. concomitants: Symptoms that appear simultaneously with the main complaint (e.g., "headache with nausea").

IMPORTANT: Act as a Master Homeopath. Patients rarely state their miasm or thermal type directly (e.g. "my miasm is psora"). You MUST INFER these constitutional factors from the clinical picture and pathology presented in the transcript. If there is enough clinical evidence, extract them! If the picture is completely unclear, leave them as null.
CRITICAL: Do NOT extract duplicate symptoms. If a symptom has already been mentioned or is a slight variation of an existing one, merge them into a single, comprehensive entry. Ensure all arrays contain strictly unique items.

Respond ONLY with JSON in this exact structure:
{
  "observations": [],
  "clinicalFindings": [],
  "mentalState": ["irritable"],
  "emotionProfile": [{"emotion": "anxiety", "intensity": 7, "context": "job stress"}],
  "physicalSymptoms": ["hair fall"],
  "generalSymptoms": [],
  "modalities": {"aggravation": ["cold weather"], "amelioration": []},
  "thermalReaction": null,
  "constitution": null,
  "miasm": null,
  "thirstPattern": null,
  "sleepPosition": null,
  "perspiration": null,
  "causation": [],
  "location": [],
  "concomitants": []
}`;

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

      const parsed: any = safeJsonParse(response.content);
      if (!parsed) {
        logger.error({ tenantId, contentPreview: response.content.slice(0, 300) }, 'Clinical extraction: JSON unrecoverable even after repair');
        throw new Error('Clinical extraction returned unparseable JSON');
      }

      logger.info({ tenantId }, 'Clinical extraction complete');

      return {
        observations: Array.isArray(parsed.observations) ? [...new Set<string>(parsed.observations)] : [],
        clinicalFindings: Array.isArray(parsed.clinicalFindings) ? [...new Set<string>(parsed.clinicalFindings)] : [],
        mentalState: Array.isArray(parsed.mentalState) ? [...new Set<string>(parsed.mentalState)] : [],
        emotionProfile: Array.isArray(parsed.emotionProfile) ? parsed.emotionProfile : [],
        physicalSymptoms: Array.isArray(parsed.physicalSymptoms) ? [...new Set<string>(parsed.physicalSymptoms)] : [],
        generalSymptoms: Array.isArray(parsed.generalSymptoms) ? [...new Set<string>(parsed.generalSymptoms)] : [],
        modalities: {
          aggravation: Array.isArray(parsed.modalities?.aggravation) ? [...new Set<string>(parsed.modalities.aggravation)] : [],
          amelioration: Array.isArray(parsed.modalities?.amelioration) ? [...new Set<string>(parsed.modalities.amelioration)] : [],
        },
        thermalReaction: parsed.thermalReaction || undefined,
        constitution: parsed.constitution || undefined,
        miasm: parsed.miasm || undefined,
        thirstPattern: parsed.thirstPattern || undefined,
        sleepPosition: parsed.sleepPosition || undefined,
        perspiration: parsed.perspiration || undefined,
        causation: Array.isArray(parsed.causation) ? [...new Set<string>(parsed.causation)] : [],
        location: Array.isArray(parsed.location) ? [...new Set<string>(parsed.location)] : [],
        concomitants: Array.isArray(parsed.concomitants) ? [...new Set<string>(parsed.concomitants)] : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Clinical extraction failed');
      return {
        observations: [], clinicalFindings: [], mentalState: [],
        emotionProfile: [], physicalSymptoms: [], generalSymptoms: [],
        modalities: { aggravation: [], amelioration: [] },
        causation: [], location: [], concomitants: [],
        confidence: 0,
      };
    }
  }
}
