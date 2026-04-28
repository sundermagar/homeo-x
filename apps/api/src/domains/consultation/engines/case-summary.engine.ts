// ─── Case Summary Engine ─────────────────────────────────────────────────────
// Module 7: Generate editable clinical summary from all consultation data.

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('case-summary-engine');

export interface CaseSummaryInput {
  observations: string[];
  clinicalFindings: string[];
  selectedRemedies: Array<{ name: string; score: number }>;
  soapData?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
  transcript?: string;
}

export interface CaseSummary {
  title: string;
  summary: string;
  keyFindings: string[];
  treatmentRationale: string;
  prognosis: string;
  followUpPlan: string;
  confidence: number;
}

export class CaseSummaryEngine {
  constructor(private providerChain: AiProviderChain) {}

  async generateSummary(tenantId: string, userId: string, input: CaseSummaryInput): Promise<CaseSummary> {
    const systemPrompt = `You are a senior homeopathic physician generating a concise case summary.
Synthesize all clinical data into a structured, editable summary suitable for medical records.

JSON Output:
{
  "title": "Brief case title",
  "summary": "2-3 paragraph clinical narrative",
  "keyFindings": ["Finding 1", "Finding 2"],
  "treatmentRationale": "Why this remedy was chosen",
  "prognosis": "Expected outcome",
  "followUpPlan": "Next steps",
  "confidence": 0.85
}`;

    const userPrompt = `Clinical Data:
Observations: ${input.observations.join('; ') || 'None'}
Clinical Findings: ${input.clinicalFindings.join('; ') || 'None'}
Selected Remedies: ${input.selectedRemedies.map(r => `${r.name} (${r.score}%)`).join(', ') || 'None'}
${input.soapData ? `SOAP: S=${input.soapData.subjective}, O=${input.soapData.objective}, A=${input.soapData.assessment}, P=${input.soapData.plan}` : ''}

Generate a clinical case summary:`;

    try {
      const response = await this.providerChain.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 2048,
        responseFormat: 'json',
      });

      return JSON.parse(response.content);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Case summary generation failed');
      return {
        title: 'Consultation Summary',
        summary: 'Summary generation failed. Please write manually.',
        keyFindings: input.observations,
        treatmentRationale: '',
        prognosis: '',
        followUpPlan: '',
        confidence: 0,
      };
    }
  }
}
