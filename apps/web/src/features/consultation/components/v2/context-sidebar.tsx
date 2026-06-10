import { useState } from 'react';
import { ChevronLeft, Calendar, ChevronRight, Pill, FileText, ClipboardList, Scale, Ruler, Activity, HeartPulse, Thermometer, Droplets, Wind, Calculator, CalendarHeart, PlusCircle } from 'lucide-react';
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
  onViewPastVisit: (visit: PatientHistoryVisit) => void;
  onViewLab?: (lab: any) => void;
  onUploadLab?: () => void;
  onBackToQueue: () => void;
  onRepeatRx?: (prescription: any) => void;
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
  onViewPastVisit,
  onViewLab,
  onUploadLab,
  onBackToQueue,
  onRepeatRx,
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
  const allRx = allVisits.flatMap((v) => v.prescriptions.map((p) => ({ ...p, date: v.visitDate, advice: v.advice })));
  const allLabs = allVisits.flatMap((v) => v.labResults.map((l) => ({ ...l, visitDate: v.visitDate })));

  const vitalCells: { k: string; v: string; Icon: any }[] = currentVitals
    ? [
      { k: 'Weight', v: currentVitals.weightKg != null ? `${currentVitals.weightKg} kg` : '—', Icon: Scale },
      { k: 'Height', v: currentVitals.heightCm != null ? `${currentVitals.heightCm} cm` : '—', Icon: Ruler },
      { k: 'BMI', v: currentVitals.bmi != null ? String(currentVitals.bmi) : '—', Icon: Calculator },
      { k: 'BP', v: currentVitals.systolicBp != null ? `${currentVitals.systolicBp}/${currentVitals.diastolicBp ?? '—'}` : '—', Icon: Activity },
      { k: 'Pulse', v: currentVitals.pulseRate != null ? String(currentVitals.pulseRate) : '—', Icon: HeartPulse },
      { k: 'Temp', v: currentVitals.temperatureF != null ? `${currentVitals.temperatureF}°` : '—', Icon: Thermometer },
      { k: 'SpO₂', v: currentVitals.oxygenSaturation != null ? `${currentVitals.oxygenSaturation}%` : '—', Icon: Droplets },
      { k: 'Resp', v: currentVitals.respiratoryRate != null ? String(currentVitals.respiratoryRate) : '—', Icon: Wind },
      { k: 'LMP', v: currentVitals.lmpDate != null ? fmtDate(currentVitals.lmpDate) : '—', Icon: CalendarHeart },
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
          : 'translate-x-0 border-r border-[#E2E8F0] lg:w-[280px]',
      )}
    >
      {/* Patient card */}
      <div className="flex gap-3.5 items-center px-4 py-5 border-b border-[#E2E8F0] bg-white relative">
        <div className="w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-[17px] shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.25)] border border-white/10 ring-1 ring-black/5">
          {patientInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[16px] text-[#0F0F0E] truncate tracking-tight leading-tight">{patientName}</div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1 flex items-center gap-1.5 truncate">
            {patientAge ? `${patientAge} yrs` : '—'} <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" /> {patientGender} <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" /> <span className="font-mono text-[11px] font-semibold bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#475569] border border-[#E2E8F0]">{mrn}</span>
          </div>
        </div>
      </div>

      {/* Chief complaint */}
      {chiefComplaint && (
        <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-br from-[#F8FAFC] to-white relative overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] mb-1.5">Chief complaint</div>
          <div className="text-[13.5px] font-semibold leading-relaxed text-[#1E293B]">{chiefComplaint}</div>
        </div>
      )}

      {/* Tabs Header (Fixed) */}
      <div className="px-3.5 py-3 border-b border-[#E2E8F0] bg-white shrink-0 z-10">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 text-[11.5px] font-medium rounded-lg transition-all',
                tab === t.key ? 'text-[#2563EB] bg-[#EFF6FF] font-semibold shadow-sm ring-1 ring-[#BFDBFE]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F0F0E]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-auto px-3.5 py-3">
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
                <div key={i} className="group relative p-3.5 bg-white border border-[#E3E2DF] rounded-xl cursor-pointer hover:border-[#BFDBFE] hover:shadow-[0_2px_12px_rgba(37,99,235,0.08)] hover:bg-[#F8FAFC] transition-all duration-200" onClick={() => onViewPastVisit(v)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10.5px] uppercase tracking-wider font-semibold">{fmtDate(v.visitDate)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  
                  <div className="space-y-2.5">
                    {v.chiefComplaint && (
                      <div className="flex items-start gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-[#64748B] mt-0.5 shrink-0" />
                        <div className="text-[12.5px] font-medium text-[#0F0F0E] leading-snug line-clamp-2">
                          {v.chiefComplaint}
                        </div>
                      </div>
                    )}
                    
                    {remedy !== '—' && (
                      <div className="flex items-start gap-2">
                        <Pill className="w-3.5 h-3.5 text-[#3B82F6] mt-0.5 shrink-0" />
                        <div className="text-[12px] text-[#475569] leading-snug">
                          {remedy}
                        </div>
                      </div>
                    )}
                    
                    {!v.chiefComplaint && remedy === '—' && (
                      <div className="text-[12px] italic text-[#888786]">Empty record</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vitals */}
        {!isHistoryLoading && tab === 'vit' && (
          <div className="flex flex-col h-full space-y-2.5">
            <div>
              <button 
                onClick={onUpdateVitals} 
                className="w-full flex items-center justify-center gap-2 bg-[#F8FAFC] border border-dashed border-[#BFDBFE] hover:bg-[#EFF6FF] hover:border-[#3B82F6] hover:text-[#2563EB] text-[#3B82F6] text-[12px] font-semibold py-2.5 rounded-xl transition-all mb-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Update Vitals</span>
              </button>
            </div>
            
            <div className="overflow-y-auto pb-4">
              {vitalCells.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {vitalCells.map((c) => (
                    <div key={c.k} className="bg-white border border-[#E3E2DF] rounded-xl px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-colors hover:border-[#BFDBFE]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <c.Icon className="w-3.5 h-3.5 text-[#64748B]" />
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{c.k}</div>
                      </div>
                      <div className="text-[14px] font-semibold text-[#0F0F0E] font-mono tracking-tight">{c.v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#888786] italic px-1 py-3">No vitals recorded for this visit.</p>
              )}
            </div>
          </div>
        )}

        {/* Past Rx */}
        {!isHistoryLoading && tab === 'rx' && (
          <div className="space-y-2.5">
            {allRx.length === 0 && <p className="text-[12px] text-[#888786] italic px-1 py-3">No past prescriptions.</p>}
            {allRx.map((p, i) => (
              <div key={i} className="group flex items-center justify-between gap-3 p-3 bg-white border border-[#E3E2DF] rounded-xl hover:border-[#BFDBFE] hover:shadow-[0_2px_12px_rgba(37,99,235,0.08)] hover:bg-[#F8FAFC] transition-all duration-200">
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 text-[#64748B]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">{fmtDate(p.date)}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-[#3B82F6] mt-0.5 shrink-0" />
                    <span className="text-[13px] font-medium text-[#0F0F0E] leading-snug">
                      {p.remedyName}{p.potency ? ` ${p.potency}` : ''}
                    </span>
                  </div>
                </div>
                {onRepeatRx && (
                  <button
                    onClick={() => onRepeatRx(p)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-2.5 py-1.5 hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] transition-all shrink-0 shadow-sm"
                    title="Repeat this medicine in the manual form"
                  >
                    Repeat
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Labs */}
        {!isHistoryLoading && tab === 'lab' && (
          <div className="flex flex-col h-full space-y-2.5">
            <div>
              <button
                onClick={() => onUploadLab?.()}
                className="w-full flex items-center justify-center gap-2 bg-[#F8FAFC] border border-dashed border-[#BFDBFE] hover:bg-[#EFF6FF] hover:border-[#3B82F6] hover:text-[#2563EB] text-[#3B82F6] text-[12px] font-semibold py-2.5 rounded-xl transition-all mb-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload Lab Report</span>
              </button>
            </div>
            
            {allLabs.length === 0 && <p className="text-[12px] text-[#888786] italic px-1 py-3">No lab results.</p>}
            
            <div className="space-y-2.5 overflow-y-auto pb-4">
              {allLabs.map((l, i) => (
                <button 
                  key={i} 
                  onClick={() => onViewLab?.(l)} 
                  className="w-full text-left p-3 bg-white border border-[#E3E2DF] rounded-xl hover:border-[#BFDBFE] hover:shadow-[0_2px_12px_rgba(37,99,235,0.08)] hover:bg-[#F8FAFC] transition-all duration-200 block group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">{fmtDate(l.date || l.visitDate)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  
                  <div className="flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#8B5CF6] mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12.5px] font-medium text-[#0F0F0E] leading-snug">{l.type}</span>
                      {l.summary && <div className="text-[11.5px] text-[#64748B] mt-1 leading-snug line-clamp-2">{l.summary}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
