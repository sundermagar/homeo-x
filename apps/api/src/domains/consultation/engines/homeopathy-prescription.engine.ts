import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('homeopathy-prescription-engine');

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

export interface HomeopathyPrescriptionDraft {
  consultationSummary: string; // SYMPTOMS
  diagnosis: string;
  materiaMedicaValidation: string;
  suggestedRemedy: string;
  suggestedRemedies: Array<{
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
  gnmAnalysis?: GnmAnalysis | null;   // GNM interpretation
}

export class HomeopathyPrescriptionEngine {
  constructor(private providerChain: AiProviderChain) {}

  async generatePrescription(
    tenantId: string,
    userId: string,
    input: {
      transcript?: string;
      clinicalData: any;
      diagnosisData: any;
      selectedRubrics: any[];
      remedyScores: any;
    }
  ): Promise<HomeopathyPrescriptionDraft> {
    const topRemedy = input.remedyScores?.scoredRemedies?.[0];
    const otherCandidates = input.remedyScores?.scoredRemedies?.slice(1, 4) || [];

    const systemPrompt = `You are a specialized Homeopathic Consultant AI with expertise in German New Medicine (GNM / Dr. Hamer's 5 Biological Laws).
Your goal is to draft comprehensive clinical notes, prescriptions, AND a GNM interpretation — all in ONE response.

CORE OUTPUT PRINCIPLES:
1. **LEGAL STANDARD**: Clinical notes must be professional, legal records.
2. **STRICT CONCISENESS**: Every field (including advice and GNM) must be EXTREMELY BRIEF bullet points (•). MAX 2 points per field, MAX 10 words per point. NEVER use continuous paragraphs.
3. **DEDUPLICATION**: Do NOT repeat information across fields. 
4. **Symptoms (consultationSummary)**: List ONLY raw symptoms with explicitly stated durations. 
   - **STRICT RULE**: DO NOT hallucinate durations. If not mentioned, just list the symptom (e.g. • Fever).
   - **STRICT RULE**: Use plain patient language, NOT homeopathic terminology.
5. **Clinical Notes (materiaMedicaValidation)**: EXTREMELY concise bullet points (•):
     • MEDICAL HISTORY: Relevant past conditions.
     • TREATMENT & REASONING: Brief justification.
     • ASSESSMENT: Clinical progression/patterns.
6. **GNM Analysis (gnmAnalysis)**: Apply Dr. Hamer's framework:
   - Identify the CORE BIOLOGICAL CONFLICT from emotions/history/symptoms
   - Map to correct TISSUE LAYER (ectoderm/mesoderm/endoderm)
   - Determine CONFLICT PHASE (active vs healing)
   - Extract HOMEOPATHIC TOTALITY (mental + physical generals)
   - Rank remedies using BOTH GNM conflict match + classical totality
   - Suggest RESOLUTION STRATEGY for conflict healing
   - If no explicit emotional conflict is mentioned, ALWAYS provide a **Deductive Analysis** based on the organ affected (e.g., Separation for skin, Visual Separation for eyes, Territory loss for heart, etc.). Mark these as "Deductive/Probable" in the report. Do NOT set gnmAnalysis to null if symptoms are present.

Output JSON Format:
{
  "consultationSummary": "• Symptom (duration only if explicitly mentioned)",
  "materiaMedicaValidation": "• Medical History: ...\\n• Treatment & Reasoning: ...\\n• Assessment: ...",
  "diagnosis": "Final diagnosis",
  "suggestedRemedy": "Remedy Name",
  "potency": "e.g., 30C",
  "dosage": "e.g., 2 pills 3 times a day",
  "safetyWarnings": ["red flags"],
  "missingInformation": ["what to ask next"],
  "advice": ["lifestyle advice"],
  "followUp": "timeline",
  "confidence": 0.85,
  "gnmAnalysis": {
    "coreConflict": {
      "conflictType": "(identify or deduce conflict type)",
      "affectedTissue": "(map to correct embryological layer based on symptom organ)",
      "biologicalMeaning": "(explain WHY this symptom exists per GNM)",
      "triggerEvents": ["(deduce likely emotional trigger events if not explicitly mentioned)"]
    },
    "phases": {
      "conflictActive": "(what happens during active conflict for THIS symptom)",
      "healingPhase": "(what healing looks like for THIS symptom)",
      "isRecurrentTrack": true,
      "trackTriggers": ["(deduce likely recurring tracks/triggers)"]
    },
    "homeopathicTotality": {
      "mentalEmotional": ["(extract from transcript — actual patient traits)"],
      "physicalGenerals": ["(extract from transcript — thermal, thirst, etc.)"]
    },
    "emotionalIntensities": [
      {"emotion":"(e.g. Suppressed grief, Stress, Anxiety, Guilt, etc. based EXACTLY on transcript)","intensity":80}
    ],
    "rankedRemedies": [
      {"rank":1,"name":"(actual remedy)","matchStrength":"strongest","keynotes":["(real keynotes)"],"suggestedPotency":"(appropriate potency)","whenToUse":"(specific condition for THIS patient)"}
    ],
    "resolutionStrategy": {
      "directions": ["• Short point 1 (max 10 words)", "• Short point 2 (max 10 words)"],
      "prognosis": "• EXTREMELY short outcome sentence."
    },
    "confidence": 0.85
  }
}
CRITICAL RULES:
- ALWAYS use bullets (•) for Symptoms and Clinical Notes.
- Keep gnmAnalysis concise — short strings, max 4-5 items per array.
- DO NOT invent, extrapolate, or forcefully guess deep emotional GNM conflicts (like "separation conflict") purely from physical symptoms (like headache or eye pain).
- If the transcript lacks deep emotional history or specific psychological trigger events, simply set \`gnmAnalysis\` to null.
- Provide a GNM analysis ONLY if the patient's stated history explicitly supports an underlying biological conflict according to Dr. Hamer's framework.`;

    const userPrompt = `Input Data:
Transcript: ${input.transcript || 'N/A'}
Clinical Symptoms: ${JSON.stringify(input.clinicalData?.observations || [])}
Clinical/Lab Findings: ${JSON.stringify(input.clinicalData?.clinicalFindings || [])}
Mental State: ${JSON.stringify(input.clinicalData?.mentalState || [])}
Provisional Diagnosis: ${input.diagnosisData?.primaryDiagnosis?.name || 'Pending'}
Selected Rubrics: ${JSON.stringify(input.selectedRubrics?.map((r: any) => r.description) || [])}
Top Match: ${topRemedy?.remedyName}
- Keynotes: ${JSON.stringify(topRemedy?.keynotes || [])}
- Profile: ${topRemedy?.thermalType}, ${topRemedy?.miasm}
- Score: ${topRemedy?.totalScore}
- Match Explanation: ${JSON.stringify(topRemedy?.matchExplanation || [])}

Other Candidates: ${otherCandidates.map((c: any) => c.remedyName).join(', ')}

Draft the consultation report with GNM interpretation. Include top 4 remedies with potencies. Analyze the case through Dr. Hamer's framework — identify the biological conflict, affected tissue layer, conflict phase, and resolution strategy.`;

    try {
      const response = await this.providerChain.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      let parsed = JSON.parse(response.content);
      
      if (!parsed.suggestedRemedies || !Array.isArray(parsed.suggestedRemedies)) {
        parsed.suggestedRemedies = [{
          remedyName: topRemedy?.remedyName || '',
          potency: parsed.potency || '30C',
          dosage: parsed.dosage || '2 pills/day'
        }];
        
        otherCandidates.forEach((c: any) => {
          parsed.suggestedRemedies.push({
            remedyName: c.remedyName,
            potency: '30C',
            dosage: '2 pills/day'
          });
        });
      }

      if (!parsed.suggestedRemedy && topRemedy?.remedyName) {
        parsed.suggestedRemedy = topRemedy.remedyName;
      }

      logger.info({ tenantId, primaryRemedy: parsed.suggestedRemedy, hasGnm: !!parsed.gnmAnalysis }, 'Homeopathy prescription drafted');
      return parsed;

    } catch (error: any) {
      logger.error({ error: error.message }, 'Homeopathy prescription drafting failed');
      return {
        consultationSummary: input.clinicalData?.clinical_summary || 'Symptoms analysis failed.',
        diagnosis: input.diagnosisData?.primaryDiagnosis?.name || 'Pending assessment',
        materiaMedicaValidation: 'Analysis incomplete.',
        suggestedRemedy: topRemedy?.remedyName || 'Consultation required',
        suggestedRemedies: [
          { remedyName: topRemedy?.remedyName || '', potency: '30C', dosage: '2 pills/day' },
          ...otherCandidates.map((c: any) => ({ remedyName: c.remedyName, potency: '30C', dosage: '2 pills/day' }))
        ],
        potency: '30C',
        dosage: '3 doses/day',
        safetyWarnings: ['Please consult your physician for manual review.'],
        missingInformation: [],
        advice: ['Ensure rest and hydration.'],
        followUp: '3 days',
        confidence: 0.1,
        gnmAnalysis: null,
      };
    }
  }
}
