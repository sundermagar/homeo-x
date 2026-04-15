// ─── SOAP Structuring Engine ──────────────────────────────────────────────────
// Generates SOAP notes from consultation transcripts.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/soap-structuring.engine.ts

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('soap-engine');

export interface SoapSuggestion {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes: Array<{ code: string; description: string }>;
  confidence: number;
  auditLogId?: string;
}

export interface SoapGenerationInput {
  transcript: string;
  chiefComplaint?: string;
  specialty?: string;
  patientAge?: number | string;
  patientGender?: string;
  allergies?: string[];
  vitals?: Record<string, unknown>;
}

export class SoapStructuringEngine {
  constructor(private providerChain: AiProviderChain) {}

  async generateSoap(tenantId: string, userId: string, input: SoapGenerationInput): Promise<SoapSuggestion> {
    const systemPrompt = `You are a medical ambient scribe AI. You convert doctor-patient consultation transcripts into structured SOAP notes.

Rules:
- SUBJECTIVE: Extract patient-reported symptoms, history, complaints.
- OBJECTIVE: Extract physical examination findings, vital signs, clinical observations.
- ASSESSMENT: Synthesize clinical assessment, diagnosis, differential diagnoses.
- PLAN: Extract treatment plan, medications prescribed, follow-up instructions, referrals.
- Include relevant ICD-10 codes based on the assessment.
- Never fabricate information not present in the transcript.
- IMPORTANT: Always extract as much clinically relevant information as possible.
- Use professional medical terminology.

GOLDEN LOGIC: "CRAVING ≠ SYMPTOM ≠ DISEASE".
CRITICAL RULES:
1. TRANSCRIPT PRIORITY: The transcript is the PRIMARY source of truth.
2. MINIMUM SYMPTOM RULE: A diagnosis is allowed ONLY IF there are at least 2 clinically relevant symptoms OR 1 strong pathological symptom.
3. NORMAL BEHAVIOR FILTER: Food cravings, hunger, and preferences are NOT symptoms.
4. DOCTOR OVERRIDE: If the doctor or patient states "no issue", the Assessment MUST be "No active medical issue identified".
5. EXACT ICD MATCH: The icdCodes MUST strictly match the condition in the Assessment.

Respond in valid JSON:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "icdCodes": [{ "code": "J06.9", "description": "Acute upper respiratory infection" }],
  "confidence": 0.85
}`;

    const userPrompt = `Convert this consultation transcript into a SOAP note:

Specialty: ${input.specialty || 'HOMEOPATHY'}
Chief Complaint: ${input.chiefComplaint || 'Not specified'}
Patient: Age ${input.patientAge || 'Unknown'}, Gender ${input.patientGender || 'Unknown'}
Known Allergies: ${input.allergies?.join(', ') || 'None known'}

--- TRANSCRIPT ---
${input.transcript}
--- END TRANSCRIPT ---

Generate a complete, clinically appropriate SOAP note based strictly on the transcript content.`;

    try {
      const response = await this.providerChain.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(response.content);

      const icdCodes = Array.isArray(parsed.icdCodes)
        ? parsed.icdCodes.map((c: any) =>
            typeof c === 'string'
              ? { code: c, description: c }
              : { code: c.code || '', description: c.description || c.code || '' },
          )
        : [];

      logger.info({ tenantId, confidence: parsed.confidence }, 'SOAP generated from transcript');

      return {
        subjective: String(parsed.subjective || ''),
        objective: String(parsed.objective || ''),
        assessment: String(parsed.assessment || ''),
        plan: String(parsed.plan || ''),
        icdCodes,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'SOAP generation failed');
      return {
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        icdCodes: [],
        confidence: 0,
      };
    }
  }
}
