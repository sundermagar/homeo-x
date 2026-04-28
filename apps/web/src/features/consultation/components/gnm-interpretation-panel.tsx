import { useState, useRef, useEffect } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Zap,
  Layers,
  Heart,
  Stethoscope,
  ClipboardList,
  Trophy,
  CheckSquare,
  Sparkles,
  Plus,
} from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { RubricRepertory } from './rubric-repertory';
import type { GnmAnalysis, SuggestedRubric } from '../../../types/ai';

// ─── Collapsible Card Wrapper ───

function CollapsibleCard({
  id,
  icon: Icon,
  title,
  iconColor,
  borderColor,
  visible,
  defaultOpen = true,
  badge,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  iconColor: string;
  borderColor: string;
  visible: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!visible) return null;

  return (
    <Card
      id={`gnm-${id}`}
      className={`rounded-xl border ${borderColor} shadow-sm overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/10 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {title}
          </span>
          {badge}
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {open && (
        <CardContent className="p-4 animate-in fade-in duration-300">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Props ───

interface GnmInterpretationPanelProps {
  // SOAP fields (editable)
  subjective: string;
  onSubjectiveChange: (val: string) => void;
  assessment: string;
  onAssessmentChange: (val: string) => void;
  clinicalNotes: string;
  onClinicalNotesChange: (val: string) => void;

  // GNM data (AI-generated)
  gnmAnalysis: GnmAnalysis | null;

  // Rubrics
  visitId: string;
  onAutoSuggestRemedy?: (remedyName: string, potencies: string[]) => void;
  initialRubrics?: SuggestedRubric[];

  // Remedy action
  onApplyGnmRemedy?: (remedyName: string, potency: string) => void;

  // Advice
  onCopyToAdvice?: (text: string) => void;
}

// ─── Match Strength Badge ───

function MatchBadge({ strength }: { strength: string }) {
  const colors: Record<string, string> = {
    strongest: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    strong: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors[strength] || colors.moderate}`}>
      {strength.charAt(0).toUpperCase() + strength.slice(1)} Match
    </span>
  );
}

// ─── Main Component ───

