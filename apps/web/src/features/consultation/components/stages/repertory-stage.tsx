import { useMemo, useState, useRef, useEffect } from 'react';
import { Pencil, ArrowLeft, Check, Plus, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog';
import type { ScoredRemedy, SuggestedRubric } from '../../../../types/ai';

export interface RemedyRxRow {
  remedyId: string;
  remedyName: string;
  potency: string;
  dose: string;
  frequency: string;
  duration: string;
  instruction: string;
}

interface RepertoryStageProps {
  selectedRubrics: SuggestedRubric[];
  scoredRemedies: ScoredRemedy[];
  onApplyRemedy?: (remedyName: string, potency: string) => void;
  onApplyAllRemedies?: (rows: RemedyRxRow[], advice: string, followUp: string) => void | Promise<void>;
  onComplete?: () => void;
  isCompleting?: boolean;
  aiAdvice?: string;
  aiFollowUp?: string;
  isGeneratingAdvice?: boolean;
  /** Called whenever rx data, advice, or follow-up changes so parent can access current values */
  onDataChange?: (rows: RemedyRxRow[], advice: string, followUp: string) => void;
}

export function RepertoryStage({
  selectedRubrics: _selectedRubrics,
  scoredRemedies,
  onApplyRemedy: _onApplyRemedy,
  aiAdvice = '',
  aiFollowUp = '',
  isGeneratingAdvice = false,
  onDataChange,
}: RepertoryStageProps) {
  const [selectedRemedyIds, setSelectedRemedyIds] = useState<Set<string>>(new Set());
  const [advice, setAdvice] = useState(aiAdvice);
  const [followUp, setFollowUp] = useState(aiFollowUp);
  const [rxRows, setRxRows] = useState<RemedyRxRow[]>([]);
  const rxAreaRef = useRef<HTMLDivElement>(null);
  const rxTableRef = useRef<HTMLDivElement>(null);

  // Edit Prescription modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RemedyRxRow | null>(null);
  const [editForm, setEditForm] = useState({ potency: '', dose: '', frequency: '', duration: '', instruction: '' });

  // Sync AI values when they arrive (async AI completion)
  // Only update if user hasn't manually edited the field yet
  const userEditedAdvice = useRef(false);
  const userEditedFollowUp = useRef(false);
  useEffect(() => {
    if (aiAdvice && !userEditedAdvice.current) {
      setAdvice(aiAdvice);
    }
  }, [aiAdvice]);
  useEffect(() => {
    if (aiFollowUp && !userEditedFollowUp.current) {
      setFollowUp(aiFollowUp);
    }
  }, [aiFollowUp]);

  // Notify parent of data changes
  useEffect(() => {
    onDataChange?.(rxRows, advice, followUp);
  }, [rxRows, advice, followUp, onDataChange]);

  // Top 4 remedies — the UI shows only the strongest matches to keep the list focused.
  const topRemedies = useMemo(() => {
    return scoredRemedies.slice(0, 4);
  }, [scoredRemedies]);


  // Toggle a remedy in/out of the selection
  const handleToggleRemedy = (remedy: ScoredRemedy) => {
    const isAlreadySelected = selectedRemedyIds.has(remedy.remedyId);

    if (isAlreadySelected) {
      // Remove from selection
      setSelectedRemedyIds(prev => {
        const next = new Set(prev);
        next.delete(remedy.remedyId);
        return next;
      });
      setRxRows(rows => rows.filter(r => r.remedyId !== remedy.remedyId));
    } else {
      // Add to selection — guard against duplicates explicitly
      setSelectedRemedyIds(prev => {
        const next = new Set(prev);
        next.add(remedy.remedyId);
        return next;
      });
      setRxRows(rows => {
        // Guard: don't add if already present (StrictMode safety)
        if (rows.some(r => r.remedyId === remedy.remedyId)) return rows;
        return [
          ...rows,
          {
            remedyId: remedy.remedyId,
            remedyName: remedy.remedyName,
            potency: remedy.commonPotencies[0] || '200C',
            dose: '2 pills',
            frequency: 'Single dose',
            duration: '30 days',
            instruction: 'Dissolve under tongue, empty stomach',
          },
        ];
      });
      setTimeout(() => rxAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  };

  const updateRxRow = (remedyId: string, field: keyof RemedyRxRow, value: string) => {
    setRxRows(rows => rows.map(r => r.remedyId === remedyId ? { ...r, [field]: value } : r));
  };

  const todayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 pp-fade-in relative container mx-auto">
      
      {/* ── Progress bar ── */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#888786] uppercase tracking-widest">Step 4 of 4</span>
          <span className="text-[11px] font-bold text-[#4A4A47]">100%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E3E2DF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* ── Title ── */}
      <div>
        <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Remedy Prescription</h2>
        <p className="text-[13px] font-medium text-[#4A4A47] mt-1">
          Review scored remedies. Select cards to build the final prescription.
        </p>
      </div>


      {/* ── Selection hint ── */}
      {selectedRemedyIds.size === 0 && (
        <div className="pp-card p-5 text-center bg-[#FAFAF8]">
          <p className="text-[12px] text-[#4A4A47] font-bold tracking-wide">
            <Plus className="inline h-3.5 w-3.5 mr-1 text-[#4A4A47]" />
            Click any remedy card below to add it to the prescription.
          </p>
        </div>
      )}

      {selectedRemedyIds.size > 0 && (
        <div className="pp-card px-5 py-3 bg-[#EFF6FF] border-[#BFDBFE] flex items-center justify-center gap-2 animate-in zoom-in-95 duration-300">
          <Check className="h-4 w-4 text-[#2563EB] shrink-0" />
          <p className="text-[13px] text-[#1E3A8A] font-bold tracking-tight">
            {selectedRemedyIds.size} {selectedRemedyIds.size === 1 ? 'remedy' : 'remedies'} added to prescription. Scroll down to review.
          </p>
        </div>
      )}

      {/* ── Remedy Cards ── */}
      {topRemedies.length > 0 ? (
        <div className="flex flex-col gap-4">
          {topRemedies.map((remedy, index) => {
            const isFirst = index === 0;
            const isSelected = selectedRemedyIds.has(remedy.remedyId);

            return (
              <button
                key={remedy.remedyId}
                type="button"
                onClick={() => handleToggleRemedy(remedy)}
                className={`relative w-full text-left pp-card p-6 transition-all duration-300 hover:shadow-md cursor-pointer ${
                  isSelected
                    ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#BFDBFE] -translate-y-0.5'
                    : isFirst
                    ? 'bg-white border-[#FDE68A] shadow-sm -translate-y-0.5'
                    : 'bg-white border-[#E3E2DF] hover:border-[#BFDBFE]'
                }`}
              >
                {/* Rank / Selected badge */}
                <span
                  className={`absolute top-5 right-5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-[4px] inline-flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-[#2563EB] text-white'
                      : isFirst
                      ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                      : 'bg-[#FAFAF8] text-[#888786]'
                  }`}
                >
                  {isSelected ? (
                    <><Check className="h-3.5 w-3.5" /> ADDED</>
                  ) : isFirst ? (
                    'BEST MATCH'
                  ) : (
                    `#${index + 1}`
                  )}
                </span>

                {/* Remedy name */}
                <h4 className="text-lg font-bold text-[#0F0F0E] pr-28 tracking-tight">{remedy.remedyName}</h4>
                {remedy.commonName && (
                  <p className="text-[11px] font-bold text-[#888786] mt-1 uppercase tracking-widest">{remedy.commonName}</p>
                )}

                {/* Score bar */}
                <div className="mt-4 w-full bg-[#E3E2DF] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isSelected ? 'bg-[#2563EB]' : 'bg-[#D97706]'}`}
                    style={{ width: `${remedy.normalizedScore}%` }}
                  />
                </div>

                {/* Keynotes */}
                {remedy.keynotes.length > 0 && (
                  <p className="mt-4 text-[13px] font-medium text-[#4A4A47] leading-relaxed max-w-[95%]">
                    {remedy.keynotes.join(' • ')}
                  </p>
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-[4px] bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                    Score {Math.round(remedy.normalizedScore)}%
                  </span>
                  {remedy.commonPotencies[0] && (
                    <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {remedy.commonPotencies[0]}
                    </span>
                  )}
                  <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-[4px] bg-[#FAFAF8] text-[#4A4A47] border border-[#E3E2DF]">
                    {remedy.coveredRubricCount}/{remedy.totalRubricCount} rubrics
                  </span>
                  {remedy.thermalType && (
                    <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-[4px] bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                      {remedy.thermalType}
                    </span>
                  )}
                  {remedy.miasm && (
                    <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-[4px] bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF]">
                      {remedy.miasm}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* ── Clinical note ── */}
      {topRemedies.length > 0 && (
        <div className="pp-card bg-[#FFFBEB] border-[#FDE68A] p-5">
          <p className="text-[11px] uppercase tracking-widest text-[#92400E] leading-relaxed flex gap-2">
            <span className="font-bold text-[#D97706]">Note</span>
            <span className="font-medium">
              {topRemedies[0]?.remedyName} leads on all rubrics.
              {topRemedies[0]?.matchExplanation?.[0] && ` ${topRemedies[0].matchExplanation[0]}`}
            </span>
          </p>
        </div>
      )}

      {/* ═════════ Prescription Area ═════════ */}
      {rxRows.length > 0 && (
        <div ref={rxAreaRef} className="rx-area space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-400">
          <hr className="border-[#E3E2DF]" />

          {/* Prescription header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-[#0F0F0E] tracking-tight">Final Prescription</h3>
              <p className="text-[12px] font-medium text-[#4A4A47] mt-1">
                {rxRows.length} {rxRows.length === 1 ? 'remedy' : 'remedies'} — edit details below before approving
              </p>
            </div>
            <div className="flex items-center gap-3">
              {rxRows.map((row) => (
                <button
                  key={row.remedyId}
                  className="bg-white border border-[#E3E2DF] hover:border-[#BFDBFE] text-[#4A4A47] hover:text-[#2563EB] shadow-sm transition-all text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center justify-center gap-2 -translate-y-0.5 hover:-translate-y-1 uppercase tracking-widest"
                  onClick={() => {
                    setEditingRow(row);
                    setEditForm({
                      potency: row.potency,
                      dose: row.dose,
                      frequency: row.frequency,
                      duration: row.duration,
                      instruction: row.instruction,
                    });
                    setEditModalOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit {rxRows.length > 1 ? row.remedyName : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Rx header card */}
          <div className="pp-card overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 px-5 py-4 bg-[#FAFAF8] border-b border-[#E3E2DF]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#BFDBFE]">
                  <span className="text-2xl font-serif leading-none font-bold">℞</span>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#0F0F0E] tracking-tight">
                    {rxRows.map(r => r.remedyName).join(' + ')}
                  </h4>
                  <p className="text-[12px] font-medium text-[#4A4A47] mt-1">
                    {rxRows.map(r => r.potency).join(', ')} <span className="text-[#E3E2DF] px-1">•</span> {rxRows.length} {rxRows.length === 1 ? 'remedy' : 'remedies'}
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-[#888786] text-right space-y-0.5 uppercase tracking-widest pt-2">
                <p>Date: {todayDate}</p>
              </div>
            </div>

            {/* Prescription table — one editable row per selected remedy */}
            <div ref={rxTableRef} className="overflow-x-auto p-4 bg-white">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E3E2DF]">
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Remedy</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Potency</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Dose</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Frequency</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Duration</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-[#888786] uppercase tracking-widest">Instruction</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rxRows.map((row) => (
                    <tr key={row.remedyId} className="border-b border-[#E3E2DF] border-dashed last:border-0 hover:bg-[#FAFAF8] group transition-colors">
                      <td className="px-4 py-3 font-bold text-[#0F0F0E] whitespace-nowrap">{row.remedyName}</td>
                      <td className="px-4 py-3">
                        <input
                          value={row.potency}
                          onChange={e => updateRxRow(row.remedyId, 'potency', e.target.value)}
                          className="w-20 text-[12px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2 py-1 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.dose}
                          onChange={e => updateRxRow(row.remedyId, 'dose', e.target.value)}
                          className="w-20 text-[12px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2 py-1 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.frequency}
                          onChange={e => updateRxRow(row.remedyId, 'frequency', e.target.value)}
                          className="w-28 text-[12px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2 py-1 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.duration}
                          onChange={e => updateRxRow(row.remedyId, 'duration', e.target.value)}
                          className="w-24 text-[12px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2 py-1 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.instruction}
                          onChange={e => updateRxRow(row.remedyId, 'instruction', e.target.value)}
                          className="w-52 text-[12px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2 py-1 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] transition-all"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRemedy(scoredRemedies.find(r => r.remedyId === row.remedyId)!)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#888786] hover:text-[#DC2626] p-1.5 rounded-md hover:bg-[#FEF2F2]"
                          title="Remove remedy"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pp-card p-6 space-y-5 transition-all duration-500">
            <div className="flex items-center gap-3">
              <h4 className="text-[14px] font-bold text-[#0F0F0E]">Advice &amp; Follow-up</h4>
              {isGeneratingAdvice ? (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating Notes...
                </span>
              ) : (advice || followUp) ? (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">AI Formulated</span>
              ) : null}
            </div>
            <div>
              <label htmlFor="rx-advice" className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">
                Advice / Dietary Instructions
              </label>
              <textarea
                id="rx-advice"
                value={advice}
                onChange={e => { userEditedAdvice.current = true; setAdvice(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                disabled={isGeneratingAdvice}
                placeholder={isGeneratingAdvice ? 'AI is generating patient-specific advice...' : 'Enter advice for this patient...'}
                className={`w-full bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-4 py-3 text-[13px] font-medium text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white resize-none overflow-hidden min-h-[4rem] transition-all ${isGeneratingAdvice ? 'animate-pulse' : ''}`}
              />
            </div>
            <div>
              <label htmlFor="rx-followup" className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">
                Next Review Date
              </label>
              <input
                id="rx-followup"
                type="date"
                value={followUp}
                onChange={e => { userEditedFollowUp.current = true; setFollowUp(e.target.value); }}
                disabled={isGeneratingAdvice}
                className={`w-full max-w-[300px] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 text-[13px] font-medium text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all ${isGeneratingAdvice ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>

          {/* Button row — approval handled by the bottom bar's "Approve & Next" button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              className="pp-btn-secondary h-10 w-full sm:w-auto px-4 !text-[13px] flex items-center justify-center gap-2"
              onClick={() => { setSelectedRemedyIds(new Set()); setRxRows([]); }}
            >
              <ArrowLeft className="h-4 w-4" />
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ═══ Edit Prescription Modal ═══ */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#E3E2DF] !rounded-xl !p-0 overflow-hidden shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-[#E3E2DF] bg-[#FAFAF8] space-y-0 text-left">
            <DialogTitle className="text-[16px] font-bold text-[#0F0F0E]">
              Edit Prescription{editingRow ? ` — ${editingRow.remedyName}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Potency</label>
              <input
                value={editForm.potency}
                onChange={(e) => setEditForm(f => ({ ...f, potency: e.target.value }))}
                className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all"
                placeholder="e.g. 200C"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Dosage</label>
              <input
                value={editForm.dose}
                onChange={(e) => setEditForm(f => ({ ...f, dose: e.target.value }))}
                className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all"
                placeholder="e.g. 3 globules, once daily"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Frequency</label>
              <input
                value={editForm.frequency}
                onChange={(e) => setEditForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all"
                placeholder="e.g. Single dose"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Duration</label>
              <input
                value={editForm.duration}
                onChange={(e) => setEditForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all"
                placeholder="e.g. 30 days"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Instruction</label>
              <input
                value={editForm.instruction}
                onChange={(e) => setEditForm(f => ({ ...f, instruction: e.target.value }))}
                className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] focus:bg-white transition-all"
                placeholder="e.g. Dissolve under tongue, empty stomach"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-[#E3E2DF] bg-[#FAFAF8] flex justify-end gap-3 sm:justify-end">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-[#4A4A47] hover:text-[#0F0F0E] transition-colors"
            >
              Cancel
            </button>
            <button
              className="pp-btn-primary px-5 py-2 text-[13px]"
              onClick={() => {
                if (editingRow) {
                  updateRxRow(editingRow.remedyId, 'potency', editForm.potency);
                  updateRxRow(editingRow.remedyId, 'dose', editForm.dose);
                  updateRxRow(editingRow.remedyId, 'frequency', editForm.frequency);
                  updateRxRow(editingRow.remedyId, 'duration', editForm.duration);
                  updateRxRow(editingRow.remedyId, 'instruction', editForm.instruction);
                }
                setEditModalOpen(false);
              }}
            >
              Update
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
