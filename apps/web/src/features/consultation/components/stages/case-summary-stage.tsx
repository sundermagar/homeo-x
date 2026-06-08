import { RefreshCw, Brain, Heart, Search, CheckCircle2, Loader2, Thermometer, Activity, Droplets, Zap, FileText } from 'lucide-react';
import type { CategorizedSymptoms } from '../../../../types/ai';

interface CaseSummaryStageProps {
  caseSummary: string;
  onCaseSummaryChange: (value: string) => void;
  categorizedSymptoms?: CategorizedSymptoms;
  thermalReaction?: string;
  miasm?: string;
  thirstPattern?: string;
  causation?: string;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

/**
 * Stage 2 — Case Summary.
 * Layout: Clinical Narrative (full width) → 3-column symptoms → Constitutional Factors (4 fields).
 */
export function CaseSummaryStage({
  caseSummary,
  onCaseSummaryChange,
  categorizedSymptoms,
  thermalReaction,
  miasm,
  thirstPattern,
  causation,
  isGenerating,
  onRegenerate,
}: CaseSummaryStageProps) {
  const sym = categorizedSymptoms || { mental: [], physical: [], particular: [] };

  const factors: { label: string; value?: string; icon: React.ReactNode }[] = [
    { label: 'Thermal',   value: thermalReaction, icon: <Thermometer className="h-3 w-3 text-[#2563EB]" /> },
    { label: 'Miasm',     value: miasm,           icon: <Activity     className="h-3 w-3 text-[#2563EB]" /> },
    { label: 'Thirst',    value: thirstPattern,   icon: <Droplets     className="h-3 w-3 text-[#2563EB]" /> },
    { label: 'Causation', value: causation,       icon: <Zap          className="h-3 w-3 text-[#2563EB]" /> },
  ];

  return (
    <div className="space-y-5 pp-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Case Summary</h2>
          <p className="text-[13px] font-medium text-[#4A4A47] mt-1">
            Auto-generated from the conversation. Review &amp; edit, then move to prescribing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              <CheckCircle2 className="h-3 w-3" /> Generated
            </span>
          )}
        </div>
      </div>

      {/* Clinical Narrative */}
      <div className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#F4F3F1] bg-[#FAFAF8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#0F0F0E] tracking-tight">Clinical Narrative</h3>
              <p className="text-[11px] font-medium text-[#888786]">Detailed case history.</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            AI DRAFT · EDITABLE
          </span>
        </div>
        <textarea
          value={caseSummary}
          onChange={(e) => onCaseSummaryChange(e.target.value)}
          disabled={isGenerating}
          rows={10}
          placeholder={isGenerating ? 'Generating case summary from the conversation…' : 'No summary yet. Finish the conversation and analyse.'}
          className={`w-full px-6 py-5 text-[14px] leading-relaxed border-0 text-[#0F0F0E] outline-none focus:ring-0 resize-none transition-all ${isGenerating ? 'animate-pulse bg-[#FAFAF8]' : 'bg-white'}`}
        />
      </div>

      {/* 3-col Symptoms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SymptomCard icon={<Brain  className="h-4 w-4 text-[#2563EB]" />} label="Mental"      items={sym.mental} />
        <SymptomCard icon={<Heart  className="h-4 w-4 text-[#2563EB]" />} label="Physical"    items={sym.physical} />
        <SymptomCard icon={<Search className="h-4 w-4 text-[#2563EB]" />} label="Particulars" items={sym.particular} />
      </div>

      {/* Constitutional Factors */}
      <div className="pp-card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-1 h-5 rounded-full bg-[#2563EB]" />
          <h3 className="text-[14px] font-bold text-[#0F0F0E] tracking-tight">Constitutional Factors</h3>
          <span className="ml-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#4A4A47] border border-[#E3E2DF]">
            EXTRACTED · ADJUSTABLE
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">
                {f.icon} {f.label}
              </div>
              <div className="border border-[#E3E2DF] bg-[#FAFAF8] rounded-md px-3 py-2 text-[13px] font-semibold text-[#0F0F0E] capitalize min-h-[40px] flex items-center">
                {f.value && f.value.trim() ? f.value : <span className="text-[#888786] font-medium italic">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SymptomCard({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm overflow-hidden flex flex-col h-[280px]">
      <div className="px-4 py-3.5 border-b border-[#F4F3F1] bg-[#FAFAF8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#EFF6FF] rounded-md text-[#2563EB]">{icon}</div>
          <span className="text-[13px] font-bold text-[#0F0F0E]">{label}</span>
        </div>
        <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE] min-w-[24px] text-center">
          {items.length}
        </span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#888786] italic text-[12px]">
            None extracted
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-[#4A4A47] leading-snug">
                <span className="text-[#2563EB] shrink-0 font-black mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
