import { useState, useEffect, useMemo } from 'react';
import { FlaskConical, FileText, Stethoscope, Search, Sparkles, Check, ChevronRight, X, ArrowRight } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { useExtractDiseaseRubrics, useRepertorizeScore } from '../../../../hooks/use-repertorization';
import type { ScoredRemedy, SuggestedRubric } from '../../../../types/ai';
import type { RemedyRxRow } from './repertory-stage';

interface PrescriptionStageProps {
  scoredRemedies: ScoredRemedy[];
  suggestedRubrics?: SuggestedRubric[];
  thermalReaction?: string;
  miasm?: string;
  thirstPattern?: string;
  aiAdvice?: string;
  aiFollowUp?: string;
  isGeneratingAdvice?: boolean;
  onScoredRemediesChange?: (remedies: ScoredRemedy[]) => void;
  /** Reports the current Rx rows + advice + follow-up so the layout can complete the visit. */
  onDataChange?: (rows: RemedyRxRow[], advice: string, followUp: string, disease?: string) => void;
}

const IMPORTANCE_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: 'Supp.', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  2: { label: 'Mod.', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  3: { label: 'Imp.', cls: 'bg-amber-50 text-amber-500 border-amber-200' },
  4: { label: 'Elim.', cls: 'bg-red-50 text-red-500 border-red-200' },
};

