// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Sparkles, Check, BrainCircuit, X, UploadCloud, FileText, Loader2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api-client';
import { useExtractDiseaseRubrics, useRepertorizeScore } from '@/hooks/use-repertorization';
import { useSearchParams } from 'react-router-dom';
import type { ScoredRemedy, SuggestedRubric } from '@/types/ai';

const IMPORTANCE_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: 'Supp.', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  2: { label: 'Mod.', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  3: { label: 'Imp.', cls: 'bg-amber-50 text-amber-500 border-amber-200' },
  4: { label: 'Elim.', cls: 'bg-red-50 text-red-500 border-red-200' },
};

export default function AiAnalysisPage() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('query') || '';

  const [activeTab, setActiveTab] = useState<'disease' | 'report'>('disease');

  // ── Disease lookup ──
  const [query, setQuery] = useState(urlQuery);
  const [submitted, setSubmitted] = useState(urlQuery);
  const extractDisease = useExtractDiseaseRubrics();
  const score = useRepertorizeScore();
  const [diseaseScored, setDiseaseScored] = useState<ScoredRemedy[] | null>(null);
  const [displayRubrics, setDisplayRubrics] = useState<SuggestedRubric[]>([]);

  // ── Rubric selection for Disease mode ──
  const [selectedDiseaseRubrics, setSelectedDiseaseRubrics] = useState<string[]>([]);

  // ── Report Upload ──
  const [files, setFiles] = useState<{ name: string; base64: string; type: string; size: number }[]>([]);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSummary, setReportSummary] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setReportError(null);
    selectedFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setReportError(`File ${file.name} is too large. Max 5MB allowed.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) return;
        setFiles((prev) => [...prev, { name: file.name, base64, type: file.type, size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeReport = async () => {
    if (files.length === 0) return;
    setIsAnalyzingReport(true);
    setReportError(null);
    try {
      const data = await api.post<any>('/api/ai/analyze-report', {
        visitId: 'standalone-analysis',
        documents: files.map(f => ({ base64: f.base64, mimeType: f.type }))
      });
      if (data && data.rubrics) {
        setDisplayRubrics(data.rubrics);
        setReportSummary(data.reportSummary || null);
        setSubmitted('Uploaded Report');
        setSelectedDiseaseRubrics(data.rubrics.map((r: any) => r.rubricId));
        score.mutate(
          { selectedRubrics: data.rubrics.map((r: any) => ({ rubricId: r.rubricId, description: r.description, category: r.category, importance: r.importance })) },
          {
            onSuccess: (res) => {
              setDiseaseScored(res.scoredRemedies);
            }
          }
        );
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setReportError(err.message || 'Failed to analyze report');
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  useEffect(() => {
    if (displayRubrics.length > 0) {
      setSelectedDiseaseRubrics(displayRubrics.map(r => r.rubricId));
    }
  }, [displayRubrics]);

  useEffect(() => {
    if (!submitted) return;
    if (activeTab !== 'disease') return;

    // 1. Fetch rubrics for disease
    extractDisease.mutate({ disease: submitted }, {
      onSuccess: (rubricsRes) => {
        if (!rubricsRes.suggestedRubrics?.length) return;
        setDisplayRubrics(rubricsRes.suggestedRubrics);
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
  }, [submitted]);

  // Re-score when disease rubrics are toggled
  useEffect(() => {
    if (!submitted || displayRubrics.length === 0) return;
    const selected = displayRubrics.filter(r => selectedDiseaseRubrics.includes(r.rubricId));
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

  // Group rubrics by chapter for disease mode
  const rubricsByChapter = useMemo(() => {
    const groups: Record<string, SuggestedRubric[]> = {};
    displayRubrics.forEach(r => {
      const chapter = (r as any).chapter || r.category || 'GENERALITIES';
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(r);
    });
    return groups;
  }, [displayRubrics]);

  const effective = diseaseScored || [];
  const best = effective[0];
  const alternates = effective.slice(1, 4);

  return (
    <div className="pp-page-container rt-page-container animate-fade-in" style={{ padding: '24px 32px' }}>
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6 border-b border-[#E3E2DF] pb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0F0F0E] tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-[#2563EB]" /> AI Clinical Analysis
          </h1>
          <p className="text-[13px] font-medium text-[#4A4A47] mt-1">
            Perform standalone disease repertorization and indicated remedy analysis.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* TABS */}
        <div className="flex border-b border-[#E3E2DF]">
          <button 
            className={cn(
              "px-6 py-3 text-[14px] font-bold border-b-2 transition-colors",
              activeTab === 'disease' ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#0F0F0E]"
            )}
            onClick={() => {
              setActiveTab('disease');
              setDisplayRubrics([]);
              setDiseaseScored(null);
              setSubmitted('');
              setQuery('');
            }}
          >
            Disease Search
          </button>
          <button 
            className={cn(
              "px-6 py-3 text-[14px] font-bold border-b-2 transition-colors",
              activeTab === 'report' ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#0F0F0E]"
            )}
            onClick={() => {
              setActiveTab('report');
              setDisplayRubrics([]);
              setDiseaseScored(null);
              setSubmitted('');
              setFiles([]);
              setReportError(null);
              setReportSummary(null);
            }}
          >
            Lab Report Analysis
          </button>
        </div>

        {/* SEARCH CARD */}
        {activeTab === 'disease' && (
          <div className="pp-card p-5 border border-[#E3E2DF] space-y-4 bg-white rounded-xl shadow-sm">
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
                  placeholder="e.g. Migraine, Kidney stones, Psoriasis..."
                  className="w-full h-11 pl-10 pr-4 text-[15px] font-medium rounded-lg border border-[#E3E2DF] bg-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] shadow-sm transition-all"
                />
              </div>
              <button 
                onClick={() => setSubmitted(query.trim())} 
                disabled={extractDisease.isPending || !query.trim()}
                className="pp-btn-primary h-11 px-5 text-[14px] shadow-sm flex items-center justify-center disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Analyse
              </button>
            </div>
          </div>
        )}

        {/* REPORT UPLOAD CARD */}
        {activeTab === 'report' && (
          <div className="pp-card p-6 border border-[#E3E2DF] bg-white rounded-xl shadow-sm">
            <div className="flex flex-col gap-5">
              <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-[#E3E2DF] border-dashed rounded-xl cursor-pointer bg-[#FAFAF8] hover:bg-[#F1F5F9] hover:border-[#94A3B8] transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-12 h-12 mb-3 text-[#94A3B8] group-hover:text-[#2563EB] bg-white rounded-full shadow-sm flex items-center justify-center transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="mb-1 text-[14px] text-[#4A4A47] font-medium">
                    <span className="font-bold text-[#2563EB]">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[12px] text-[#888786]">PDF, PNG, JPG (Max 10MB)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/png, image/jpeg, application/pdf" 
                  onChange={handleFileUpload} 
                />
              </label>

              {reportError && (
                <div className="text-[13px] text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 shrink-0" /> {reportError}
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[12px] font-bold text-[#888786] uppercase tracking-widest">Attached Files</h4>
                  <div className="flex flex-wrap items-stretch gap-3">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 min-w-[280px] max-w-[320px] bg-white border border-[#E3E2DF] rounded-lg shadow-sm group hover:border-[#BFDBFE] transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="truncate pr-4">
                            <p className="text-[13px] font-bold text-[#0F0F0E] truncate">{file.name}</p>
                            <p className="text-[11px] text-[#888786]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.preventDefault(); removeFile(i); }}
                          className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      onClick={handleAnalyzeReport}
                      disabled={isAnalyzingReport}
                      className="pp-btn-primary px-8 text-[14px] shadow-sm flex items-center justify-center disabled:opacity-50 rounded-lg whitespace-nowrap"
                    >
                      {isAnalyzingReport ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Analyse</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(submitted || displayRubrics.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            
            {/* Left Pane: Rubrics */}
            <div className="pp-card border border-[#E3E2DF] overflow-hidden flex flex-col h-[650px] bg-white rounded-xl shadow-sm">
              <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#0F0F0E] flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#2563EB]" /> Rubrics for “{submitted}”
                </span>
                <span className="text-[11px] font-bold text-[#4A4A47] bg-white border border-[#E3E2DF] px-2 py-0.5 rounded-full">
                  {displayRubrics.length} shown
                </span>
              </div>
              <div className="overflow-y-auto flex-1 bg-[#FAFAF8] p-4 space-y-5">
                {activeTab === 'report' && reportSummary && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                    <h4 className="text-[12px] font-bold text-blue-800 uppercase tracking-widest mb-1.5">Report Summary</h4>
                    <p className="text-[13px] text-blue-900 leading-relaxed">{reportSummary}</p>
                  </div>
                )}
                {extractDisease.isPending ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-[13px] text-[#888786] italic">Searching “{submitted}”…</p>
                  </div>
                ) : displayRubrics.length === 0 ? (
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
                Auto-repertorizing remedies in real-time
              </div>
            </div>

            {/* Right Pane: Remedies */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-[#2563EB] rounded-full" />
                  <h3 className="text-[14px] font-bold text-[#0F0F0E]">Remedies for “{submitted}”</h3>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">From Selected Rubrics</span>
                </div>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {score.isPending ? (
                  <div className="p-6 text-center">
                    <p className="text-[13px] text-[#888786] italic">Scoring remedies…</p>
                  </div>
                ) : effective.length === 0 ? (
                  <p className="text-[13px] text-[#888786] italic py-6">Select rubrics to generate remedies.</p>
                ) : (
                  <>
                    {best && <RemedyCard remedy={best} isBestMatch />}
                    {alternates.map((r, i) => (
                      <RemedyCard key={r.remedyId} remedy={r} index={i + 2} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Remedy Card Component ──
function RemedyCard({ remedy, isBestMatch, index }: { remedy: ScoredRemedy; isBestMatch?: boolean; index?: number }) {
  const score = Math.round(remedy.normalizedScore);
  
  return (
    <div className={cn(
      "pp-card overflow-hidden bg-white transition-all border rounded-xl shadow-sm",
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
          <p className="text-[13px] text-[#4A4A47] mb-4 leading-relaxed line-clamp-2">
            {remedy.coverage.map((c) => c.rubricDescription).join(', ')}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">Score {score}%</span>
          {remedy.commonPotencies?.[0] && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#FAFAF8] text-[#4A4A47] border border-[#E3E2DF]">{remedy.commonPotencies[0]}</span>}
          {remedy.thermalType && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#FAFAF8] text-[#4A4A47] border border-[#E3E2DF]">{remedy.thermalType}</span>}
          {remedy.miasm && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#FAFAF8] text-[#4A4A47] border border-[#E3E2DF]">{remedy.miasm}</span>}
        </div>
      </div>
    </div>
  );
}
