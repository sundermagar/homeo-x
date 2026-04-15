// ─── Repertorization Engine ───────────────────────────────────────────────────
// AI-powered Kent's Repertory rubric extraction + remedy scoring.
// The core homeopathic analysis engine.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/repertorization.engine.ts

import { createLogger } from '../../../shared/logger';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain';

const logger = createLogger('repertorization-engine');

// ─── Result Types ───

export interface SuggestedRubric {
  rubricId: string;
  description: string;
  category: string;
  chapter: string | null;
  importance: number;
  source: 'db' | 'ai' | 'both';
  confidence: number;
  remedyCount: number;
}

export interface RubricExtractionResult {
  suggestedRubrics: SuggestedRubric[];
  overallConfidence: number;
  observations: string[];
  clinicalFindings: string[];
  provisionalDiagnosis?: {
    name: string;
    icdCode: string;
    reasoning: string;
  };
  differentials?: Array<{ name: string; likelihood: 'probable' | 'possible' | 'unlikely' }>;
  redFlags?: string[];
  suggestedInvestigations?: string[];
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

export interface RepertorizationResult {
  scoredRemedies: ScoredRemedy[];
  maxPossibleScore: number;
  totalRubricsUsed: number;
  confidence: number;
}

export interface RepertorizeExtractInput {
  visitId?: string;
  chiefComplaint?: string;
  subjective?: string;
  assessment?: string;
  observations?: string[];
  clinicalFindings?: string[];
  mentalSymptoms?: string[];
  generalSymptoms?: string[];
  particularSymptoms?: string[];
  modalities?: { aggravation?: string[]; amelioration?: string[] };
  thermalReaction?: string;
}

export interface SelectedRubric {
  rubricId: string;
  description: string;
  category: string;
  importance: number;
}

export interface RepertorizeScoreInput {
  selectedRubrics: SelectedRubric[];
  thermalReaction?: string;
  miasm?: string;
}

export class RepertorizationEngine {
  constructor(private providerChain: AiProviderChain) {}

