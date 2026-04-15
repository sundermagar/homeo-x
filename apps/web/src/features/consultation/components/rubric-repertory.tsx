import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BookOpen, Search, ChevronRight, ChevronDown, ChevronUp, Brain, X, BarChart3, Check, RotateCcw, Plus, Type } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useSearchKentRubrics } from '../../../hooks/use-rubrics';
import { toast } from '../../../hooks/use-toast';
import { useRepertorizeScore } from '../../../hooks/use-repertorization';
import type { SuggestedRubric } from '../../../types/ai';

interface RubricRepertoryProps { visitId: string; onAutoSuggestRemedy?: (remedyName: string, potencies: string[]) => void; initialRubrics?: SuggestedRubric[]; onRubricsChange?: (rubrics: SuggestedRubric[]) => void; onScoredRemediesChange?: (remedies: any[]) => void; }
interface SelectedRubric { rubricId: string; description: string; category: 'MIND' | 'GENERAL' | 'PARTICULAR'; chapter: string | null; importance: number; source: 'manual' | 'ai' | 'both'; }
type RubricCategory = 'MIND' | 'GENERAL' | 'PARTICULAR';

const IMPORTANCE_LABELS: Record<number, string> = { 1: 'Supporting', 2: 'Moderate', 3: 'Important', 4: 'Eliminating' };
const IMPORTANCE_STYLES: Record<number, React.CSSProperties> = {
  1: { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' },
  2: { background: '#DBEAFE', color: '#1E40AF' },
  3: { background: '#FFEDD5', color: '#9A3412' },
  4: { background: '#FEE2E2', color: '#7F1D1D' },
};

export function RubricRepertory({ visitId, onAutoSuggestRemedy, initialRubrics, onRubricsChange, onScoredRemediesChange }: RubricRepertoryProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isRubricsExpanded, setIsRubricsExpanded] = useState(false);
  const [customRubricText, setCustomRubricText] = useState('');
  const [selectedRubrics, setSelectedRubrics] = useState<Map<string, SelectedRubric>>(new Map());
  const lastExtractionKeyRef = useRef<string>('');
  const { data: kentResults, isLoading: kentLoading, isFetching: kentFetching } = useSearchKentRubrics(debouncedSearch);
  const scoreMutation = useRepertorizeScore();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 600); return () => clearTimeout(t); }, [searchTerm]);
  const [clinicalFindings, setClinicalFindings] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRubrics(new Map()); lastExtractionKeyRef.current = ''; setClinicalFindings([]); setObservations([]); setIsRubricsExpanded(false);
  }, [visitId]);

  const lastReceivedFingerprint = useRef<string>('');
  useEffect(() => {
    if (!initialRubrics || initialRubrics.length === 0) return;
    const fingerprint = initialRubrics.map(r => `${r.rubricId}-${r.importance}`).sort().join('|');
    if (fingerprint === lastReceivedFingerprint.current) return;
    lastReceivedFingerprint.current = fingerprint;
    setSelectedRubrics(prev => {
      const next = new Map();
      prev.forEach((val, key) => { if (val.source === 'manual') next.set(key, val); });
      for (const r of initialRubrics) {
        const ex = next.get(r.rubricId);
        if (ex) { ex.source = 'both'; ex.importance = Math.max(ex.importance, r.importance); }
        else next.set(r.rubricId, { rubricId: r.rubricId, description: r.description, category: r.category as any, chapter: r.chapter, importance: r.importance, source: 'ai' });
      }
      return next;
    });
    toast({ title: 'Rubrics Updated', description: `Loaded ${initialRubrics.length} rubrics for this case.`, variant: 'success' });
  }, [initialRubrics]);

  const removeSelectedRubric = useCallback((rubricId: string) => setSelectedRubrics(prev => { const next = new Map(prev); next.delete(rubricId); return next; }), []);
  const updateImportance = useCallback((rubricId: string, importance: number) => setSelectedRubrics(prev => { const next = new Map(prev); const e = next.get(rubricId); if (e) e.importance = importance; return next; }), []);
  const handleReset = useCallback(() => {
    setSelectedRubrics(new Map()); lastExtractionKeyRef.current = ''; setClinicalFindings([]); setObservations([]); setIsRubricsExpanded(false);
    toast({ title: 'Repertory Reset', description: 'All rubrics and extractions cleared.', variant: 'default' });
  }, []);

  const handleAddCustomRubric = useCallback(() => {
    const text = customRubricText.trim(); if (!text) return;
    const lower = text.toLowerCase();
    let category: RubricCategory = 'PARTICULAR', chapter = 'Unknown';
    if (lower.startsWith('mind')) { category = 'MIND'; chapter = 'Mind'; }
    else if (lower.startsWith('general')) { category = 'GENERAL'; chapter = 'Generalities'; }
    else if (lower.startsWith('head')) chapter = 'Head';
    else if (lower.startsWith('chest')) chapter = 'Chest';
    else if (lower.startsWith('stomach') || lower.startsWith('abdomen')) chapter = 'Stomach';
    else if (lower.startsWith('back')) chapter = 'Back';
    else if (lower.startsWith('skin')) chapter = 'Skin';
    else if (lower.startsWith('sleep')) chapter = 'Sleep';
    else if (lower.startsWith('extremit')) chapter = 'Extremities';
    else if (lower.startsWith('eye')) chapter = 'Eye';
    else if (lower.startsWith('ear')) chapter = 'Ear';
    else if (lower.startsWith('nose')) chapter = 'Nose';
    else if (lower.startsWith('throat') || lower.startsWith('larynx')) chapter = 'Throat';
    else if (lower.startsWith('rectum') || lower.startsWith('stool')) chapter = 'Rectum';
    else if (lower.startsWith('urin') || lower.startsWith('bladder') || lower.startsWith('kidney')) chapter = 'Urinary';
    else if (lower.startsWith('female') || lower.startsWith('male') || lower.startsWith('genital')) chapter = 'Genitalia';
    else if (lower.startsWith('fever')) chapter = 'Fever';
    else if (lower.startsWith('perspir') || lower.startsWith('sweat')) chapter = 'Perspiration';
    const rubricId = `custom-rubric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSelectedRubrics(prev => { const next = new Map(prev); next.set(rubricId, { rubricId, description: text, category, chapter, importance: 2, source: 'manual' }); return next; });
    setCustomRubricText(''); setIsRubricsExpanded(true);
    toast({ title: 'Custom Rubric Added', description: text, variant: 'success' });
  }, [customRubricText]);

  const rubricsFingerprint = useMemo(() => Array.from(selectedRubrics.values()).map(r => `${r.rubricId}:${r.importance}`).sort().join('|'), [selectedRubrics]);

  useEffect(() => {
    if (!rubricsFingerprint) return;
    const rubricArray = Array.from(selectedRubrics.values()).map(r => ({ rubricId: r.rubricId, description: r.description, category: r.category, chapter: r.chapter || '', importance: r.importance }));
    scoreMutation.mutate({ selectedRubrics: rubricArray }, { onSuccess: result => { if (onScoredRemediesChange && result.scoredRemedies) onScoredRemediesChange(result.scoredRemedies); if (result.scoredRemedies.length > 0) { const best = result.scoredRemedies[0]; onAutoSuggestRemedy?.(best.remedyName, best.commonPotencies); } } });
  }, [rubricsFingerprint, observations, clinicalFindings]);

  const lastEmittedFingerprint = useRef<string>('');
  useEffect(() => {
    if (onRubricsChange) {
      const array = Array.from(selectedRubrics.values()).map(r => ({ rubricId: r.rubricId, description: r.description, category: r.category as 'MIND' | 'GENERAL' | 'PARTICULAR', chapter: r.chapter || null, importance: r.importance, source: r.source, confidence: 100, remedyCount: 0 } as SuggestedRubric));
      const fp = array.map(r => `${r.rubricId}-${r.importance}`).sort().join('|');
      if (fp !== lastEmittedFingerprint.current) { lastEmittedFingerprint.current = fp; onRubricsChange(array); }
    }
  }, [selectedRubrics, onRubricsChange]);

  const selectedArray = useMemo(() => Array.from(selectedRubrics.values()), [selectedRubrics]);

  return (
    <Card id="section-rubrics">
      <CardContent style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Header */}
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen style={{ width: 16, height: 16, color: '#8B5CF6' }} />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Repertory</span>
            <span style={{ fontSize: 10, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: '#EDE9FE', color: '#4C1D95', fontWeight: 500 }}>Repertorization</span>
            {selectedRubrics.size > 0 && <span style={{ fontSize: 10, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: 'var(--color-success-100)', color: 'var(--color-success-700)', fontWeight: 500 }}>{selectedRubrics.size} selected</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!expanded && selectedRubrics.size > 0 && <span style={{ fontSize: 10, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: 'var(--color-success-100)', color: 'var(--color-success-700)', fontWeight: 500, whiteSpace: 'nowrap' }}>{selectedRubrics.size} active</span>}
            <button type="button" onClick={e => { e.stopPropagation(); handleReset(); }} title="Reset Repertory" style={{ padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-disabled)'; }}>
              <RotateCcw style={{ width: 14, height: 14 }} />
            </button>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-tertiary)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </button>

        {expanded && (
          <>
            {/* Kent Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: 'var(--radius-card)', border: '1px solid #DDD6FE', background: 'var(--bg-card)', padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search style={{ width: 14, height: 14, color: '#8B5CF6' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Search Kent's Repertory</span>
                <span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: '#EDE9FE', color: '#4C1D95', fontWeight: 700 }}>AI-Powered</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-tertiary)' }} />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder='Search any symptom e.g. "jealousy", "headache worse motion", "fear of dark"...' style={{ height: '2.25rem', fontSize: 'var(--font-size-xs)', paddingLeft: '2rem' }} />
              </div>
              <div style={{ maxHeight: '13rem', overflowY: 'auto', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
                {!debouncedSearch ? (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>
                    <BookOpen style={{ width: 20, height: 20, margin: '0 auto 0.5rem', color: 'var(--border-default)' }} />
                    Type a symptom keyword to search Kent's Repertory
                  </div>
                ) : kentLoading || kentFetching ? (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: '#8B5CF6', animation: 'pulse 2s infinite' }}>
                    <Brain style={{ width: 20, height: 20, margin: '0 auto 0.5rem' }} />
                    Searching Kent's Repertory for "{debouncedSearch}"...
                  </div>
                ) : !kentResults || kentResults.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>No rubrics found for "{debouncedSearch}"</div>
                ) : (
                  kentResults.map((rubric) => {
                    const isSelected = selectedRubrics.has(rubric.rubricId);
                    return (
                      <button key={rubric.rubricId} type="button" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', textAlign: 'left', cursor: 'pointer', border: 'none', borderLeft: `2px solid ${isSelected ? '#8B5CF6' : 'transparent'}`, borderBottom: '1px solid var(--border-light)', background: isSelected ? 'rgba(245,243,255,0.6)' : 'var(--bg-card)', transition: 'all var(--transition-fast)' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'; }}
                        onClick={() => { setSelectedRubrics(prev => { const next = new Map(prev); if (next.has(rubric.rubricId)) next.delete(rubric.rubricId); else { next.set(rubric.rubricId, { rubricId: rubric.rubricId, description: rubric.description, category: rubric.category as RubricCategory, chapter: rubric.chapter, importance: rubric.importance, source: 'manual' }); setIsRubricsExpanded(true); } return next; }); }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(isSelected ? { background: '#7C3AED', borderColor: '#7C3AED', color: 'white' } : { borderColor: 'var(--border-strong)' }) }}>
                          {isSelected && <Check style={{ width: 12, height: 12 }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 'var(--font-size-xs)', margin: 0, color: isSelected ? '#4C1D95' : 'var(--text-secondary)', fontWeight: isSelected ? 500 : 400 }}>{rubric.description}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-disabled)', margin: 0 }}>{rubric.chapter} · {rubric.category}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', fontWeight: 700, ...(rubric.importance >= 4 ? { background: '#FEE2E2', color: '#7F1D1D' } : rubric.importance >= 3 ? { background: '#FFEDD5', color: '#9A3412' } : { background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }) }}>
                            {IMPORTANCE_LABELS[rubric.importance] || 'Moderate'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>~{rubric.remedyCount}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Rubric Input */}
            <div style={{ borderRadius: 'var(--radius-card)', border: '1px dashed var(--border-default)', background: 'var(--bg-surface-2)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Type style={{ width: 12, height: 12, color: 'var(--text-disabled)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Or type a custom rubric manually</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input value={customRubricText} onChange={e => setCustomRubricText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRubric(); } }} placeholder="e.g. Mind - Jealousy - morning" style={{ height: '1.75rem', fontSize: 11, flex: 1 }} />
                <button type="button" onClick={handleAddCustomRubric} disabled={!customRubricText.trim()} style={{ height: '1.75rem', padding: '0 0.625rem', borderRadius: 'var(--radius-card)', background: 'var(--text-secondary)', color: 'white', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: customRubricText.trim() ? 1 : 0.4, transition: 'opacity var(--transition-fast)' }}>
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
            </div>

            {/* Selected rubrics */}
            {selectedArray.length > 0 && (
              <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid #EDE9FE', overflow: 'hidden', background: 'var(--bg-card)', boxShadow: 'var(--shadow-xs)', marginTop: '1rem', transition: 'all 0.3s' }}>
                <button type="button" onClick={() => setIsRubricsExpanded(!isRubricsExpanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,243,255,0.5)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.375rem', borderRadius: 8, ...(scoreMutation.isPending ? { background: '#EDE9FE', color: '#6D28D9', animation: 'pulse 2s infinite' } : { background: 'rgba(245,243,255,0.5)', color: '#8B5CF6' }) }}>
                      <BarChart3 style={{ width: 14, height: 14 }} />
                    </div>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selected Rubrics ({selectedArray.length})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!isRubricsExpanded && (
                      <div style={{ display: 'flex', marginRight: '0.5rem' }}>
                        {selectedArray.slice(0, 3).map((r, i) => (
                          <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--bg-card)', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#6D28D9', marginLeft: i > 0 ? -4 : 0 }}>
                            {r.description[0]}
                          </div>
                        ))}
                      </div>
                    )}
                    {isRubricsExpanded ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />}
                  </div>
                </button>

                {isRubricsExpanded && (
                  <CardContent style={{ padding: '0.75rem 1rem', paddingTop: 0, borderTop: '1px solid #EDE9FE', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ paddingTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {selectedArray.map((rubric) => (
                        <div key={rubric.rubricId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-card)', border: '1px solid #EDE9FE', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', boxShadow: 'var(--shadow-xs)', transition: 'border-color var(--transition-fast)' }}>
                          <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8B5CF6' }}>{rubric.category[0]}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', maxWidth: '7.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{rubric.description}</span>
                          <div style={{ display: 'flex', gap: 2, marginLeft: 4, borderLeft: '1px solid #EDE9FE', paddingLeft: 6 }}>
                            {[1, 2, 3, 4].map(imp => (
                              <button key={imp} type="button" onClick={e => { e.stopPropagation(); updateImportance(rubric.rubricId, imp); }} title={IMPORTANCE_LABELS[imp]} style={{ width: 14, height: 14, borderRadius: '50%', fontSize: 7, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all var(--transition-fast)', ...(imp <= rubric.importance ? { ...IMPORTANCE_STYLES[rubric.importance], transform: 'scale(1.1)', boxShadow: 'var(--shadow-xs)' } : { background: 'var(--bg-surface-2)', color: 'var(--text-disabled)' }) }}>
                                {imp}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); removeSelectedRubric(rubric.rubricId); }} style={{ color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 4, borderRadius: 4, transition: 'all var(--transition-fast)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-disabled)'; }}>
                            <X style={{ width: 10, height: 10 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
