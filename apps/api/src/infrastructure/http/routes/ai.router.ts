// ─── AI Router ────────────────────────────────────────────────────────────────
// Express routes for AI-powered consultation features.
// Migrated from: Ai-Counsultaion/apps/api/src/modules/ai/ai.controller.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getConsultationUseCase } from '../../../domains/consultation/consultation.use-case';
import { getAiProviderChain } from '../../ai/ai-provider-chain';
import { sendSuccess } from '../../../shared/response-formatter';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('ai-router');

// Tolerant JSON extractor — strips ```json fences and finds the first object/array
function extractJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const firstObj = cleaned.match(/\{[\s\S]*\}/);
  if (firstObj) { try { return JSON.parse(firstObj[0]); } catch {} }
  const firstArr = cleaned.match(/\[[\s\S]*\]/);
  if (firstArr) { try { return JSON.parse(firstArr[0]); } catch {} }
  return null;
}

export const aiRouter: Router = Router();

// Helper to extract tenant/user from request (set by middleware)
function getTenant(req: Request): string {
  return (req as any).tenantId || 'default';
}
function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId || 'system';
}

// POST /api/ai/suggest/soap
aiRouter.post('/suggest/soap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.suggestSoap(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/consult/homeopathy — Full 7-phase pipeline
aiRouter.post('/consult/homeopathy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extended timeout for the full pipeline (up to 90s)
    req.setTimeout(90_000);
    const uc = getConsultationUseCase();
    const result = await uc.consultHomeopathy(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/repertorize/extract — Rubric extraction
aiRouter.post('/repertorize/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.extractRubrics(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/repertorize/score — Remedy scoring
aiRouter.post('/repertorize/score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.scoreRemedies(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/case/extract — Clinical extraction (full shape)
aiRouter.post('/case/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.extractCase(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/extract/symptoms — Live symptom extraction for the right-side
// "Live Extraction" panel on the consultation stage.
// Spec: Complete Repertory rubric format, mode-aware hints, token-set dedup,
// labContext support, '__LAB_REPORT_ANALYSIS__' special-case.
//
// Input: { consultationMode, question, answer, existingSymptoms?, labContext? }
// Output: full merged list { mental: string[], physical: string[], particular: string[] }
aiRouter.post('/extract/symptoms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { consultationMode, question, answer, existingSymptoms, labContext } = req.body ?? {};
    const existing = {
      mental: Array.isArray(existingSymptoms?.mental) ? existingSymptoms.mental : [],
      physical: Array.isArray(existingSymptoms?.physical) ? existingSymptoms.physical : [],
      particular: Array.isArray(existingSymptoms?.particular) ? existingSymptoms.particular : [],
    };

    // Nothing new to look at — return existing as-is to keep panel stable.
    if (!question && !answer && !labContext) { sendSuccess(res, existing); return; }

    const chain = getAiProviderChain();
    const isLabOnly = question === '__LAB_REPORT_ANALYSIS__';
    const mode = (consultationMode || 'acute') as 'acute' | 'chronic' | 'followup';

    const MODE_HINT: Record<typeof mode, string> = {
      acute: 'When the patient mentions any of these, they belong here: sensation, modalities (worse/better from), concomitants, onset triggers. Do NOT add these unless the patient said them.',
      chronic: 'When the patient mentions any of these, they belong here: constitutional themes, thermals, thirst, food desires/aversions, sleep position, dreams, "Never Well Since". Do NOT add these unless the patient said them.',
      followup: 'When the patient mentions any of these, they belong here: improvement %, direction-of-cure (Hering\'s Law), returning old symptoms, NEW symptoms. Do NOT add these unless the patient said them.',
    };

    const labBlock = labContext
      ? `

## LAB-CONTEXT MAPPING (only when ABNORMAL values are EXPLICITLY listed in the lab text)
Reference table — apply ONLY if the lab text says the value is abnormal/high/low or the value is clearly outside a stated reference range:
- Low Hb / low RBC → "Generalities - Anaemia"
- High ESR / high CRP → "Generalities - Inflammation"
- High blood sugar / high HbA1c → "Generalities - Diabetes mellitus"
- High cholesterol / triglycerides → "Generalities - Hypercholesterolaemia"
- High TSH → "Generalities - Thyroid - hypofunction"
- Low TSH → "Generalities - Thyroid - hyperfunction"
- High AST/ALT/bilirubin → "Liver - Inflammation"
- High creatinine/urea → "Kidney - Inflammation"
DO NOT emit a rubric for any test that is normal or not present in the lab text.
DO NOT invent reference ranges. If the value's status is unclear, skip it.`
      : '';

    const mergeRule = (existing.mental.length || existing.physical.length || existing.particular.length)
      ? `

## MERGE WITH EXISTING (CRITICAL)
You will receive an EXISTING symptom list. Return the FULL merged list:
- Keep every existing entry intact unless the new Q&A adds explicit detail to it.
- If the new Q&A adds detail (more specific location, modality, time), REPLACE the matching existing entry with the more specific version — do NOT emit both.
- Do NOT emit synonyms or rewordings of an existing entry.
- Do NOT add new entries unless they have direct verbal evidence in the Q&A.`
      : '';

    const systemPrompt = `You are a homeopathic symptom extraction engine trained on Complete Repertory (primary), Murphy's Repertory, and Boericke's Materia Medica.

Your job: extract symptoms FROM THE PROVIDED Q&A (and lab text, if present) and categorize them into mental / physical / particular using Complete Repertory rubric format.

## ABSOLUTE GROUNDING RULE (HIGHEST PRIORITY)
EVERY rubric you emit MUST be backed by a specific, identifiable phrase from the Q&A or the lab text. Before emitting any rubric, ask yourself: "What exact words from the patient (or doctor) make this true?" If you cannot point to a phrase, DO NOT emit the rubric.
- Empty arrays are valid output. If the Q&A has no clear symptoms, return {"mental":[],"physical":[],"particular":[]}.
- If the patient said "I don't know" or "no", emit nothing for that topic.
- DO NOT extrapolate from the chief complaint, mode, age, or gender.
- DO NOT add "common" symptoms that "usually accompany" the stated complaint.
- DO NOT use the mode hint or lab table as a checklist of things to look for — they describe ONLY which symptoms (when present) belong in which bucket.

## BANNED PATTERNS (real failure modes — avoid these)
WRONG: Patient says "I have a headache." → emitting "Head - Pain, throbbing" (sensation invented).
WRONG: Patient says "back pain after lifting." → emitting "Mind - Anxiety" (no mental content).
WRONG: Mode is "chronic" → emitting "Mind - Fastidiousness" without the patient ever showing fastidiousness.
WRONG: Lab not provided → emitting "Generalities - Anaemia" (no evidence).
WRONG: Same idea twice → "Back - Pain" AND "Back - Pain, lower" (keep only the more specific one).

## CATEGORIZATION
- mental:     "Mind - <Symptom>"            — anxiety, fear, irritability, sadness, anger, dreams, sensitivity, grief, indignation
- physical:   "Generalities - <Symptom>"    — thermal, thirst, sleep position, time aggravation, weather modalities, food cravings/aversions, perspiration, weakness
- particular: "<Chapter> - <Symptom>"       — Head, Eyes, Ears, Nose, Face, Mouth, Throat, Stomach, Abdomen, Rectum, Bladder, Genitals, Chest, Back, Extremities, Skin, Sleep, Fever, Cough… Format: location + sensation + modality.

## CRITICAL RULES
1. Only extract what is EXPLICITLY stated in the Q&A or lab text. NO hallucination, NO inference beyond direct phrasing.
2. Don't extract normal/healthy behaviors ("sleeps 8 hours" is not a symptom).
3. Use Complete Repertory format — "Mind - X", "Generalities - Y", "Chapter - Z".
4. Include modality only when the patient mentioned it.
5. Each clinical concept emitted ONCE — no duplicates.
6. Combine qualities of the same symptom into ONE rubric, never multiple.
7. No punctuation- or word-order-only duplicates.
8. Don't emit BOTH a shorter and longer variant — keep only the most specific.
9. Triggers belong WITH the body-part rubric, not under Generalities ("Back - Pain, from lifting" not "Generalities - Lifting").
10. Combine related modalities into ONE rubric ("worse motion, better rest" → "Back - Pain, worse motion, better rest").
11. Each entry must be a SHORT phrase under 14 words.

## MODE BUCKETING HINT (${mode.toUpperCase()}) — describes WHERE present symptoms go, NOT what to invent
${MODE_HINT[mode]}${labBlock}${mergeRule}

## OUTPUT FORMAT (STRICT JSON)
Return ONLY raw JSON — no markdown, no prose. Schema:
{ "mental": [string], "physical": [string], "particular": [string] }
If nothing extractable: { "mental": [], "physical": [], "particular": [] }`;

    const userPrompt = isLabOnly
      ? `LAB REPORT TEXT (the ONLY source you are allowed to extract from):
"""
${labContext}
"""${(existing.mental.length || existing.physical.length || existing.particular.length) ? `

EXISTING SYMPTOMS (already on the panel — keep, do not re-emit):
${JSON.stringify(existing, null, 2)}` : ''}

TASK: Extract rubrics ONLY for abnormal lab values that are explicitly listed above. If a value isn't there, don't emit a rubric for it. If no abnormalities are listed, return empty arrays. Reply with ONLY the JSON.`
      : `THE ONLY SOURCE YOU ARE ALLOWED TO EXTRACT FROM is the conversation below.
Do NOT add anything that is not literally in these two lines. Empty answer = empty arrays.

Doctor's Question: "${question || ''}"
Patient's Answer: "${answer || ''}"${labContext ? `

LAB REPORT TEXT (also a valid source — only abnormal values):
"""
${labContext}
"""` : ''}${(existing.mental.length || existing.physical.length || existing.particular.length) ? `

EXISTING SYMPTOMS (already on the panel — keep, only update if new Q&A adds explicit detail):
${JSON.stringify(existing, null, 2)}` : ''}

Reminder before you answer:
- Every rubric must trace back to a phrase in the Patient's Answer (or the lab text).
- If the Patient's Answer is short or non-medical, MOST FIELDS should be empty arrays.
- Do NOT add mental symptoms unless emotional/mental content is mentioned.
- Do NOT use the mode hint as a checklist — only as a placement guide for symptoms that ARE present.

Reply with ONLY the JSON object.`;

    const response = await chain.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 512,
      responseFormat: 'json',
      useCache: false, // each Q&A pair is a unique extraction call
    });

    const parsed = extractJson<{ mental?: string[]; physical?: string[]; particular?: string[] }>(response.content);
    if (!parsed) { sendSuccess(res, existing); return; }

    // ── Token-set subset dedup ──
    // Smarter than plain string-match — handles word-order & rephrasings.
    const normalize = (s: string) => s.toLowerCase().replace(/[.,;:!?()\[\]"']/g, ' ').replace(/\s+/g, ' ').trim();
    const tokenSet = (s: string) => new Set(normalize(s).split(' ').filter(Boolean));
    const isSubsetOf = (a: Set<string>, b: Set<string>) => {
      if (a.size === 0 || a.size >= b.size) return false;
      for (const t of a) if (!b.has(t)) return false;
      return true;
    };

    // Stage 1 — within the incoming list keep the most specific variant.
    // Stage 2 — drop incoming entries that are subsets of existing entries.
    const dedupAgainst = (incoming: string[], existingList: string[]): string[] => {
      const sets = incoming.map(s => ({ s, t: tokenSet(s) }));
      const stage1: typeof sets = [];
      for (const cand of sets) {
        let dominated = false;
        for (let i = stage1.length - 1; i >= 0; i--) {
          const kept = stage1[i];
          if (!kept) continue;
          if (isSubsetOf(cand.t, kept.t)) { dominated = true; break; }
          if (isSubsetOf(kept.t, cand.t)) stage1.splice(i, 1);
        }
        if (!dominated) stage1.push(cand);
      }
      const existingSets = existingList.map(s => tokenSet(s));
      return stage1
        .filter(c => !existingSets.some(es => isSubsetOf(c.t, es)))
        .map(c => c.s);
    };

    const mergedMental     = [...existing.mental,     ...dedupAgainst(Array.isArray(parsed.mental)     ? parsed.mental     : [], existing.mental)];
    const mergedPhysical   = [...existing.physical,   ...dedupAgainst(Array.isArray(parsed.physical)   ? parsed.physical   : [], existing.physical)];
    const mergedParticular = [...existing.particular, ...dedupAgainst(Array.isArray(parsed.particular) ? parsed.particular : [], existing.particular)];

    sendSuccess(res, {
      mental: mergedMental,
      physical: mergedPhysical,
      particular: mergedParticular,
    });
  } catch (err) { next(err); }
});

// POST /api/ai/case/summary — Generate summary
aiRouter.post('/case/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.generateSummary(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/translate — Text translation
aiRouter.post('/translate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.translateText(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/suggest/questions — Mode-aware case-taking question generator.
// Matches the Ai-Consultation question-suggestion engine: 5 questions per call,
// mode-specific rubrics, ephemeral-cached system prompt, deterministic temp.
//
// Input from web: { consultationMode, transcript, answeredQuestions, chiefComplaint, patientAge, patientGender }
// Output: { questions: [{ question, category, alternates, options? }], consultationMode }
aiRouter.post('/suggest/questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      consultationMode = 'acute',
      transcript = '',
      answeredQuestions = [],
      chiefComplaint = '',
      patientAge,
      patientGender,
    } = req.body ?? {};

    // ── Diagnostic ──
    // If two patients with different chief complaints get the same questions,
    // the most common cause is that chiefComplaint is empty in the request
    // body. Print exactly what came in so we can rule that out fast.
    logger.info(
      {
        consultationMode,
        chiefComplaint: chiefComplaint || '(empty)',
        chiefComplaintLength: (chiefComplaint || '').length,
        transcriptLength: (transcript || '').length,
        answeredCount: Array.isArray(answeredQuestions) ? answeredQuestions.length : 0,
        patientAge: patientAge ?? null,
        patientGender: patientGender ?? null,
      },
      '[suggest/questions] incoming request',
    );

    const chain = getAiProviderChain();
    const mode = (consultationMode || 'acute') as 'acute' | 'chronic' | 'followup';

    // Mode-specific rubrics — verbatim from the spec so the model gets the
    // same depth of guidance the reference implementation provides.
    const MODE_DIRECTIVES: Record<typeof mode, string> = {
      acute: `MODE: ACUTE
Focus on the immediate presenting complaint. Pace is rapid; pull out characterizing peculiars in 5 questions.

Required dimensions to cover (cycle through them across the 5 questions):
1. Nature of pain/sensation. Always include structured options like ["A) Stiffness","B) Sharp/Stabbing","C) Dull/Aching","D) Bruised/Sore"].
2. Effect of motion / position (worse from movement vs rest, specific positions).
3. Relief factors (warmth, cold, pressure, hot bath, lying still). Provide structured options where natural.
4. Time / modalities (worse 3am, evening, after eating, during menses, weather).
5. Concomitants (accompanying symptoms — nausea with headache, restlessness with chill, sweat character).

Tone: clipped, clinical, fast. Patients in acute distress have low patience.`,

      chronic: `MODE: CHRONIC
This is a deep constitutional case-taking. Across 5 questions, sample broadly from the 10-point rubric below:

1. Location & sensation (with radiation pattern).
2. Onset & causation (sedentary work, injury, pregnancy, emotional grief, suppression of prior symptoms).
3. Modalities — worse from / better from (motion, rest, weather, time of day, foods).
4. Time & periodicity (3-5 AM aggravation, weather changes, full moon, menses, anniversary reactions).
5. Concomitants (any pattern of symptoms appearing together).
6. Generalities (thermal preference HOT/CHILLY/AMBITHERMAL, thirst — quantity & temperature, food cravings/aversions, sleep position/restlessness, perspiration map).
7. Mental/Emotional (Responsibility, Fastidiousness, Anticipation, Grief, Anger, Indignation — these point to specific remedies: Carcinosin, Nat-mur, Arsenicum, Ignatia, Staphysagria).
8. Past history (suppressions, vaccinations, miasmatic background — Psora/Sycosis/Syphilis/Tubercular).
9. Red flags (sudden weight loss, hemoptysis, melena, neuro deficits).
10. Previous treatment (allopathic, homeopathic — what worked, what aggravated).

Tone: spacious, exploratory. The patient should feel heard, not interrogated.`,

      followup: `MODE: FOLLOW-UP
Hering's Law of Cure orientation. The 5 questions should evaluate response to the previous prescription:

1. Improvement % (0-100). Always include structured options like ["A) 0-25%","B) 25-50%","C) 50-75%","D) 75-100%"].
2. Change in nature/character of the chief complaint (intensity, frequency, quality).
3. Modalities re-check (have worse-from / better-from triggers shifted? sometimes the remedy changes the modality, signalling a deeper shift).
4. General well-being (sleep, energy, appetite, mood, sense of well-being independent of the chief complaint).
5. NEW symptoms emerging (note any — could be proving / re-emergence of suppressed symptoms / shift to a deeper layer).
6. Direction of Cure check — Hering's Law: Above downward (head→legs)? Inside outward (organs→skin)? Reverse order of appearance? Important for clinical decision.
7. Aggravation history (initial homeopathic aggravation? duration? severity?).
8. Remedy action timeline — when did improvement start, when did it plateau, has there been relapse?
9. Red flags (any new alarming symptoms requiring referral).
10. Clinical decision indicators — should the doctor WAIT, REPEAT same potency, INCREASE potency, or change remedy?

Tone: evaluative, calibrating. Frame questions to elicit precise clinical signals, not vague reassurance.`,
    };

    const ccTrim = String(chiefComplaint || '').trim();
    const ageGenderLine = [patientAge ? `Age ${patientAge}` : '', patientGender || ''].filter(Boolean).join(', ');

    // ── System prompt — chief complaint moved here so Claude weights it as
    // the highest-priority instruction. The model gives FAR more attention to
    // the system message than to anything inside the user message.
    const systemPrompt = `You are a senior homeopathic physician conducting a high-fidelity case-taking session for a SPECIFIC patient.

${ccTrim
  ? `THE PATIENT'S CHIEF COMPLAINT IS: "${ccTrim}"${ageGenderLine ? ` (${ageGenderLine})` : ''}

This is THE only signal that matters. Every single question you generate must be directly about THIS specific complaint — its location, sensation, modality, time, trigger, mental dimension, or close differential. A doctor reading your 5 questions should be able to GUESS the chief complaint just by reading them.`
  : 'No chief complaint was provided. Generate 5 generic mode-appropriate opening questions.'}

DO NOT produce a generic case-taking template. DO NOT produce questions that could apply equally to a patient with backache, headache, asthma, or insomnia. EACH question must be rooted in the specific pathology / phenomenology of "${ccTrim || 'the presenting complaint'}".

MODE RUBRIC (use only as a placement guide for question categories — NOT as a checklist of topics to cover):
${MODE_DIRECTIVES[mode]}

RULES:
1. STRUCTURED OPTIONS — REQUIRED for any question with a discrete/finite answer space. At LEAST 3 of the 5 questions MUST include an "options" array.

   ── HARD RULES FOR OPTIONS ──
   (a) Each option MUST be a direct, plausible ANSWER to the specific question — not a generic list.
   (b) Options must be MUTUALLY EXCLUSIVE — the patient should pick exactly ONE.
   (c) 3 to 4 options per question (never fewer than 3, never more than 4).
   (d) Format every option as "A) ...", "B) ...", "C) ..." (capital letter + closing paren + space + answer text).
   (e) Each option text under 8 words. Plain English. No punctuation tricks.
   (f) The set of options must COVER the realistic answer space (include an "Other / Both / Neither" choice if the answer might fall outside the listed three).
   (g) Options must MATCH the question's question word:
       - "Where ..." → location options (Frontal, Temporal, Lower back, Right side …)
       - "When ..." → time options (Morning, 3-5 AM, After meals, At night …)
       - "What kind of ..." → quality options (Throbbing, Sharp, Dull, Burning …)
       - "What makes it worse ..." → modality options (Cold air, Motion, Stress, Eating …)
       - "How long ..." → duration options (Few hours, 1-3 days, Weeks, Months …)
       - "How severe ..." → severity options (Mild, Moderate, Severe, Disabling)
       - Yes/No questions → ONLY when the answer is genuinely binary; offer 3 options including a "Sometimes / Partial" middle choice.

   ── GOOD vs BAD EXAMPLES ──
   For "What kind of pain do you feel in your back?":
     ✓ GOOD: ["A) Stiffness","B) Sharp/stabbing","C) Dull/aching","D) Burning"]
     ✗ BAD : ["A) Yes","B) No"]                  (yes/no doesn't fit "what kind")
     ✗ BAD : ["A) Mild","B) Severe"]             (severity, not quality)
     ✗ BAD : ["A) Lower","B) Upper","C) Neck"]   (location, not quality)

   For "When does the cough get worse?":
     ✓ GOOD: ["A) Morning","B) Night","C) After meals","D) Cold air"]
     ✗ BAD : ["A) Mild","B) Moderate","C) Severe"]  (severity, not timing)

   For "Has the headache spread to other areas?":
     ✓ GOOD: ["A) No, stays localized","B) Spreads to neck","C) Spreads to shoulders","D) Whole head"]
     ✗ BAD : ["A) Yes","B) No"]  (provide finer granularity)

2. EXCLUSION: If transcript or answeredQuestions are provided, do NOT ask things already clearly answered.
3. EACH QUESTION must include 2 alternates — simpler conversational rephrasings.
4. NO GENERIC TEMPLATES. If a question doesn't reference the chief complaint or its phenomenology, REWRITE IT.

Output ONLY valid raw JSON (no prose, no markdown fences):
{
  "questions": [
    {
      "question": "string — anchored to the chief complaint above",
      "category": "symptom" | "modality" | "mental" | "general" | "history" | "followup",
      "options": ["A) ...", "B) ...", "C) ..."],
      "alternates": ["rephrasing 1", "rephrasing 2"]
    }
  ]
}

FINAL CHECKS before emitting JSON (re-read your output and fix if any fail):
  • Does each question literally reference the chief complaint (or its anatomy/sensation/timing)? If not, REWRITE.
  • For each question with "options", do the options DIRECTLY answer the question's question-word? If a "where" question has yes/no options, REWRITE the options.
  • Are options mutually exclusive (patient picks exactly one)?
  • Is each option formatted as "A) ...", "B) ...", "C) ..." with a capital letter and a closing paren?
  • At least 3 of 5 questions MUST have a non-empty options array.`;

    const userPrompt = `Generate the next 5 ${mode.toUpperCase()} consultation questions for the patient described in the system prompt above.${
      transcript && transcript.length > 0
        ? `\n\nConversation so far (already-asked context — avoid repeating):\n${String(transcript).slice(-3000)}`
        : ''
    }${
      Array.isArray(answeredQuestions) && answeredQuestions.length
        ? `\n\nAlready-asked questions (DO NOT repeat verbatim):\n${answeredQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
        : ''
    }

Output the JSON now. Anchor every question to "${ccTrim || 'the chief complaint'}" — no generic case-taking templates.`;

    const response = await chain.complete({
      systemPrompt,
      userPrompt,
      // Bump from 0.2 → 0.5 so the same chief complaint can still produce a
      // fresh phrasing each round; the rubric guidance keeps clinical quality
      // consistent without making questions identical patient-to-patient.
      temperature: 0.5,
      maxTokens: 4000,
      responseFormat: 'json',
      // Critical: never serve a cached response here. Two patients with the
      // same chief complaint or two consecutive triggers in the same visit
      // were collapsing to one cached set of 5 questions — that's the
      // "same hardcoded questions" symptom.
      useCache: false,
    });

    const parsed = extractJson<any>(response.content);
    let questions: any[] = [];
    if (Array.isArray(parsed?.questions)) questions = parsed.questions;
    else if (Array.isArray(parsed)) questions = parsed;

    // Server-side option validator/normalizer.
    // Goals: format every option as "A) text", drop blanks, dedupe, ensure
    // 3–4 options. If fewer than 3 valid options remain, drop the options
    // array entirely (the UI will render the question as open-ended).
    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const cleanOption = (raw: string): string => {
      let s = String(raw).trim();
      // Strip any leading "A)", "A.", "(A)", "1.", "1)", "- ", "• "
      s = s.replace(/^[\s ]*[\(\[]?\s*[A-Fa-f0-9]\s*[\)\].\-:]\s*/, '');
      s = s.replace(/^[\s ]*[\-•\*]\s+/, '');
      return s.trim();
    };

    const normalizeOptions = (rawOpts: unknown): string[] | undefined => {
      let arr: string[] = [];
      if (Array.isArray(rawOpts)) {
        arr = rawOpts
          .map((o: any) => (typeof o === 'string' ? o : (o?.label || o?.text || o?.value || '')))
          .filter((s: string) => typeof s === 'string' && s.trim().length > 0);
      } else if (typeof rawOpts === 'string' && rawOpts.trim()) {
        arr = rawOpts.split(/\n|;|\|/).map((s: string) => s.trim()).filter(Boolean);
      }
      // Strip any model-supplied prefix, dedupe (case-insensitive), keep first 4.
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const o of arr) {
        const text = cleanOption(o);
        if (!text || text.length > 80) continue;     // sanity bound
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleaned.push(text);
        if (cleaned.length >= 4) break;
      }
      // Need at least 3 distinct options to be meaningful; otherwise drop.
      if (cleaned.length < 3) return undefined;
      // Re-letter consistently A) B) C) D)
      return cleaned.map((text, i) => `${LETTERS[i]}) ${text}`);
    };

    const normalized = questions.slice(0, 5).map((q: any) => ({
      question: String(q.question || q.q || '').trim(),
      category: ['symptom', 'modality', 'mental', 'general', 'history', 'followup'].includes(q.category) ? q.category : (q.c || 'symptom'),
      alternates: Array.isArray(q.alternates)
        ? q.alternates.map((a: any) => String(a).trim()).filter(Boolean).slice(0, 2)
        : [],
      options: normalizeOptions(q.options),
    })).filter((q) => q.question);

    sendSuccess(res, { questions: normalized, consultationMode: mode });
  } catch (err) { next(err); }
});

// POST /api/ai/parse-lab-report — Lab OCR
aiRouter.post('/parse-lab-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.parseLabReport(getTenant(req), getUserId(req), req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /api/ai/rubrics/kent-search — Kent Repertory search
aiRouter.get('/rubrics/kent-search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uc = getConsultationUseCase();
    const result = await uc.searchKentRubrics(String(req.query.q || ''));
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /api/ai/feedback — Doctor feedback on AI suggestion
aiRouter.post('/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info({ tenantId: getTenant(req), feedback: req.body }, 'AI feedback recorded');
    sendSuccess(res, { recorded: true });
  } catch (err) { next(err); }
});
