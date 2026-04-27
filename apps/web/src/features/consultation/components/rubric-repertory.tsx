import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Brain,
  X,
  BarChart3,
  Check,
  RotateCcw,
  Plus,
  Type,
} from 'lucide-react';


import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useSearchKentRubrics } from '../../../hooks/use-rubrics';
import { toast } from '../../../hooks/use-toast';
import { useRepertorizeScore } from '../../../hooks/use-repertorization';
import type { SuggestedRubric } from '../../../types/ai';

// ─── Props ───

interface RubricRepertoryProps {
  visitId: string;
  onAutoSuggestRemedy?: (remedyName: string, potencies: string[]) => void;
  initialRubrics?: SuggestedRubric[];
  onRubricsChange?: (rubrics: SuggestedRubric[]) => void;
  onScoredRemediesChange?: (remedies: any[]) => void;
}


// ─── Selected rubric with importance ───

interface SelectedRubric {
  rubricId: string;
  description: string;
  category: 'MIND' | 'GENERAL' | 'PARTICULAR';
  chapter: string | null;
  importance: number; // 1-4
  source: 'manual' | 'ai' | 'both';
}

type RubricCategory = 'MIND' | 'GENERAL' | 'PARTICULAR';


const IMPORTANCE_LABELS: Record<number, string> = {
  1: 'Supporting',
  2: 'Moderate',
  3: 'Important',
  4: 'Eliminating',
};