export function GnmInterpretationPanel({
  subjective,
  onSubjectiveChange,
  assessment,
  onAssessmentChange,
  clinicalNotes,
  onClinicalNotesChange,
  gnmAnalysis,
  visitId,
  onAutoSuggestRemedy,
  initialRubrics,
  onApplyGnmRemedy,
  onCopyToAdvice,
}: GnmInterpretationPanelProps) {
  const subjectiveRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  };

  useEffect(() => { autoResize(subjectiveRef); }, [subjective]);
  useEffect(() => { autoResize(notesRef); }, [clinicalNotes]);

  const hasGnm = !!gnmAnalysis;

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* ═══ 1. SYMPTOMS (always visible, editable) ═══ */}
      <CollapsibleCard
        id="symptoms"
        icon={Activity}
        title="Symptoms"
        iconColor="text-indigo-500"
        borderColor="border-gray-200 dark:border-gray-800"
        visible={true}
        badge={
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter cursor-default">
            • Symptoms • Duration • Red Flags
          </span>
        }
      >
        <Textarea
          ref={subjectiveRef}
          value={subjective}
          onChange={(e) => onSubjectiveChange(e.target.value)}
          className="text-[14px] font-medium border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 overflow-hidden resize-none leading-relaxed placeholder:text-gray-300 text-gray-800 dark:text-gray-200"
          placeholder="Enter symptoms here..."
        />
      </CollapsibleCard>

      {/* ═══ 2. CORE CONFLICT (AI, auto-appears) ═══ */}
      <CollapsibleCard
        id="core-conflict"
        icon={Zap}
        title="Core Conflict"
        iconColor="text-purple-500"
        borderColor="border-purple-200 dark:border-purple-800/50"
        visible={hasGnm}
        badge={
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-bold">
            GNM
          </span>
        }
      >
        {gnmAnalysis?.coreConflict && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Conflict Type</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                  {gnmAnalysis.coreConflict.conflictType}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Affected Tissue</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {gnmAnalysis.coreConflict.affectedTissue}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Biological Meaning</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {gnmAnalysis.coreConflict.biologicalMeaning}
              </p>
            </div>
            {gnmAnalysis.coreConflict.triggerEvents.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Trigger Events</p>
                <div className="flex flex-wrap gap-1.5">
                  {gnmAnalysis.coreConflict.triggerEvents.map((event, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium border border-purple-100 dark:border-purple-800/40"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* ═══ 3. CONFLICT PHASES (AI, auto-appears) ═══ */}
      <CollapsibleCard
        id="conflict-phases"
        icon={Layers}
        title="Conflict Phases"
        iconColor="text-orange-500"
        borderColor="border-orange-200 dark:border-orange-800/50"
        visible={hasGnm}
      >
        {gnmAnalysis?.phases && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-3">
                <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider mb-1">🔴 Conflict Active</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {gnmAnalysis.phases.conflictActive}
                </p>
              </div>
              <div className="rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/10 p-3">
                <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider mb-1">🟢 Healing Phase</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {gnmAnalysis.phases.healingPhase}
                </p>
              </div>
            </div>
            {gnmAnalysis.phases.isRecurrentTrack && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ⚠️ Recurrent Track Conflict
                  {gnmAnalysis.phases.trackTriggers?.length > 0 &&
                    ` — re-triggered by: ${gnmAnalysis.phases.trackTriggers.join(', ')}`}
                </p>
              </div>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* ═══ 4. HOMEOPATHIC TOTALITY (AI, auto-appears) ═══ */}
      <CollapsibleCard
        id="totality"
        icon={Heart}
        title="Homeopathic Totality"
        iconColor="text-pink-500"
        borderColor="border-pink-200 dark:border-pink-800/50"
        visible={hasGnm}
      >
        {gnmAnalysis?.homeopathicTotality && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Mental / Emotional</p>
              <div className="flex flex-wrap gap-1.5">
                {gnmAnalysis.homeopathicTotality.mentalEmotional.map((trait, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-800/40"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Physical Generals</p>
              <div className="flex flex-wrap gap-1.5">
                {gnmAnalysis.homeopathicTotality.physicalGenerals.map((gen, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium border border-green-100 dark:border-green-800/40"
                  >
                    {gen}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* ═══ 5. DIAGNOSIS (always visible, editable) ═══ */}
      <CollapsibleCard
        id="diagnosis"
        icon={Stethoscope}
        title="Diagnosis"
        iconColor="text-emerald-500"
        borderColor="border-gray-200 dark:border-gray-800"
        visible={true}
      >
        <Input
          value={assessment}
          onChange={(e) => onAssessmentChange(e.target.value)}
          className="text-xl font-black border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-gray-300 text-gray-900 dark:text-white"
          placeholder="Final diagnosis..."
        />
      </CollapsibleCard>

      {/* ═══ 6. CLINICAL NOTES (always visible, editable) ═══ */}
      <CollapsibleCard
        id="clinical-notes"
        icon={ClipboardList}
        title="Clinical Notes"
        iconColor="text-amber-500"
        borderColor="border-gray-200 dark:border-gray-800"
        visible={true}
      >
        <Textarea
          ref={notesRef}
          value={clinicalNotes}
          onChange={(e) => onClinicalNotesChange(e.target.value)}
          className="text-[14px] border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 overflow-hidden resize-none leading-relaxed placeholder:text-gray-200 text-gray-700 dark:text-gray-300"
          placeholder="Notes..."
        />
      </CollapsibleCard>

      {/* ═══ 7. RUBRICS + REPERTORIZATION (always visible) ═══ */}
      <RubricRepertory
        visitId={visitId}
        onAutoSuggestRemedy={onAutoSuggestRemedy}
        initialRubrics={initialRubrics}
      />

      {/* ═══ 8. RANKED REMEDIES (AI, auto-appears after scoring) ═══ */}
      <CollapsibleCard
        id="ranked-remedies"
        icon={Trophy}
        title="Clinical Ranking"
        iconColor="text-yellow-500"
        borderColor="border-yellow-200 dark:border-yellow-800/50"
        visible={hasGnm && (gnmAnalysis?.rankedRemedies?.length ?? 0) > 0}
        badge={
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 font-bold">
            GNM + Classical
          </span>
        }
      >
        {gnmAnalysis?.rankedRemedies && (
          <div className="space-y-2">
            {gnmAnalysis.rankedRemedies.map((remedy, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const borderColors = [
                'border-yellow-300 dark:border-yellow-700',
                'border-gray-300 dark:border-gray-600',
                'border-orange-300 dark:border-orange-700',
              ];
              return (
                <div
                  key={i}
                  className={`rounded-lg border ${borderColors[i] || 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-900 p-3 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{medals[i] || `#${remedy.rank}`}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {remedy.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {remedy.suggestedPotency}
                      </span>
                      <MatchBadge strength={remedy.matchStrength} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 text-teal-600 border-teal-200 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30"
                      onClick={() => onApplyGnmRemedy?.(remedy.name, remedy.suggestedPotency)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      Apply to Rx
                    </Button>
                  </div>
                  {remedy.keynotes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {remedy.keynotes.map((k, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  {remedy.whenToUse && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                      When: {remedy.whenToUse}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleCard>

      {/* ═══ 9. RESOLUTION STRATEGY (AI, auto-appears) ═══ */}
      <CollapsibleCard
        id="resolution"
        icon={CheckSquare}
        title="Resolution Strategy"
        iconColor="text-teal-500"
        borderColor="border-teal-200 dark:border-teal-800/50"
        visible={hasGnm}
        badge={
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-bold">
            GNM Healing
          </span>
        }
      >
        {gnmAnalysis?.resolutionStrategy && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {gnmAnalysis.resolutionStrategy.directions.map((dir, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700 dark:text-gray-300">{dir}</p>
                </div>
              ))}
            </div>
            {gnmAnalysis.resolutionStrategy.prognosis && (
              <div className="rounded-lg bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-800/40 px-3 py-2">
                <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mb-0.5">💡 Prognosis</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {gnmAnalysis.resolutionStrategy.prognosis}
                </p>
              </div>
            )}
            {onCopyToAdvice && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] text-teal-600 border-teal-200 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-800"
                onClick={() => {
                  const text = [
                    ...gnmAnalysis.resolutionStrategy.directions,
                    gnmAnalysis.resolutionStrategy.prognosis ? `Prognosis: ${gnmAnalysis.resolutionStrategy.prognosis}` : '',
                  ].filter(Boolean).join('\n');
                  onCopyToAdvice(text);
                }}
              >
                📋 Copy to Advice
              </Button>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* ═══ GNM Confidence ═══ */}
      {hasGnm && gnmAnalysis.confidence > 0 && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Sparkles className="h-3 w-3 text-purple-400" />
          <span className="text-[9px] text-gray-400 font-medium">
            GNM Analysis Confidence: {Math.round(gnmAnalysis.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