  /**
   * Phase A: Extract rubrics from symptoms using AI Kent's Pattern Matcher
   */
  async extractRubrics(tenantId: string, userId: string, input: RepertorizeExtractInput): Promise<RubricExtractionResult> {
    try {
      const symptomText = [
        input.chiefComplaint,
        input.subjective,
        input.assessment,
        ...(input.observations || []),
        ...(input.clinicalFindings || []),
        ...(input.mentalSymptoms || []),
        ...(input.generalSymptoms || []),
        ...(input.particularSymptoms || []),
        ...(input.modalities?.aggravation || []),
        ...(input.modalities?.amelioration || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!symptomText.trim()) {
        logger.info('No symptoms provided — skipping rubric extraction');
        return this.emptyExtractionResult();
      }

      logger.info(`Extracting Kent rubrics for: ${symptomText.substring(0, 100)}...`);

      const systemPrompt = `You are an expert homeopathic repertorization assistant trained in deep clinical reasoning.

Your task is to understand the INDIVIDUAL, identify the CAUSE, and extract only HIGH-VALUE rubrics.

## STEP 0: DETERMINE CASE TYPE (MANDATORY)
Classify the case into ONE:
1. ACUTE (Cause-driven): Clear recent trigger, sudden onset, short duration
2. CHRONIC (Personality-driven): Long-standing patterns, emotional tendencies, recurrent complaints

## CORE ANALYSIS (MANDATORY)
For ACUTE cases:
1. Identify the TRIGGER (MOST IMPORTANT)
2. Identify the REACTION (how the person responded)
3. Identify key GENERAL effects (fever, weakness, sleep, energy)
Priority: TRIGGER > REACTION > SYMPTOMS

For CHRONIC cases:
1. Identify CORE PERSONALITY
2. Identify REACTION (MOST IMPORTANT)
3. Identify TRIGGER (if relevant)
Priority: REACTION > PERSONALITY > TRIGGER

## CRITICAL RULES
* DO NOT extract rubrics from surface words
* DO NOT include generic/common symptoms unless causally linked
* DO NOT repeat similar rubrics (NO redundancy)
* MAXIMUM 8 rubrics total (ideal 6–7)
* Prefer QUALITY over quantity

## ETIOLOGY RULE (MOST IMPORTANT)
IF a clear cause is present (overwork, grief, injury, etc.):
1. MUST include etiology rubric(s): "General - Ailments from - ..."
2. Assign importance = 4 (highest)
3. LIMIT: Max 2 etiology, Max 2 downstream physical

## RUBRIC SELECTION LOGIC
* Etiology: 1–2 (importance 4)
* Reaction (Mind): 2–3 (importance 3–4)
* Generals: 1–2 (importance 2–3)
* Particulars: only if highly specific

## SCORING
Importance: 4=Decisive, 3=Strong, 2=Supporting, 1=Minor
Remedy Count: Low=20-50 (high value), Medium=50-150, High=150+

## OUTPUT FORMAT (STRICT JSON)
{
  "caseType": "acute | chronic",
  "coreAnalysis": { "personality": "...", "trigger": "...", "reaction": "...", "themes": ["..."] },
  "suggestedRubrics": [
    { "chapter": "General", "category": "GENERAL", "description": "General - Ailments from - overwork", "importance": 4, "remedyCount": 40 }
  ],
  "observations": ["..."],
  "clinicalFindings": ["..."],
  "provisionalDiagnosis": { "name": "...", "icdCode": "...", "reasoning": "..." },
  "differentials": [{ "name": "...", "likelihood": "possible" }]
}`;

      const res = await this.providerChain.complete({
        systemPrompt,
        userPrompt: `Patient Case for Deep Clinical Analysis:\n${symptomText}\n\nDetermine case type (ACUTE/CHRONIC), perform INDIVIDUAL analysis, and extract Kent Rubrics:`,
        responseFormat: 'json',
        temperature: 0.1,
      });

      const parsed = JSON.parse(res.content);

      const suggestedRubrics: SuggestedRubric[] = (parsed.suggestedRubrics || []).map((r: any, i: number) => ({
        rubricId: `ai-rubric-${Date.now()}-${i}`,
        description: r.description,
        category: r.category || (r.description?.toLowerCase().includes('mind') ? 'MIND' : 'PARTICULAR'),
        chapter: r.chapter || 'Unknown',
        importance: r.importance || 2,
        source: 'ai' as const,
        confidence: 0.95,
        remedyCount: r.remedyCount || 50,
      }));

      return {
        suggestedRubrics,
        overallConfidence: suggestedRubrics.length > 0 ? 0.85 : 0,
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        clinicalFindings: Array.isArray(parsed.clinicalFindings) ? parsed.clinicalFindings : [],
        provisionalDiagnosis: parsed.provisionalDiagnosis,
        differentials: Array.isArray(parsed.differentials) ? parsed.differentials : [],
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        suggestedInvestigations: Array.isArray(parsed.suggestedInvestigations) ? parsed.suggestedInvestigations : [],
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Rubric extraction failed');
      return this.emptyExtractionResult();
    }
  }

  /**
   * Phase B: AI Repertorization Scoring (Materia Medica Grid)
   */
  async scoreRemedies(tenantId: string, userId: string, input: RepertorizeScoreInput): Promise<RepertorizationResult> {
    if (!input.selectedRubrics || input.selectedRubrics.length === 0) {
      return { scoredRemedies: [], maxPossibleScore: 0, totalRubricsUsed: 0, confidence: 0 };
    }

    const systemPrompt = `You are a Master Homeopathic Repertorizer engine combining Kent's methodology and Materia Medica knowledge.
Take a list of EXACT rubrics and score the TOP 8 classically indicated remedies.

CRITICAL RULES:
1. Identify EXACTLY 8 remedies that best cover the combined totality.
2. For EACH remedy, provide a "coverage" array with the EXACT grade for each rubric.
   - Grade 3: Strong, bold, highly characteristic
   - Grade 2: Moderate, italic
   - Grade 1: Present, ordinary
   - Omit from "coverage" if it does not cover.
3. Strictly return JSON format.

JSON Output:
{
  "scoredRemedies": [
    {
      "remedyName": "Arsenicum album",
      "commonName": "White oxide of arsenic",
      "keynotes": ["Restlessness", "Burning pains"],
      "thermalType": "Chilly",
      "miasm": "Psora/Syphilis",
      "commonPotencies": ["30C", "200C"],
      "coverage": [
        { "id": "R0", "rubricDescription": "exact string", "grade": 3 }
      ]
    }
  ]
}`;

    const userPrompt = `Target Patient Rubrics to cover:\n${input.selectedRubrics.map((r, idx) => `[R${idx}] ${r.description}`).join('\n')}\n\nGenerate the Matrix:`;

    const res = await this.providerChain.complete({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      temperature: 0.1,
    });

    const parsed = JSON.parse(res.content);

    const maxPossibleScore = input.selectedRubrics.reduce((sum, r) => {
      let catWeight = 1;
      if (r.category === 'MIND') catWeight = 3;
      else if (r.category === 'GENERAL') catWeight = 2;
      return sum + (4 * r.importance * catWeight);
    }, 0) || 1;

    let scoredRemedies: ScoredRemedy[] = (parsed.scoredRemedies || []).map((rem: any, i: number) => {
      let totalScore = 0;
      let hasThermalBonus = false;
      let hasMiasmBonus = false;

      if (typeof input.thermalReaction === 'string' && rem.thermalType && input.thermalReaction.toLowerCase() === rem.thermalType.toLowerCase()) {
        totalScore += 2;
        hasThermalBonus = true;
      }
      if (typeof input.miasm === 'string' && rem.miasm && input.miasm.toLowerCase() === rem.miasm.toLowerCase()) {
        totalScore += 1;
        hasMiasmBonus = true;
      }

      const mappedCoverage = (rem.coverage || []).map((cov: any) => {
        let originalRubric = input.selectedRubrics.find((_, idx) => `R${idx}` === cov.id);
        if (!originalRubric) {
          originalRubric = input.selectedRubrics.find(r => r.description.toLowerCase().trim() === (cov.rubricDescription || '').toLowerCase().trim());
        }
        if (!originalRubric) return null;

        const grade = cov.grade || 1;
        const importance = originalRubric.importance || 2;
        let catWeight = 1;
        if (originalRubric.category === 'MIND') catWeight = 3;
        else if (originalRubric.category === 'GENERAL') catWeight = 2;

        let gradePoints = 1;
        if (grade === 2) gradePoints = 2;
        else if (grade === 3) gradePoints = 4;

        const contribution = gradePoints * importance * catWeight;
        totalScore += contribution;

        return {
          rubricId: originalRubric.rubricId,
          rubricDescription: originalRubric.description,
          rubricCategory: originalRubric.category,
          grade,
          importance,
          contribution,
        };
      }).filter(Boolean);

      return {
        remedyId: `ai-remedy-${Date.now()}-${i}`,
        remedyName: rem.remedyName || 'Unknown',
        commonName: rem.commonName || null,
        totalScore,
        normalizedScore: Math.min(100, Math.round((totalScore / maxPossibleScore) * 100)),
        coverage: mappedCoverage,
        coveredRubricCount: mappedCoverage.length,
        totalRubricCount: input.selectedRubrics.length,
        thermalType: rem.thermalType || null,
        constitutionType: null,
        miasm: rem.miasm || null,
        commonPotencies: Array.isArray(rem.commonPotencies) ? rem.commonPotencies : ['30C', '200C'],
        keynotes: Array.isArray(rem.keynotes) ? rem.keynotes : [],
        thermalBonus: hasThermalBonus,
        miasmBonus: hasMiasmBonus,
        matchExplanation: mappedCoverage.map((c: any) => c.rubricDescription),
      };
    });

    scoredRemedies.sort((a, b) => b.totalScore - a.totalScore);

    return {
      scoredRemedies,
      maxPossibleScore,
      totalRubricsUsed: input.selectedRubrics.length,
      confidence: scoredRemedies.length > 0 ? 0.85 : 0,
    };
  }

  /**
   * Search Kent's Repertory rubrics via AI
   */
  async searchKentRubrics(query: string): Promise<SuggestedRubric[]> {
    if (!query?.trim() || query.trim().length < 2) return [];

    const systemPrompt = `You are a digital Kent's Repertory and Boericke's Materia Medica reference engine.
Given a search keyword or symptom phrase, return ALL matching rubrics from Kent's Repertory.

CRITICAL RULES:
1. Return 10-20 matching rubrics.
2. Use EXACT Kent's Repertory rubric format: "Chapter - Symptom - Modifier".
3. Category must be one of: 'MIND', 'GENERAL', 'PARTICULAR'.
4. Include rubrics from various chapters.
5. Sort by clinical relevance.
6. Assign importance (1-4): 4=Eliminating, 3=Important, 2=Moderate, 1=Supporting.
7. Estimate remedyCount.

JSON Output:
{ "rubrics": [{ "chapter": "Mind", "category": "MIND", "description": "Mind - Jealousy", "importance": 3, "remedyCount": 45 }] }`;

    try {
      const res = await this.providerChain.complete({
        systemPrompt,
        userPrompt: `Search Kent's Repertory for: "${query}"`,
        responseFormat: 'json',
        temperature: 0.1,
      });

      const parsed = JSON.parse(res.content);

      return (parsed.rubrics || []).map((r: any, i: number) => ({
        rubricId: `kent-search-${Date.now()}-${i}`,
        description: r.description || '',
        category: r.category || 'PARTICULAR',
        chapter: r.chapter || 'Unknown',
        importance: r.importance || 2,
        source: 'ai' as const,
        confidence: 0.9,
        remedyCount: r.remedyCount || 50,
      }));
    } catch (error: any) {
      logger.error({ error: error.message }, 'Kent rubric search failed');
      return [];
    }
  }

  private emptyExtractionResult(): RubricExtractionResult {
    return {
      suggestedRubrics: [],
      overallConfidence: 0,
      observations: [],
      clinicalFindings: [],
    };
  }
}
