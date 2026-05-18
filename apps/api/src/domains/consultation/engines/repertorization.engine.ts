// ─── Repertorization Engine ───────────────────────────────────────────────────
// AI-powered Kent's Repertory rubric extraction + remedy scoring.
// The core homeopathic analysis engine.
// Ported from: Ai-Counsultaion/apps/api/src/modules/ai/engines/repertorization.engine.ts

import { createLogger } from '../../../shared/logger.js';
import { safeJsonParse } from '../../../shared/safe-json-parse.js';
import type { AiProviderChain } from '../../../infrastructure/ai/ai-provider-chain.js';

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
  /** Doctor's explicit mode selection from PATIENT_INFO. Drives the case-type
   *  priority logic in the rubric-extraction prompt. */
  consultationMode?: 'acute' | 'chronic' | 'followup';
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

interface RemedyMetadata {
  commonName: string;
  thermalType: string;
  miasm: string;
  keynotes: string[];
}

const MATERIA_MEDICA_DB: Record<string, RemedyMetadata> = {
  'arsenicum album': {
    commonName: 'White oxide of arsenic',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Anxiety', 'Restlessness', 'Burning pains relieved by heat', 'Thirst for small sips'],
  },
  'pulsatilla': {
    commonName: 'Wind flower',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Weeping disposition', 'Thirstless', 'Craves open air', 'Changeable symptoms'],
  },
  'sulphur': {
    commonName: 'Brimstone',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Burning heat', 'Intellectual pride', 'Aversion to bathing', 'Worse standing'],
  },
  'nux vomica': {
    commonName: 'Poison nut',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Irritability', 'Sedentary habits', 'Ineffectual urging for stool', 'Chilly'],
  },
  'lycopodium': {
    commonName: 'Club moss',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Anticipatory anxiety', 'Flatulence', 'Right-sided symptoms', 'Worse 4-8 PM'],
  },
  'lycopodium clavatum': {
    commonName: 'Club moss',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Anticipatory anxiety', 'Flatulence', 'Right-sided symptoms', 'Worse 4-8 PM'],
  },
  'lachesis': {
    commonName: 'Bushmaster snake',
    thermalType: 'Hot',
    miasm: 'Syphilis',
    keynotes: ['Loquacity', 'Left-sided symptoms', 'Intolerance to tight collar', 'Worse after sleep'],
  },
  'lachesis mutus': {
    commonName: 'Bushmaster snake',
    thermalType: 'Hot',
    miasm: 'Syphilis',
    keynotes: ['Loquacity', 'Left-sided symptoms', 'Intolerance to tight collar', 'Worse after sleep'],
  },
  'silicea': {
    commonName: 'Pure flint',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Lack of grit', 'Offensive foot sweat', 'Extremely chilly', 'Scrofulous diathesis'],
  },
  'gelsemium': {
    commonName: 'Yellow jasmine',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Dullness', 'Drowsiness', 'Trembling from fright', 'Thirstless'],
  },
  'bryonia': {
    commonName: 'Wild hops',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Worse from motion', 'Dryness of mucous membranes', 'Great thirst for cold water', 'Irritable'],
  },
  'bryonia alba': {
    commonName: 'Wild hops',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Worse from motion', 'Dryness of mucous membranes', 'Great thirst for cold water', 'Irritable'],
  },
  'natrum muriaticum': {
    commonName: 'Common salt',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Silent grief', 'Craving for salt', 'Mapped tongue', 'Worse from sun heat'],
  },
  'natrum mur': {
    commonName: 'Common salt',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Silent grief', 'Craving for salt', 'Mapped tongue', 'Worse from sun heat'],
  },
  'borax': {
    commonName: 'Sodium tetraborate',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Dread of downward motion', 'Aphthae in mouth', 'Extremely sensitive to noise'],
  },
  'kali carbonicum': {
    commonName: 'Potassium carbonate',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Stitching pains', 'Backache and weakness', 'Worse 2-4 AM', 'Fleshy, chilly patients'],
  },
  'kali carb': {
    commonName: 'Potassium carbonate',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Stitching pains', 'Backache and weakness', 'Worse 2-4 AM', 'Fleshy, chilly patients'],
  },
  'phosphorus': {
    commonName: 'Phosphorus',
    thermalType: 'Chilly',
    miasm: 'Tubercular',
    keynotes: ['Craves cold drinks', 'Bleeding tendency', 'Sympathetic and open', 'Fear of dark'],
  },
  'sepia': {
    commonName: 'Inky juice of cuttlefish',
    thermalType: 'Chilly',
    miasm: 'Sycosis',
    keynotes: ['Indifference to loved ones', 'Bearing down sensation', 'Yellow saddle across nose', 'Amelioration from physical exertion'],
  },
  'calcarea carbonica': {
    commonName: 'Carbonate of lime',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Fair, fat, flabby', 'Sweat on scalp, especially during sleep', 'Craving for eggs', 'Cold damp feet'],
  },
  'calc carb': {
    commonName: 'Carbonate of lime',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Fair, fat, flabby', 'Sweat on scalp, especially during sleep', 'Craving for eggs', 'Cold damp feet'],
  },
  'belladonna': {
    commonName: 'Deadly nightshade',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Sudden, violent onset', 'Red face, hot skin, throbbing carotids', 'Pupils dilated', 'Thirstless'],
  },
  'apis mellifica': {
    commonName: 'Honey bee',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Stinging, burning pains', 'Edema and puffiness', 'Thirstless', 'Intolerance to heat'],
  },
  'apis': {
    commonName: 'Honey bee',
    thermalType: 'Hot',
    miasm: 'Psora',
    keynotes: ['Stinging, burning pains', 'Edema and puffiness', 'Thirstless', 'Intolerance to heat'],
  },
  'hepar sulph': {
    commonName: 'Hahnemann\'s calcium sulphide',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Extremely sensitive to cold draughts', 'Splinter-like pains', 'Sour sweat', 'Hypersensitive to touch'],
  },
  'hepar sulphuris calcareum': {
    commonName: 'Hahnemann\'s calcium sulphide',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Extremely sensitive to cold draughts', 'Splinter-like pains', 'Sour sweat', 'Hypersensitive to touch'],
  },
  'mercurius solubilis': {
    commonName: 'Quicksilver',
    thermalType: 'Ambithermal',
    miasm: 'Syphilis',
    keynotes: ['Profuse offensive sweat without relief', 'Salivation with metallic taste', 'Intolerance to both heat and cold', 'Flabby tongue with imprint of teeth'],
  },
  'merc sol': {
    commonName: 'Quicksilver',
    thermalType: 'Ambithermal',
    miasm: 'Syphilis',
    keynotes: ['Profuse offensive sweat without relief', 'Salivation with metallic taste', 'Intolerance to both heat and cold', 'Flabby tongue with imprint of teeth'],
  },
  'rhus toxicodendron': {
    commonName: 'Poison ivy',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Restlessness, must move constantly', 'Worse from first motion, better from continuous motion', 'Worse in damp, rainy weather', 'Triangular red tip on tongue'],
  },
  'rhus tox': {
    commonName: 'Poison ivy',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Restlessness, must move constantly', 'Worse from first motion, better from continuous motion', 'Worse in damp, rainy weather', 'Triangular red tip on tongue'],
  },
  'arnica montana': {
    commonName: 'Leopard\'s bane',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Sore, bruised feeling all over', 'Says she is well when seriously ill', 'Fear of being touched or approached', 'Bed feels too hard'],
  },
  'arnica': {
    commonName: 'Leopard\'s bane',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Sore, bruised feeling all over', 'Says she is well when seriously ill', 'Fear of being touched or approached', 'Bed feels too hard'],
  },
  'ignatia amara': {
    commonName: 'St. Ignatius bean',
    thermalType: 'Ambithermal',
    miasm: 'Psora',
    keynotes: ['Effects of grief, worry, and disappointed love', 'Sighing and sobbing', 'Paradoxical symptoms (e.g., sore throat relieved by swallowing solids)', 'Extreme emotional variability'],
  },
  'ignatia': {
    commonName: 'St. Ignatius bean',
    thermalType: 'Ambithermal',
    miasm: 'Psora',
    keynotes: ['Effects of grief, worry, and disappointed love', 'Sighing and sobbing', 'Paradoxical symptoms (e.g., sore throat relieved by swallowing solids)', 'Extreme emotional variability'],
  },
  'aconitum napellus': {
    commonName: 'Monkshood',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Sudden, violent onset after exposure to dry cold wind', 'Great fear of death', 'Restless tossing in agony', 'One cheek red and hot, the other pale and cold'],
  },
  'aconite': {
    commonName: 'Monkshood',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Sudden, violent onset after exposure to dry cold wind', 'Great fear of death', 'Restless tossing in agony', 'One cheek red and hot, the other pale and cold'],
  },
  'cinchona officinalis': {
    commonName: 'Peruvian bark',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Debility from loss of vital fluids', 'Periodicity of symptoms', 'Extreme flatulence with bloating, not relieved by passing gas', 'Hypersensitive to light touch but relieved by hard pressure'],
  },
  'china': {
    commonName: 'Peruvian bark',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Debility from loss of vital fluids', 'Periodicity of symptoms', 'Extreme flatulence with bloating, not relieved by passing gas', 'Hypersensitive to light touch but relieved by hard pressure'],
  },
  'ferrum metallicum': {
    commonName: 'Iron',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Extreme paleness of skin and mucous membranes', 'Red face from least emotion or exertion', 'Amelioration from gentle motion', 'Aversion to meat'],
  },
  'ferrum met': {
    commonName: 'Iron',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Extreme paleness of skin and mucous membranes', 'Red face from least emotion or exertion', 'Amelioration from gentle motion', 'Aversion to meat'],
  },
  'kali phosphoricum': {
    commonName: 'Phosphate of potassium',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Mental and physical depression from overwork or worry', 'Offensive secretions (breath, stool, perspiration)', 'Sensation of emptiness in stomach', 'Dread of solitude'],
  },
  'kali phos': {
    commonName: 'Phosphate of potassium',
    thermalType: 'Chilly',
    miasm: 'Psora',
    keynotes: ['Mental and physical depression from overwork or worry', 'Offensive secretions (breath, stool, perspiration)', 'Sensation of emptiness in stomach', 'Dread of solitude'],
  },
  'thuja occidentalis': {
    commonName: 'Arbor vitae',
    thermalType: 'Chilly',
    miasm: 'Sycosis',
    keynotes: ['Fixed ideas (something alive in abdomen, soul and body separated)', 'Warts and condylomata', 'Worse from damp air and cold water', 'Sweat only on uncovered parts'],
  },
  'thuja': {
    commonName: 'Arbor vitae',
    thermalType: 'Chilly',
    miasm: 'Sycosis',
    keynotes: ['Fixed ideas (something alive in abdomen, soul and body separated)', 'Warts and condylomata', 'Worse from damp air and cold water', 'Sweat only on uncovered parts'],
  },
  'medorrhinum': {
    commonName: 'Gonorrheal virus',
    thermalType: 'Hot',
    miasm: 'Sycosis',
    keynotes: ['Extreme memory weakness, forgets names or words', 'Amelioration at the seashore or damp air', 'Craves ice, cold water, sweet and sour things', 'Sleeps in knee-chest position'],
  },
  'syphilinum': {
    commonName: 'Syphilitic virus',
    thermalType: 'Chilly',
    miasm: 'Syphilis',
    keynotes: ['Utter hopelessness and despair of recovery', 'Terrible dread of night (all pains worse sunset to sunrise)', 'Craving for alcohol', 'Sensation as if memory is blank'],
  }
};