export function PrescriptionStage({
  scoredRemedies,
  suggestedRubrics = [],
  thermalReaction,
  miasm,
  thirstPattern,
  aiAdvice = '',
  aiFollowUp = '',
  isGeneratingAdvice,
  onScoredRemediesChange,
  onDataChange,
}: PrescriptionStageProps) {
  const [tab, setTab] = useState<'summary' | 'disease'>('summary');

  // ── Disease lookup ──
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const extractDisease = useExtractDiseaseRubrics();
  const score = useRepertorizeScore();
  const [diseaseScored, setDiseaseScored] = useState<ScoredRemedy[] | null>(null);
  
  // ── Rubric selection for Disease mode ──
  // Initialize with all rubrics selected
  const [selectedDiseaseRubrics, setSelectedDiseaseRubrics] = useState<string[]>([]);
  const diseaseRubrics = extractDisease.data?.suggestedRubrics || [];

  useEffect(() => {
    if (diseaseRubrics.length > 0) {
      setSelectedDiseaseRubrics(diseaseRubrics.map(r => r.rubricId));
    }
  }, [diseaseRubrics]);

  useEffect(() => {
    if (tab !== 'disease' || !submitted) return;
    
    // 1. Fetch rubrics for disease
    extractDisease.mutate({ disease: submitted }, {
      onSuccess: (rubricsRes) => {
        if (!rubricsRes.suggestedRubrics?.length) return;
        // 2. Score remedies based on those rubrics
        score.mutate(
          { selectedRubrics: rubricsRes.suggestedRubrics.map((r: any) => ({ rubricId: r.rubricId, description: r.description, category: r.category, importance: r.importance })) },
          {
            onSuccess: (res) => {
              setDiseaseScored(res.scoredRemedies);
            },
          }
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, tab]);

  // Re-score when disease rubrics are toggled
  useEffect(() => {
    if (tab !== 'disease' || !submitted || diseaseRubrics.length === 0) return;
    const selected = diseaseRubrics.filter(r => selectedDiseaseRubrics.includes(r.rubricId));
    if (selected.length === 0) {
      setDiseaseScored([]);
      return;
    }
    score.mutate(
      { selectedRubrics: selected.map(r => ({ rubricId: r.rubricId, description: r.description, category: r.category, importance: r.importance })) },
      {
        onSuccess: (res) => {
          setDiseaseScored(res.scoredRemedies);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiseaseRubrics.join(',')]);

  const effective = tab === 'disease' && diseaseScored ? diseaseScored : scoredRemedies;
  const best = effective[0];
  const alternates = effective.slice(1, 4);

  // ── Selected remedies → Rx rows ──
  const [rxRows, setRxRows] = useState<RemedyRxRow[]>([]);
  const [prescribingRemedyId, setPrescribingRemedyId] = useState<string | null>(null);

  // ── Advice / follow-up ──
  const [advice, setAdvice] = useState(aiAdvice);
  const [followUp, setFollowUp] = useState(aiFollowUp);
  useEffect(() => { if (aiAdvice) setAdvice(aiAdvice); }, [aiAdvice]);
  useEffect(() => { if (aiFollowUp) setFollowUp(aiFollowUp); }, [aiFollowUp]);

  useEffect(() => { onDataChange?.(rxRows, advice, followUp, tab === 'disease' ? submitted : undefined); }, [rxRows, advice, followUp, submitted, tab, onDataChange]);

  const handlePrescribe = (remedyId: string) => {
    const r = effective.find(e => e.remedyId === remedyId);
    if (!r) return;
    
    if (rxRows.find(x => x.remedyId === remedyId)) {
      // Remove if already selected
      setRxRows(prev => prev.filter(x => x.remedyId !== remedyId));
    } else {
      // Add if not selected
      setRxRows(prev => [...prev, {
        remedyId,
        remedyName: r.remedyName,
        potency: r.commonPotencies?.[0] || '200C',
        dose: '4 pills',
        frequency: 'Single dose',
        duration: '30 days',
        instruction: 'Dry on tongue, empty stomach',
      }]);
    }
  };

  const updateRx = (remedyId: string, field: keyof RemedyRxRow, value: string) =>
    setRxRows((rows) => rows.map((r) => (r.remedyId === remedyId ? { ...r, [field]: value } : r)));
  
  const removeRx = (remedyId: string) => {
    setRxRows(rows => rows.filter(r => r.remedyId !== remedyId));
  };

  // Group rubrics by chapter for disease mode
  const rubricsByChapter = useMemo(() => {
    const groups: Record<string, SuggestedRubric[]> = {};
    diseaseRubrics.forEach(r => {
      const chapter = (r as any).chapter || r.category || 'GENERALITIES';
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(r);
    });
    return groups;
  }, [diseaseRubrics]);

  // Constitutional factors count
  const constFactors = [thermalReaction, miasm, thirstPattern].filter(Boolean);

  return (
    <div className="space-y-5 pp-fade-in pb-10">
      
      {/* ── HEADER ── */}
      <div>
        <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Analysis & Remedy</h2>
        <p className="text-[13px] font-medium text-[#4A4A47] mt-1">Get a remedy straight from the summary — or type a disease to see its rubrics and remedies.</p>
      </div>

      {/* ── TABS ── */}
      <div className="inline-flex items-center p-1 bg-white border border-[#E3E2DF] rounded-xl shadow-sm">
        <button 
          onClick={() => setTab('summary')} 
          className={cn('px-4 py-2 text-[13px] font-bold rounded-lg flex items-center gap-2 transition-colors', tab === 'summary' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#4A4A47] hover:bg-[#F9F9F8]')}
        >
          <FileText className="h-4 w-4" /> Summary → Remedy
        </button>
        <button 
          onClick={() => setTab('disease')} 
          className={cn('px-4 py-2 text-[13px] font-bold rounded-lg flex items-center gap-2 transition-colors', tab === 'disease' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#4A4A47] hover:bg-[#F9F9F8]')}
        >
          <Stethoscope className="h-4 w-4" /> Disease → Rubrics & Remedy
        </button>
      </div>

      {/* ── TAB CONTENT: SUMMARY ── */}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-2">
            <div className="w-1.5 h-5 bg-[#2563EB] rounded-full" />
            <h3 className="text-[14px] font-bold text-[#0F0F0E]">Recommended remedy</h3>
          </div>

          <div className="space-y-4">
            {effective.length === 0 ? (
              <p className="text-[13px] text-[#888786] italic py-6">No remedy generated. Check the case summary.</p>
            ) : (
              <>
                {best && <RemedyCard remedy={best} isBestMatch onPrescribe={() => handlePrescribe(best.remedyId)} isSelected={rxRows.some(r => r.remedyId === best.remedyId)} />}
                {alternates.map((r, i) => (
                  <RemedyCard key={r.remedyId} remedy={r} index={i + 2} onPrescribe={() => handlePrescribe(r.remedyId)} isSelected={rxRows.some(x => x.remedyId === r.remedyId)} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: DISEASE ── */}
      {tab === 'disease' && (
        <div className="space-y-4">
          <div className="pp-card p-5 border border-[#E3E2DF] space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-[#2563EB] rounded-full" />
              <h3 className="text-[14px] font-bold text-[#0F0F0E]">Type a disease — get its rubrics and remedies</h3>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 text-[#888786] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSubmitted(query.trim()); }}
                  placeholder="Migraine"
                  className="w-full h-11 pl-10 pr-4 text-[15px] font-medium rounded-lg border border-[#E3E2DF] bg-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] shadow-sm"
                />
              </div>
              <button onClick={() => setSubmitted(query.trim())} className="pp-btn-primary h-11 px-5 text-[14px] shadow-sm">
                <Sparkles className="h-4 w-4 mr-2" /> Get rubrics & remedy
              </button>
            </div>
          </div>

          {(submitted || diseaseRubrics.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left Pane: Rubrics */}
              <div className="pp-card border border-[#E3E2DF] overflow-hidden flex flex-col h-[600px]">
                <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#0F0F0E] flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#2563EB]" /> Rubrics for “{submitted}”
                  </span>
                  <span className="text-[11px] font-bold text-[#4A4A47] bg-white border border-[#E3E2DF] px-2 py-0.5 rounded-full">
                    {diseaseRubrics.length} shown
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 bg-[#FAFAF8] p-4 space-y-5">
                  {extractDisease.isPending ? (
                    <p className="text-[13px] text-[#888786] italic text-center py-6">Searching “{submitted}”…</p>
                  ) : diseaseRubrics.length === 0 ? (
                    <p className="text-[13px] text-[#888786] italic text-center py-6">No rubrics found.</p>
                  ) : (
                    Object.entries(rubricsByChapter).map(([chapter, rubrics]) => (
                      <div key={chapter}>
                        <div className="text-[10px] font-extrabold text-[#888786] uppercase tracking-widest mb-2 px-1">
                          {chapter}
                        </div>
                        <div className="space-y-1">
                          {rubrics.map((r) => {
                            const badge = IMPORTANCE_BADGE[r.importance] || { label: 'Mod.', cls: 'bg-gray-50 text-gray-500 border-gray-200' };
                            const isSelected = selectedDiseaseRubrics.includes(r.rubricId);
                            return (
                              <label key={r.rubricId} className={cn("flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg cursor-pointer transition-colors", isSelected ? "border-[#BFDBFE]" : "border-[#E3E2DF]")}>
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-[#2563EB] border-[#2563EB]" : "bg-white border-[#C9C8C6]")}>
                                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedDiseaseRubrics(prev => 
                                      prev.includes(r.rubricId) ? prev.filter(x => x !== r.rubricId) : [...prev, r.rubricId]
                                    );
                                  }}
                                />
                                <span className="text-[13px] font-medium text-[#0F0F0E] flex-1">{r.description}</span>
                                <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0", badge.cls)}>
                                  {badge.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-3 bg-[#FAFAF8] border-t border-[#E3E2DF] text-center text-[10px] font-bold text-[#888786] uppercase tracking-widest">
                  Rubrics Auto-Repertorised → Remedies on the Right
                </div>
              </div>

              {/* Right Pane: Remedies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-[#2563EB] rounded-full" />
                    <h3 className="text-[14px] font-bold text-[#0F0F0E]">Remedies for “{submitted}”</h3>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">From Rubrics</span>
                  </div>
                </div>
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                  {score.isPending ? (
                    <p className="text-[13px] text-[#888786] italic py-6">Scoring remedies…</p>
                  ) : effective.length === 0 ? (
                    <p className="text-[13px] text-[#888786] italic py-6">Select rubrics to generate remedies.</p>
                  ) : (
                    <>
                      {best && <RemedyCard remedy={best} isBestMatch onPrescribe={() => handlePrescribe(best.remedyId)} isSelected={rxRows.some(r => r.remedyId === best.remedyId)} />}
                      {alternates.map((r, i) => (
                        <RemedyCard key={r.remedyId} remedy={r} index={i + 2} onPrescribe={() => handlePrescribe(r.remedyId)} isSelected={rxRows.some(x => x.remedyId === r.remedyId)} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}



    </div>
  );
}

// ── Remedy Card Component ──

function RemedyCard({ remedy, isBestMatch, index, onPrescribe, isSelected }: { remedy: ScoredRemedy; isBestMatch?: boolean; index?: number; onPrescribe: () => void; isSelected: boolean }) {
  const score = Math.round(remedy.normalizedScore);
  
  return (
    <div className={cn(
      "pp-card overflow-hidden bg-white transition-all",
      isBestMatch ? "border-[#FDE68A] shadow-[0_4px_20px_-4px_rgba(251,191,36,0.15)]" : "border-[#E3E2DF] hover:border-[#BFDBFE]"
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="text-[17px] font-extrabold text-[#0F0F0E] tracking-tight">{remedy.remedyName}</h4>
            <div className="text-[10px] font-bold text-[#888786] uppercase tracking-widest mt-0.5">{remedy.commonName || 'HOMEOPATHIC REMEDY'}</div>
          </div>
          {isBestMatch ? (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">Best match</span>
          ) : (
            <span className="text-[11px] font-bold text-[#4A4A47] px-2.5 py-1">#{index}</span>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#E3E2DF] rounded-full overflow-hidden mb-4">
          <div 
            className={cn("h-full rounded-full", isBestMatch ? "bg-[#D97706]" : "bg-[#2563EB]")} 
            style={{ width: `${score}%` }} 
          />
        </div>
        
        {/* Description / Keynotes */}
        {remedy.coverage && remedy.coverage.length > 0 && (
          <p className="text-[13px] text-[#4A4A47] mb-5 leading-relaxed line-clamp-2">
            {remedy.coverage.map((c) => c.rubricDescription).join(', ')} — {(remedy as any).keynotes?.slice(0, 3).join(', ')}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">Score {score}%</span>
          {remedy.commonPotencies?.[0] && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-white text-[#4A4A47] border border-[#E3E2DF]">{remedy.commonPotencies[0]}</span>}
          {remedy.thermalType && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-white text-[#4A4A47] border border-[#E3E2DF]">{remedy.thermalType}</span>}
          {remedy.miasm && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-white text-[#4A4A47] border border-[#E3E2DF]">{remedy.miasm}</span>}
          
          <button 
            onClick={onPrescribe}
            className={cn(
              "ml-auto h-9 px-4 text-[13px] rounded-lg font-bold transition-colors flex items-center justify-center",
              isSelected 
                ? "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]" 
                : isBestMatch 
                  ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]" 
                  : "bg-white text-[#4A4A47] border border-[#E3E2DF] hover:bg-[#FAFAF8]"
            )}
          >
            {isSelected ? (
              <><Check className="h-4 w-4 mr-1.5" /> In Rx</>
            ) : isBestMatch ? (
              <><Check className="h-4 w-4 mr-1.5" /> Prescribe</>
            ) : (
              <>Send to Rx <ArrowRight className="h-4 w-4 ml-1.5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
