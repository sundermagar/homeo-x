import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('embedding-service');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const API_VERSION = 'v1beta'; // gemini-embedding-001 is on v1beta

export class EmbeddingService {
  private get geminiKey() {
    return process.env['GEMINI_API_KEY'] || '';
  }

  /**
   * Generates a 768-dimensional vector embedding using Gemini's
   * gemini-embedding-001 model via the REST API.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      logger.warn('generateEmbedding: Empty text provided');
      return [];
    }

    try {
      if (!this.geminiKey) {
        logger.warn('GEMINI_API_KEY not found, skipping embedding generation');
        return [];
      }

      logger.info({ textLength: text.length, model: EMBEDDING_MODEL }, '🔑 generateEmbedding: Calling Gemini REST API');

      const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${EMBEDDING_MODEL}:embedContent?key=${this.geminiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({ status: response.status, body: errorBody }, 'Gemini embedding API error');
        return [];
      }

      const data = await response.json() as { embedding?: { values?: number[] } };
      const values = data?.embedding?.values;

      if (!values || values.length === 0) {
        logger.warn({ data }, 'Gemini returned empty embedding');
        return [];
      }

      logger.info({ dimensions: values.length }, '🔑 generateEmbedding: Got vector from Gemini');
      return values;
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Failed to generate embedding via Gemini');
      return [];
    }
  }

  /**
   * Constructs a clean text string from various clinical data points 
   * to create a searchable "fingerprint" of the consultation.
   */
  createFingerprint(data: any): string {
    const parts: string[] = [];
    
    if (data.consultationMode) {
      parts.push(`Consultation Mode: ${data.consultationMode}`);
    }
    
    if (data.extractedSymptoms) {
      const s = data.extractedSymptoms;
      const mental = Array.isArray(s.mental) ? s.mental.join(', ') : '';
      const physical = Array.isArray(s.physical) ? s.physical.join(', ') : '';
      const particular = Array.isArray(s.particular) ? s.particular.join(', ') : '';
      
      const symptoms = [mental, physical, particular].filter(Boolean).join(', ');
      if (symptoms) {
        parts.push(`Symptoms: ${symptoms}`);
      }
    }

    if (data.mappedRubrics && Array.isArray(data.mappedRubrics)) {
      const rubrics = data.mappedRubrics.map((r: any) => r.rubricName || r.name).filter(Boolean).join(', ');
      if (rubrics) {
        parts.push(`Repertory Rubrics: ${rubrics}`);
      }
    }

    if (data.soapNotes) {
      const soap = data.soapNotes;
      if (typeof soap.subjective === 'string') parts.push(`Subjective: ${soap.subjective}`);
      if (typeof soap.assessment === 'string') parts.push(`Assessment: ${soap.assessment}`);
    }

    // Also pull from repertorizationMatrix if available (AI-suggested rubrics)
    if (data.repertorizationMatrix) {
      const matrix = data.repertorizationMatrix;
      const remedies = matrix?.scoredRemedies;
      if (Array.isArray(remedies)) {
        const topRemedies = remedies.slice(0, 3).map((r: any) => r.remedyName).filter(Boolean).join(', ');
        if (topRemedies) {
          parts.push(`Top AI Remedies: ${topRemedies}`);
        }
        // Extract rubric descriptions from coverage
        const allRubrics = new Set<string>();
        for (const remedy of remedies.slice(0, 3)) {
          if (Array.isArray(remedy.coverage)) {
            for (const c of remedy.coverage) {
              if (c.rubricDescription) allRubrics.add(c.rubricDescription as string);
            }
          }
        }
        if (allRubrics.size > 0) {
          parts.push(`Repertory Rubrics: ${[...allRubrics].join(', ')}`);
        }
      }
    }

    if (data.aiSuggestedRemedy) {
      const remedy = typeof data.aiSuggestedRemedy === 'string' 
        ? data.aiSuggestedRemedy 
        : JSON.stringify(data.aiSuggestedRemedy);
      parts.push(`AI Suggested Remedy: ${remedy.replace(/"/g, '')}`);
    }

    if (data.doctorFinalRemedy && Array.isArray(data.doctorFinalRemedy)) {
       const remedies = data.doctorFinalRemedy
         .map((r: any) => `${r.remedyName || r.medicationName} ${r.potencyName || r.dosage || ''}`)
         .filter(Boolean)
         .join(', ');
       if (remedies) {
         parts.push(`Final Prescription: ${remedies}`);
       }
    }

    return parts.join('\n\n').trim();
  }
}

export const embeddingService = new EmbeddingService();