const IMPORTANCE_COLORS: Record<number, string> = {
  1: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  4: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Component ───
export function RubricRepertory({
  visitId,
  onAutoSuggestRemedy,
  initialRubrics,
  onRubricsChange,
  onScoredRemediesChange,
}: RubricRepertoryProps) {

  const [expanded, setExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isRubricsExpanded, setIsRubricsExpanded] = useState(false);
  const [customRubricText, setCustomRubricText] = useState('');

  // Selected rubrics for repertorization
  const [selectedRubrics, setSelectedRubrics] = useState<Map<string, SelectedRubric>>(new Map());

  // AI extraction state
  const lastExtractionKeyRef = useRef<string>('');


  // Queries & mutations
  const { data: kentResults, isLoading: kentLoading, isFetching: kentFetching } = useSearchKentRubrics(debouncedSearch);
  const scoreMutation = useRepertorizeScore();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Case Summary state (Removed)
  const [clinicalFindings, setClinicalFindings] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);

  // ─── Reset state on visitId change ───
  useEffect(() => {
    setSelectedRubrics(new Map());
    lastExtractionKeyRef.current = '';
    setClinicalFindings([]);
    setObservations([]);
    setIsRubricsExpanded(false);
  }, [visitId]);

  // ─── AI Extraction: Synchronize with Props from external analysis ───
  const lastReceivedFingerprint = useRef<string>('');

  useEffect(() => {
    if (!initialRubrics || initialRubrics.length === 0) return;

    const fingerprint = initialRubrics.map(r => `${r.rubricId}-${r.importance}`).sort().join('|');
    if (fingerprint === lastReceivedFingerprint.current) return;
    lastReceivedFingerprint.current = fingerprint;

    setSelectedRubrics((prev) => {
      // Keep manual ones, but replace/merge AI ones from the new initialRubrics
      const next = new Map();
      prev.forEach((val, key) => {
        if (val.source === 'manual') {
          next.set(key, val);
        }
      });

      for (const suggested of initialRubrics) {
        const existing = next.get(suggested.rubricId);
        if (existing) {
          existing.source = 'both';
          existing.importance = Math.max(existing.importance, suggested.importance);
        } else {
          next.set(suggested.rubricId, {
            rubricId: suggested.rubricId,
            description: suggested.description,
            category: suggested.category as any,
            chapter: suggested.chapter,
            importance: suggested.importance,
            source: 'ai',
          });
        }
      }
      return next;
    });

    toast({
      title: 'Rubrics Updated',
      description: `Loaded ${initialRubrics.length} rubrics for this case.`,
      variant: 'success'
    });
  }, [initialRubrics]);

  // ─── Case Summary Sync ─── (Removed local state, now uses props)

  // ─── Rubric Selection Handlers ───

  const removeSelectedRubric = useCallback((rubricId: string) => {
    setSelectedRubrics((prev) => {
      const next = new Map(prev);
      next.delete(rubricId);
      return next;
    });
  }, []);

  const updateImportance = useCallback((rubricId: string, importance: number) => {
    setSelectedRubrics((prev) => {
      const next = new Map(prev);
      const entry = next.get(rubricId);
      if (entry) {
        entry.importance = importance;
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedRubrics(new Map());
    lastExtractionKeyRef.current = '';
    setClinicalFindings([]);
    setObservations([]);
    setIsRubricsExpanded(false);
    toast({ title: 'Repertory Reset', description: 'All rubrics and extractions cleared.', variant: 'default' });
  }, []);

  // ─── Add Custom Free-Text Rubric ───
  const handleAddCustomRubric = useCallback(() => {
    const text = customRubricText.trim();
    if (!text) return;

    // Auto-detect category from the text
    const lower = text.toLowerCase();
    let category: RubricCategory = 'PARTICULAR';
    let chapter = 'Unknown';
    if (lower.startsWith('mind')) { category = 'MIND'; chapter = 'Mind'; }
    else if (lower.startsWith('general')) { category = 'GENERAL'; chapter = 'Generalities'; }
    else if (lower.startsWith('head')) { chapter = 'Head'; }
    else if (lower.startsWith('chest')) { chapter = 'Chest'; }
    else if (lower.startsWith('stomach') || lower.startsWith('abdomen')) { chapter = 'Stomach'; }
    else if (lower.startsWith('back')) { chapter = 'Back'; }
    else if (lower.startsWith('skin')) { chapter = 'Skin'; }
    else if (lower.startsWith('sleep')) { chapter = 'Sleep'; }
    else if (lower.startsWith('extremit')) { chapter = 'Extremities'; }
    else if (lower.startsWith('eye')) { chapter = 'Eye'; }
    else if (lower.startsWith('ear')) { chapter = 'Ear'; }
    else if (lower.startsWith('nose')) { chapter = 'Nose'; }
    else if (lower.startsWith('throat') || lower.startsWith('larynx')) { chapter = 'Throat'; }
    else if (lower.startsWith('rectum') || lower.startsWith('stool')) { chapter = 'Rectum'; }
    else if (lower.startsWith('urin') || lower.startsWith('bladder') || lower.startsWith('kidney')) { chapter = 'Urinary'; }
    else if (lower.startsWith('female') || lower.startsWith('male') || lower.startsWith('genital')) { chapter = 'Genitalia'; }
    else if (lower.startsWith('fever')) { chapter = 'Fever'; }
    else if (lower.startsWith('perspir') || lower.startsWith('sweat')) { chapter = 'Perspiration'; }

    const rubricId = `custom-rubric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setSelectedRubrics((prev) => {
      const next = new Map(prev);
      next.set(rubricId, {
        rubricId,
        description: text,
        category,
        chapter,
        importance: 2,
        source: 'manual',
      });
      return next;
    });

    setCustomRubricText('');
    setIsRubricsExpanded(true);
    toast({ title: 'Custom Rubric Added', description: text, variant: 'success' });
  }, [customRubricText]);

  // ─── Repertorization (scoring) ───

  // ─── Auto-Repertorization (scoring) ───

  const rubricsFingerprint = useMemo(
    () => Array.from(selectedRubrics.values())
      .map(r => `${r.rubricId}:${r.importance}`)
      .sort()
      .join('|'),
    [selectedRubrics]
  );

  useEffect(() => {
    if (!rubricsFingerprint) {
      return;
    }

    const rubricArray = Array.from(selectedRubrics.values()).map((r) => ({
      rubricId: r.rubricId,
      description: r.description,
      category: r.category,
      chapter: r.chapter || '',
      importance: r.importance,
    }));

    scoreMutation.mutate(
      { selectedRubrics: rubricArray },
      {
        onSuccess: (result) => {
          if (onScoredRemediesChange && result.scoredRemedies) {
            onScoredRemediesChange(result.scoredRemedies);
          }
          // Auto-suggest the top remedy to the prescription draft
          if (result.scoredRemedies.length > 0) {
            const bestRemedy = result.scoredRemedies[0];
            onAutoSuggestRemedy?.(bestRemedy.remedyName, bestRemedy.commonPotencies);
          }
        },
      },
    );
  }, [rubricsFingerprint, observations, clinicalFindings]);

  // Sync with parent when rubrics change
  const lastEmittedFingerprint = useRef<string>('');

  useEffect(() => {
    if (onRubricsChange) {
      const array = Array.from(selectedRubrics.values()).map(r => ({
        rubricId: r.rubricId,
        description: r.description,
        category: r.category as 'MIND' | 'GENERAL' | 'PARTICULAR',
        chapter: r.chapter || null,
        importance: r.importance,
        source: r.source,
        confidence: 100,
        remedyCount: 0,
      } as SuggestedRubric));
      
      const fingerprint = array.map(r => `${r.rubricId}-${r.importance}`).sort().join('|');
      if (fingerprint !== lastEmittedFingerprint.current) {
        lastEmittedFingerprint.current = fingerprint;
        onRubricsChange(array);
      }
    }
  }, [selectedRubrics, onRubricsChange]);

  // ─── Differential toggle ───

  const selectedArray = useMemo(() => Array.from(selectedRubrics.values()), [selectedRubrics]);

  return (
    <Card id="section-rubrics">
      <CardContent className="px-4 py-3 space-y-3">
        {/* ─── Header ─── */}
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Repertory
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
              Repertorization
            </span>
            {selectedRubrics.size > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-medium">
                {selectedRubrics.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!expanded && selectedRubrics.size > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-medium whitespace-nowrap">
                {selectedRubrics.size} active
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-1 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors group"
              title="Reset Repertory"
            >
              <RotateCcw className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-500" />
            </button>
            <ChevronRight
              className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
        </button>

        {expanded && (
          <>
            {/* ════════════════════════════════════════════
                SECTION 2: Manual Rubric Browser (multi-select)
                ════════════════════════════════════════════ */}
            <div className="space-y-3">
              {/* ─── Repertory AI Search ─── */}
              <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-950 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Search Repertory</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">AI-Powered</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search any symptom e.g. "jealousy", "headache worse motion", "fear of dark"...'
                    className="h-9 text-xs pl-8"
                  />
                </div>

                {/* Results */}
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {!debouncedSearch ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      <BookOpen className="h-5 w-5 mx-auto mb-2 text-gray-300" />
                      Type a symptom keyword to search the repertory
                    </div>
                  ) : kentLoading || kentFetching ? (
                    <div className="p-4 text-center text-xs text-purple-500 animate-pulse">
                      <Brain className="h-5 w-5 mx-auto mb-2 animate-bounce" />
                      Searching repertory for "{debouncedSearch}"...
                    </div>
                  ) : !kentResults || kentResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      No rubrics found for "{debouncedSearch}"
                    </div>
                  ) : (
                    kentResults.map((rubric) => {
                      const isSelected = selectedRubrics.has(rubric.rubricId);
                      return (
                        <button
                          key={rubric.rubricId}
                          type="button"
                          onClick={() => {
                            setSelectedRubrics((prev) => {
                              const next = new Map(prev);
                              if (next.has(rubric.rubricId)) {
                                next.delete(rubric.rubricId);
                              } else {
                                next.set(rubric.rubricId, {
                                  rubricId: rubric.rubricId,
                                  description: rubric.description,
                                  category: rubric.category as RubricCategory,
                                  chapter: rubric.chapter,
                                  importance: rubric.importance,
                                  source: 'manual',
                                });
                                setIsRubricsExpanded(true);
                              }
                              return next;
                            });
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/30 border-l-2 border-purple-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${
                              isSelected ? 'font-medium text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {rubric.description}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {rubric.chapter} · {rubric.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              rubric.importance >= 4 ? 'bg-red-100 text-red-700' :
                              rubric.importance >= 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {IMPORTANCE_LABELS[rubric.importance] || 'Moderate'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              ~{rubric.remedyCount}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ─── Custom Rubric Input (Free-Text Fallback) ─── */}
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Type className="h-3 w-3 text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Or type a custom rubric manually</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customRubricText}
                    onChange={(e) => setCustomRubricText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRubric(); } }}
                    placeholder="e.g. Mind - Jealousy - morning"
                    className="h-7 text-[11px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRubric}
                    disabled={!customRubricText.trim()}
                    className="h-7 px-2.5 rounded-md bg-gray-600 text-white text-[10px] font-bold hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════
                SECTION 3: Selected Rubrics (Collapsible)
                ════════════════════════════════════════════ */}
            {selectedArray.length > 0 && (
              <div className="border border-purple-100 dark:border-purple-900/30 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm mt-4 transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setIsRubricsExpanded(!isRubricsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg transition-colors ${scoreMutation.isPending ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-purple-50 text-purple-500'}`}>
                      <BarChart3 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                      Selected Rubrics ({selectedArray.length})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isRubricsExpanded && (
                      <div className="flex -space-x-1 overflow-hidden mr-2">
                        {selectedArray.slice(0, 3).map((r, i) => (
                          <div key={i} className="h-4 w-4 rounded-full border border-white dark:border-gray-950 bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-[8px] font-bold text-purple-600">
                            {r.description[0]}
                          </div>
                        ))}
                      </div>
                    )}
                    {isRubricsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                    )}
                  </div>
                </button>

                {isRubricsExpanded && (
                  <CardContent className="px-4 py-3 pt-0 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 border-t border-purple-50 dark:border-purple-900/20 mt-0">
                    <div className="pt-3 flex flex-wrap gap-1.5">
                      {selectedArray.map((rubric) => (
                        <div
                          key={rubric.rubricId}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-100 dark:border-purple-800 bg-white dark:bg-gray-900 px-2 py-1 shadow-sm hover:border-purple-300 transition-colors"
                        >
                          {/* Category badge */}
                          <span className="text-[8px] font-bold uppercase tracking-wide text-purple-500 dark:text-purple-400">
                            {rubric.category[0]}
                          </span>
                          {/* Description */}
                          <span className="text-[10px] text-gray-700 dark:text-gray-300 max-w-[120px] truncate font-medium">
                            {rubric.description}
                          </span>
                          {/* Importance buttons */}
                          <div className="flex gap-0.5 ml-1 border-l border-purple-100 dark:border-purple-800 pl-1.5">
                            {[1, 2, 3, 4].map((imp) => (
                              <button
                                key={imp}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateImportance(rubric.rubricId, imp);
                                }}
                                className={`w-3.5 h-3.5 rounded-full text-[7px] font-bold flex items-center justify-center transition-all ${
                                  imp <= rubric.importance
                                    ? IMPORTANCE_COLORS[rubric.importance] + ' scale-110 shadow-sm'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 hover:bg-gray-200'
                                }`}
                                title={IMPORTANCE_LABELS[imp]}
                              >
                                {imp}
                              </button>
                            ))}
                          </div>
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelectedRubric(rubric.rubricId);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1 p-0.5 hover:bg-red-50 rounded"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════
                SECTION 4: Scored Remedies & Differential Matrix (Hiden from UI as per user request)
                ════════════════════════════════════════════ */}
            {/* These were removed to reduce redundancy as the top remedy is auto-prescribed in the Remedy Plan */}

          </>
        )}
      </CardContent>
    </Card>
  );
}
