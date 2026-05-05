import { createLogger } from '../../../shared/logger.js';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain.js';

const logger = createLogger('followup-assessment-engine');

export type FollowUpDecision = 'REPEAT' | 'CHANGE' | 'ADVICE_ONLY';

export interface FollowUpAssessment {
  decision: FollowUpDecision;
  improvementPercent: number;
  heringLawObservations: string[];
  
  // Current status
  chiefComplaintStatus: string;
  generalWellbeing: string;
  newSymptoms: string[];
  
  // Remedy advice
  currentRemedyReview: string;
  suggestedAction: string;
  potencyAdjustment?: string;
  
  // Only populated when decision is CHANGE
  alternativeRemedy?: {
    name: string;
    potency: string;
    dosage: string;
    reasoning: string;
  };
  
  // General
  dietaryAdvice: string[];
  lifestyleAdvice: string[];
  followUpTimeline: string;
  clinicalNotes: string;
  confidence: number;
}

export class FollowUpAssessmentEngine {
  constructor(private providerChain: AiProviderChain) {}

  async assess(
    tenantId: string,
    userId: string,
    input: {
      transcript: string;
      chiefComplaint?: string;
      previousPrescription?: string;
      patientAge?: number;
      patientGender?: string;
      soapData?: { subjective: string; objective: string; assessment: string };
    }
  ): Promise<FollowUpAssessment> {
    const systemPrompt = `You are a Senior Homeopathic Physician conducting a FOLLOW-UP assessment.

Your job is NOT to start a new case. The patient has ALREADY been prescribed a remedy in a previous visit. 
You must evaluate the patient's RESPONSE to the previous remedy and decide:

1. **REPEAT** — The remedy is working. Continue same remedy (adjust potency if needed).
2. **CHANGE** — The remedy is not helping or wrong. Suggest a different remedy with reasoning.
3. **ADVICE_ONLY** — Patient is recovering well. No remedy needed now, just lifestyle/diet guidance.

## DECISION FRAMEWORK (Hering's Law of Cure)
Signs the remedy IS working (lean toward REPEAT):
- Symptoms improving from above → below
- Symptoms moving from inside → outside (e.g., internal pain → skin eruption)  
- Old symptoms briefly returning then resolving
- Mental/emotional improvement before physical
- General energy/sleep/appetite improving

Signs the remedy is NOT working (lean toward CHANGE):
- No improvement after adequate time
- Symptoms worsening or new deep symptoms appearing
- Symptoms moving in reverse (outside → inside, below → above)
- Patient feels generally worse (energy, mood, sleep declining)

Signs remedy is no longer needed (lean toward ADVICE_ONLY):
- 75%+ improvement
- Only minor residual symptoms
- Patient feels well overall

## OUTPUT FORMAT (STRICT JSON)
{
  "decision": "REPEAT" | "CHANGE" | "ADVICE_ONLY",
  "improvementPercent": 0-100,
  "heringLawObservations": ["observation 1", "observation 2"],
  "chiefComplaintStatus": "Brief status of the chief complaint",
  "generalWellbeing": "Brief assessment of energy, sleep, mood, appetite",
  "newSymptoms": ["any new symptoms mentioned"],
  "currentRemedyReview": "Brief review of how the previous remedy performed",
  "suggestedAction": "Clear, actionable advice in 1-2 sentences",
  "potencyAdjustment": "Only if REPEAT and potency change needed, e.g. 'Move from 30C to 200C'",
  "alternativeRemedy": {
    "name": "Remedy Name (ONLY if decision is CHANGE)",
    "potency": "e.g. 30C",
    "dosage": "e.g. 2 pills 3 times/day",
    "reasoning": "Why this remedy fits better"
  },
  "dietaryAdvice": ["• Point 1", "• Point 2"],
  "lifestyleAdvice": ["• Point 1", "• Point 2"],
  "followUpTimeline": "e.g. 2 weeks",
  "clinicalNotes": "Brief clinical summary for the record",
  "confidence": 0.85
}

RULES:
1. If decision is REPEAT or ADVICE_ONLY, do NOT populate alternativeRemedy.
2. Keep all text concise — max 2 bullet points per array, max 12 words per point.
3. Base EVERYTHING on what the patient actually said in the transcript. Do NOT hallucinate improvements or symptoms.
4. If the transcript doesn't mention the previous remedy, still assess based on symptom changes.`;

    const userPrompt = `FOLLOW-UP CONSULTATION DATA:

Chief Complaint: ${input.chiefComplaint || 'Not specified'}
Previous Prescription: ${input.previousPrescription || 'Not available — assess based on symptom changes only'}
Patient: ${input.patientAge ? `Age ${input.patientAge}` : 'Unknown age'}${input.patientGender ? `, ${input.patientGender}` : ''}

${input.soapData ? `SOAP from this visit:
- Subjective: ${input.soapData.subjective || 'N/A'}
- Objective: ${input.soapData.objective || 'N/A'}
- Assessment: ${input.soapData.assessment || 'N/A'}` : ''}

TRANSCRIPT OF TODAY'S FOLLOW-UP VISIT:
"""
${input.transcript || 'No transcript available'}
"""

TASK: Evaluate the patient's response to previous treatment and output your FOLLOW-UP ASSESSMENT as JSON. 
Remember: Do NOT suggest a new remedy unless the previous one clearly failed (decision = CHANGE).`;

    try {
      const response = await this.providerChain.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 1500,
        responseFormat: 'json',
      });

      const jsonStr = response.content.substring(
        response.content.indexOf('{'),
        response.content.lastIndexOf('}') + 1
      );
      const parsed = JSON.parse(jsonStr || response.content);

      // Validate decision
      if (!['REPEAT', 'CHANGE', 'ADVICE_ONLY'].includes(parsed.decision)) {
        parsed.decision = 'REPEAT';
      }

      // Remove alternativeRemedy if decision is not CHANGE
      if (parsed.decision !== 'CHANGE') {
        delete parsed.alternativeRemedy;
      }

      logger.info(
        { tenantId, decision: parsed.decision, improvement: parsed.improvementPercent },
        'Follow-up assessment completed'
      );

      return parsed;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Follow-up assessment failed');
      return {
        decision: 'REPEAT',
        improvementPercent: 0,
        heringLawObservations: [],
        chiefComplaintStatus: 'Assessment failed — please review manually.',
        generalWellbeing: 'Unable to assess.',
        newSymptoms: [],
        currentRemedyReview: 'AI assessment unavailable.',
        suggestedAction: 'Continue current remedy and reassess at next visit.',
        dietaryAdvice: [],
        lifestyleAdvice: [],
        followUpTimeline: '2 weeks',
        clinicalNotes: 'Automated assessment failed. Manual review required.',
        confidence: 0.1,
      };
    }
  }
}
