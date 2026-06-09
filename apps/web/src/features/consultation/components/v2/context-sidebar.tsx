import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import type { PatientHistory, PatientHistoryVisit } from '../../../../hooks/use-patients';
import type { Vitals } from '../../../../types/visit';

type Tab = 'hx' | 'vit' | 'rx' | 'lab';

interface ContextSidebarProps {
  collapsed: boolean;
  patientName: string;
  patientInitials: string;
  patientAge?: number;
  patientGender: string;
  mrn: string;
  chiefComplaint?: string;
  currentVitals?: Vitals | null;
  history?: PatientHistory;
  /** The visit currently being consulted — excluded from the "previous visits" list. */
  currentVisitId?: string;
  isHistoryLoading: boolean;
  onUpdateVitals: () => void;
  onCompare: (visit: PatientHistoryVisit) => void;
  onViewLab?: (lab: any) => void;
  onUploadLab?: () => void;
  onBackToQueue: () => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'hx', label: 'History' },
  { key: 'vit', label: 'Vitals' },
  { key: 'rx', label: 'Past Rx' },
  { key: 'lab', label: 'Labs' },
];

export function ContextSidebar({
  collapsed,
  patientName,
  patientInitials,
  patientAge,
  patientGender,
  mrn,
  chiefComplaint,
  currentVitals,
  history,
  currentVisitId,
  isHistoryLoading,
  onUpdateVitals,
  onCompare,
  onViewLab,
  onUploadLab,
  onBackToQueue,
}: ContextSidebarProps) {
  const [tab, setTab] = useState<Tab>('hx');

  // Show only genuine PAST visits: drop the visit being consulted right now, and drop
  // empty placeholder records (no complaint / remedy / diagnosis / labs / vitals).
  const hasContent = (v: PatientHistoryVisit) => Boolean(
    (v.chiefComplaint && v.chiefComplaint.trim()) ||
    v.assessment ||
    v.prescriptions.length ||
    v.labResults.length ||
    v.vitals,
  );
  const allVisits = history?.visits || [];
  // History tab + Compare show genuine PAST visits only (exclude the current/empty one)…
  const visits = allVisits.filter(
    (v) => String(v.visitId ?? '') !== String(currentVisitId ?? '') && hasContent(v),
  );
  // …but Past Rx and Labs list everything, so a report just uploaded for this visit appears too.
  const allRx = allVisits.flatMap((v) => v.prescriptions.map((p) => ({ ...p, date: v.visitDate })));
  const allLabs = allVisits.flatMap((v) => v.labResults.map((l) => ({ ...l, visitDate: v.visitDate })));

  const vitalCells: { k: string; v: string }[] = currentVitals
    ? [
      { k: 'Weight', v: currentVitals.weightKg != null ? `${currentVitals.weightKg} kg` : '—' },
      { k: 'Height', v: currentVitals.heightCm != null ? `${currentVitals.heightCm} cm` : '—' },
      { k: 'BMI', v: currentVitals.bmi != null ? String(currentVitals.bmi) : '—' },
      { k: 'BP', v: currentVitals.systolicBp != null ? `${currentVitals.systolicBp}/${currentVitals.diastolicBp ?? '—'}` : '—' },
      { k: 'Pulse', v: currentVitals.pulseRate != null ? String(currentVitals.pulseRate) : '—' },
      { k: 'Temp', v: currentVitals.temperatureF != null ? `${currentVitals.temperatureF}°` : '—' },
      { k: 'SpO₂', v: currentVitals.oxygenSaturation != null ? `${currentVitals.oxygenSaturation}%` : '—' },
      { k: 'Resp', v: currentVitals.respiratoryRate != null ? String(currentVitals.respiratoryRate) : '—' },
      { k: 'LMP', v: currentVitals.lmpDate != null ? fmtDate(currentVitals.lmpDate) : '—' },
    ].filter(c => c.v !== '—')
    : [];

  return (
    <aside
      className={cn(
        'bg-white flex flex-col overflow-hidden z-40',
        // Mobile: fixed slide-over from the left. Desktop (lg): inline collapsible column.
        'fixed inset-y-0 left-0 w-[280px] shadow-2xl transition-transform duration-200',
        'lg:static lg:z-auto lg:shadow-none lg:shrink-0 lg:transition-[width] lg:translate-x-0',
        collapsed
          ? '-translate-x-full lg:w-0 lg:border-r-0'
          : 'translate-x-0 border-r border-[#E3E2DF] lg:w-[264px]',
      )}
    >
      {/* Patient card */}
      <div className="flex gap-3 items-center px-4 py-4 border-b border-[#E3E2DF]">
        <div className="w-[42px] h-[42px] rounded-[11px] bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shrink-0">
          {patientInitials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[14.5px] text-[#0F0F0E] truncate">{patientName}</div>
          <div className="text-[11.5px] text-[#888786] mt-0.5 font-mono">
            {patientAge ? `${patientAge}` : '—'} · {patientGender} · {mrn}
          </div>
        </div>
      </div>

      {/* Chief complaint */}
      {chiefComplaint && (
        <div className="px-[18px] py-3 border-b border-[#E3E2DF] relative">
          <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-[#D97706] rounded-r" />
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888786] mb-1.5">Chief complaint</div>
          <div className="text-[13px] font-medium leading-snug text-[#0F0F0E]">{chiefComplaint}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex-1 min-h-0 overflow-auto px-3.5 py-3">
        <div className="flex gap-1 flex-wrap mb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-2.5 py-1.5 text-[11.5px] font-medium rounded-md transition-colors',
                tab === t.key ? 'text-[#2563EB] bg-[#EFF6FF] font-semibold' : 'text-[#888786] hover:bg-[#F4F3F1]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isHistoryLoading && <p className="text-[12px] text-[#888786] italic px-1 py-3">Loading history…</p>}

        {/* History */}
        {!isHistoryLoading && tab === 'hx' && (
          <div className="space-y-2">
            {visits.length === 0 && <p className="text-[12px] text-[#888786] italic px-1 py-3">No previous visits.</p>}
            {visits.map((v, i) => {
              const remedy = v.prescriptions[0]
                ? `${v.prescriptions[0].remedyName}${v.prescriptions[0].potency ? ' ' + v.prescriptions[0].potency : ''}`
                : v.assessment || '—';
              return (
                <div key={i} className="p-3 border border-[#E3E2DF] rounded-md bg-[#FAFAF8]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] uppercase tracking-wide text-[#888786] font-medium">{fmtDate(v.visitDate)}</div>
                    <button
                      onClick={() => onCompare(v)}
                      className="text-[10.5px] font-semibold text-[#2563EB] border border-[#E3E2DF] bg-white rounded-md px-2.5 py-0.5 hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors"
                    >
                      Compare
                    </button>
                  </div>
                  <div className="text-[12px] leading-snug text-[#4A4A47]">
                    {v.chiefComplaint ? <span className="font-medium text-[#0F0F0E]">{v.chiefComplaint}</span> : null}
                    {v.chiefComplaint ? ' · ' : ''}{remedy}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vitals */}
        {!isHistoryLoading && tab === 'vit' && (
          <div>
            {vitalCells.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {vitalCells.map((c) => (
                  <div key={c.k} className="bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-2.5 py-1.5">
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888786]">{c.k}</div>
                    <div className="text-[13px] font-medium text-[#4A4A47] mt-0.5 font-mono">{c.v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#888786] italic px-1 py-3">No vitals recorded for this visit.</p>
            )}
            <button onClick={onUpdateVitals} className="mt-3 text-[10px] font-semibold text-[#2563EB] uppercase tracking-wide">
              Update vitals
            </button>
          </div>
        )}

        {/* Past Rx */}
        {!isHistoryLoading && tab === 'rx' && (
          <div>
            {allRx.length === 0 && <p className="text-[12px] text-[#888786] italic px-1 py-3">No past prescriptions.</p>}
            {allRx.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-2.5 border-b border-dashed border-[#E3E2DF] last:border-0">
                <span className="text-[13px] font-medium text-[#0F0F0E]">
                  {p.remedyName}{p.potency ? ` ${p.potency}` : ''}
                </span>
                <span className="text-[12px] text-[#888786] font-mono shrink-0">{fmtDate(p.date)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Labs */}
        {!isHistoryLoading && tab === 'lab' && (
          <div>
            <button
              onClick={() => onUploadLab?.()}
              className="w-full mb-3 h-9 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#2563EB] border border-dashed border-[#BFDBFE] bg-[#EFF6FF] rounded-md hover:bg-[#DBEAFE] transition-colors"
            >
              + Upload Lab Report
            </button>
            {allLabs.length === 0 && <p className="text-[12px] text-[#888786] italic px-1 py-3">No lab results.</p>}
            {allLabs.map((l, i) => (
              <button key={i} onClick={() => onViewLab?.(l)} className="w-full text-left py-2.5 border-b border-dashed border-[#E3E2DF] last:border-0 hover:bg-[#FAFAF8] px-1 -mx-1 rounded transition-colors cursor-pointer block">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#4A4A47]">{l.type}</span>
                  <span className="text-[12px] text-[#888786] font-mono shrink-0">{fmtDate(l.date || l.visitDate)}</span>
                </div>
                {l.summary && <div className="text-[11.5px] text-[#888786] mt-1 leading-snug line-clamp-2">{l.summary}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Back to queue */}
      <div className="px-[18px] py-3.5 border-t border-[#E3E2DF]">
        <button
          onClick={onBackToQueue}
          className="w-full text-[12px] font-medium text-[#4A4A47] border border-[#E3E2DF] bg-white rounded-md py-2.5 hover:bg-[#F4F3F1] transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Queue
        </button>
      </div>
    </aside>
  );
}