function normalizeRemedyName(name: string): string {
  if (!name) return 'unknown';
  const clean = name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, ''); // strip punctuation

  if (clean === 'aconite' || clean.startsWith('aconitum') || clean === 'acon') {
    return 'aconitum napellus';
  }
  if (clean.startsWith('arsenicum') || clean === 'ars alb' || clean === 'ars') {
    return 'arsenicum album';
  }
  if (clean.startsWith('belladonna') || clean === 'bell') {
    return 'belladonna';
  }
  if (clean === 'bryonia' || clean.startsWith('bryonia alba') || clean === 'bry') {
    return 'bryonia alba';
  }
  if (clean.startsWith('calcarea carbonica') || clean === 'calc carb' || clean === 'calc') {
    return 'calcarea carbonica';
  }
  if (clean === 'china' || clean === 'cinchona' || clean.startsWith('cinchona off') || clean.startsWith('china off')) {
    return 'cinchona officinalis';
  }
  if (clean.startsWith('ferrum met') || clean.startsWith('ferrum metall')) {
    return 'ferrum metallicum';
  }
  if (clean === 'ignatia' || clean.startsWith('ignatia amara') || clean === 'ign') {
    return 'ignatia amara';
  }
  if (clean.startsWith('gelsemium') || clean === 'gels') {
    return 'gelsemium';
  }
  if (clean === 'hepar sulph' || clean.startsWith('hepar sulphuris') || clean === 'hep') {
    return 'hepar sulphuris calcareum';
  }
  if (clean.startsWith('kali carb') || clean.startsWith('kali carbon')) {
    return 'kali carbonicum';
  }
  if (clean.startsWith('kali phos') || clean.startsWith('kali phosphor')) {
    return 'kali phosphoricum';
  }
  if (clean.startsWith('lachesis') || clean === 'lach') {
    return 'lachesis mutus';
  }
  if (clean.startsWith('lycopodium') || clean === 'lyc') {
    return 'lycopodium clavatum';
  }
  if (clean === 'merc sol' || clean.startsWith('mercurius sol')) {
    return 'mercurius solubilis';
  }
  if (clean.startsWith('natrum mur') || clean.startsWith('nat mur') || clean === 'natrum muriaticum') {
    return 'natrum muriaticum';
  }
  if (clean === 'nux vom' || clean.startsWith('nux vomica') || clean === 'nux') {
    return 'nux vomica';
  }
  if (clean.startsWith('pulsatilla') || clean === 'puls') {
    return 'pulsatilla';
  }
  if (clean.startsWith('rhus tox') || clean === 'rhus' || clean === 'rhus toxicodendron') {
    return 'rhus toxicodendron';
  }
  if (clean.startsWith('silicea') || clean === 'sil') {
    return 'silicea';
  }
  if (clean.startsWith('sulphur') || clean === 'sulfur' || clean === 'sulph') {
    return 'sulphur';
  }
  if (clean.startsWith('thuja') || clean === 'thuj') {
    return 'thuja occidentalis';
  }
  if (clean === 'medorrhinum' || clean === 'med') {
    return 'medorrhinum';
  }
  if (clean === 'syphilinum' || clean === 'syph') {
    return 'syphilinum';
  }
  if (clean.startsWith('apis') || clean === 'apis mellifica') {
    return 'apis mellifica';
  }

  return clean;
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

      const modeOverride = input.consultationMode
        ? `## STEP 0 (PRE-DETERMINED): The doctor has selected "${input.consultationMode.toUpperCase()}" as the case type. USE THIS — do not re-classify.`
        : `## STEP 0: DETERMINE CASE TYPE (MANDATORY)
Classify the case into ONE:
1. ACUTE (Cause-driven): Clear recent trigger, sudden onset, short duration
2. CHRONIC (Personality-driven): Long-standing patterns, emotional tendencies, recurrent complaints
3. FOLLOWUP (Response-driven): Patient returning to evaluate response to a previous prescription`;

      const systemPrompt = `You are an expert homeopathic repertorization assistant trained in deep clinical reasoning.

Your task is to understand the INDIVIDUAL, identify the CAUSE, and extract only HIGH-VALUE rubrics.

${modeOverride}

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

For FOLLOWUP cases:
1. Identify RESPONSE to previous prescription (improvement %, change in nature)
2. Identify DIRECTION_OF_CURE (Hering's Law: above→down, inside→out, reverse order of appearance)
3. Identify NEW_SYMPTOMS (any emerging symptoms — possible proving / shift to deeper layer)
Priority: RESPONSE > DIRECTION_OF_CURE > NEW_SYMPTOMS
Output rubrics that capture: improvement state, direction-of-cure indicators, and new symptom patterns.

## CRITICAL RULES
* CHIEF COMPLAINT IS KING: You MUST extract at least 1-2 rubrics directly representing the Chief Complaint / Core Pathology. A remedy that covers personality but misses the main disease is wrong.
* DO NOT extract rubrics from surface words without clinical meaning.
* DO NOT include generic/common symptoms unless causally linked.
* DO NOT repeat similar rubrics (NO redundancy).
* MAXIMUM 8 rubrics total (ideal 6–7).
* Prefer QUALITY over quantity.

## PATHOLOGY & ETIOLOGY RULE (MOST IMPORTANT)
1. PATHOLOGY: The Core Pathology (which includes the original Chief Complaint AND any newly mentioned major disease/issue during the conversation) MUST have a rubric with importance = 4.
2. ETIOLOGY: IF a clear cause is present (overwork, grief, injury, etc.), it MUST have a rubric with importance = 4.

## RUBRIC SELECTION LOGIC
* Chief Complaint / Pathology: 1–2 (importance 4)
* Etiology: 1 (importance 4 - if present)
* Reaction (Mind): 1–2 (importance 3–4)
* Generals: 1–2 (importance 2–3)
* Particulars: only if highly specific

## SCORING
Importance: 4=Decisive, 3=Strong, 2=Supporting, 1=Minor
Remedy Count: Low=20-50 (high value), Medium=50-150, High=150+

## OUTPUT FORMAT (STRICT JSON)
{
  "caseType": "acute | chronic | followup",
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

      const parsed: any = safeJsonParse(res.content);
      if (!parsed) {
        logger.error({ contentPreview: res.content.slice(0, 300) }, 'Rubric extraction: JSON unrecoverable even after repair');
        return this.emptyExtractionResult();
      }

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
2. FULL COVERAGE MAPPING: You MUST evaluate and list coverage for ALL selected rubrics that each remedy is known to cover in classical repertories. Do NOT just list 1 or 2 rubrics; if a remedy is indicated for 4 of the selected rubrics, you must list all 4 of them in the remedy's "coverage" array.
3. ANTI-POLYCREST BIAS: Do NOT automatically default to Arsenicum album, Sulphur, Nux vomica, or Pulsatilla unless the case strictly demands it. Heavily favor smaller, specific remedies if they perfectly match a highly characteristic or "Grade 3" rubric in the case.
4. For EACH remedy, provide a unique "coverage" array with the EXACT grade for each rubric.
   - Grade 3: Strong, bold, highly characteristic
   - Grade 2: Moderate, italic
   - Grade 1: Present, ordinary
   - Omit from "coverage" if it does not cover.
5. DYNAMIC MATERIA MEDICA PROPERTIES: You MUST dynamically assign the accurate, classical "thermalType" (e.g. 'Hot', 'Chilly', or 'Ambithermal') and dominant "miasm" (e.g. 'Psora', 'Sycosis', 'Syphilis', or 'Tubercular') matching Homeopathic Materia Medica for each remedy. Do NOT blindly copy example values.
6. NO DUPLICATIONS: Each remedy in the list MUST represent its actual clinical profile. The coverage, keynotes, miasm, and thermalType must be distinct and specific to the individual remedy.
7. Strictly return JSON format.

JSON Output Template:
{
  "scoredRemedies": [
    {
      "remedyName": "Arsenicum album",
      "commonName": "White oxide of arsenic",
      "keynotes": ["Anxiety", "Restlessness", "Burning pains relieved by heat"],
      "thermalType": "Chilly",
      "miasm": "Psora",
      "commonPotencies": ["30C", "200C"],
      "coverage": [
        { "id": "R0", "rubricDescription": "exact string", "grade": 3 }
      ]
    },
    {
      "remedyName": "Pulsatilla",
      "commonName": "Wind flower",
      "keynotes": ["Weeping disposition", "Thirstless", "Craves open air"],
      "thermalType": "Hot",
      "miasm": "Psora",
      "commonPotencies": ["30C", "200C"],
      "coverage": [
        { "id": "R1", "rubricDescription": "exact string", "grade": 2 }
      ]
    },
    {
      "remedyName": "Lachesis",
      "commonName": "Bushmaster snake",
      "keynotes": ["Loquacity", "Left-sided symptoms", "Intolerance to tight collar"],
      "thermalType": "Hot",
      "miasm": "Syphilis",
      "commonPotencies": ["200C", "1M"],
      "coverage": [
        { "id": "R2", "rubricDescription": "exact string", "grade": 3 }
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

    const parsed: any = safeJsonParse(res.content);
    if (!parsed) {
      logger.error({ contentPreview: res.content.slice(0, 300) }, 'Remedy scoring: JSON unrecoverable even after repair');
      return { scoredRemedies: [], totalRubrics: input.selectedRubrics.length, totalRemediesScored: 0 } as any;
    }

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

      // Extract raw values from LLM response
      const remName = rem.remedyName || 'Unknown';
      const cleanName = normalizeRemedyName(remName);
      const localData = MATERIA_MEDICA_DB[cleanName];

      // Enrich with Materia Medica local lookup if matching, otherwise fallback to LLM values
      const finalCommonName = localData ? localData.commonName : (rem.commonName || null);
      const finalThermalType = localData ? localData.thermalType : (rem.thermalType || 'Chilly');
      const finalMiasm = localData ? localData.miasm : (rem.miasm || 'Psora');
      const finalKeynotes = localData ? localData.keynotes : (Array.isArray(rem.keynotes) ? rem.keynotes : []);

      if (typeof input.thermalReaction === 'string' && finalThermalType && input.thermalReaction.toLowerCase() === finalThermalType.toLowerCase()) {
        totalScore += 2;
        hasThermalBonus = true;
      }
      if (typeof input.miasm === 'string' && finalMiasm && input.miasm.toLowerCase() === finalMiasm.toLowerCase()) {
        totalScore += 1;
        hasMiasmBonus = true;
      }

      const mappedCoverage = (rem.coverage || []).map((cov: any) => {
        // 1. Try matching by index parsed from ID (e.g. 'R0', 'r0', '0')
        let originalRubric = null;
        const idMatch = typeof cov.id === 'string' ? cov.id.match(/\d+/) : null;
        if (idMatch) {
          const idx = parseInt(idMatch[0], 10);
          if (idx >= 0 && idx < input.selectedRubrics.length) {
            originalRubric = input.selectedRubrics[idx];
          }
        }

        // 2. Try raw index number matching
        if (!originalRubric && typeof cov.id === 'number') {
          if (cov.id >= 0 && cov.id < input.selectedRubrics.length) {
            originalRubric = input.selectedRubrics[cov.id];
          }
        }

        // 3. Try exact or loose description match to prevent minor string variation failures
        if (!originalRubric && cov.rubricDescription) {
          const cleanCovDesc = cov.rubricDescription.toLowerCase().trim();
          originalRubric = input.selectedRubrics.find(r => {
            const cleanOrigDesc = r.description.toLowerCase().trim();
            return cleanOrigDesc === cleanCovDesc ||
                   cleanOrigDesc.includes(cleanCovDesc) ||
                   cleanCovDesc.includes(cleanOrigDesc);
          });
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
        remedyName: remName,
        commonName: finalCommonName,
        totalScore,
        normalizedScore: Math.min(100, Math.round((totalScore / maxPossibleScore) * 100)),
        coverage: mappedCoverage,
        coveredRubricCount: mappedCoverage.length,
        totalRubricCount: input.selectedRubrics.length,
        thermalType: finalThermalType,
        constitutionType: null,
        miasm: finalMiasm,
        commonPotencies: Array.isArray(rem.commonPotencies) ? rem.commonPotencies : ['30C', '200C'],
        keynotes: finalKeynotes,
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

      const parsed: any = safeJsonParse(res.content);
      if (!parsed) {
        logger.error({ contentPreview: res.content.slice(0, 300) }, 'Kent rubric search: JSON unrecoverable even after repair');
        return [];
      }

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
