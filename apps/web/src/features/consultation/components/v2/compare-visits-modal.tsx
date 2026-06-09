import { X } from 'lucide-react';
import type { PatientHistoryVisit } from '../../../../hooks/use-patients';

interface CurrentVisitSummary {
  dateLabel: string;
  chiefComplaint: string;
  remedy: string;
  symptoms: string;
}

interface CompareVisitsModalProps {
  open: boolean;
  current: CurrentVisitSummary;
  past: PatientHistoryVisit | null;
  onClose: () => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="px-3 py-2.5 border-b border-[#F4F3F1] last:border-0">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#888786]">{k}</div>
      <div className={`text-[12.5px] mt-1 leading-snug ${muted ? 'text-[#888786] italic' : 'text-[#4A4A47]'}`}>{v || '—'}</div>
    </div>
  );
}

export function CompareVisitsModal({ open, current, past, onClose }: CompareVisitsModalProps) {
  if (!open) return null;

  const pastRemedy = past?.prescriptions?.length
    ? past.prescriptions.map((p) => `${p.remedyName}${p.potency ? ' ' + p.potency : ''}`).join(', ')
    : '—';

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-[480px] h-full overflow-auto p-6 relative animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[#E3E2DF] text-[#888786] flex items-center justify-center hover:bg-[#F4F3F1]">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-[#0F0F0E]">Compare visits</h2>
        <p className="text-[13px] text-[#4A4A47] mt-1 mb-6">
          This visit ({current.dateLabel}) vs {fmtDate(past?.visitDate || null)}
        </p>

        <div className="flex flex-col gap-4">
          <div className="border border-[#E3E2DF] rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 text-[12px] font-semibold bg-[#EFF6FF] text-[#2563EB] border-b border-[#E3E2DF]">
              This visit · {current.dateLabel}
            </div>
            <Row k="Complaint" v={current.chiefComplaint} />
            <Row k="Remedy" v={current.remedy} />
            <Row k="Key symptoms" v={current.symptoms} />
            <Row k="Outcome" v="Pending" muted />
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="h-6 w-[1px] bg-[#E3E2DF]"></div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#888786] px-2 bg-white">VS</div>
            <div className="h-6 w-[1px] bg-[#E3E2DF]"></div>
          </div>

          <div className="border border-[#E3E2DF] rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 text-[12px] font-semibold bg-[#F4F3F1] text-[#4A4A47] border-b border-[#E3E2DF]">
              {fmtDate(past?.visitDate || null)}
            </div>
            <Row k="Complaint" v={past?.chiefComplaint || '—'} />
            <Row k="Remedy" v={pastRemedy} />
            <Row k="Diagnosis" v={past?.assessment || '—'} />
            <Row
              k="Labs"
              v={past?.labResults?.length ? past.labResults.map((l) => l.type).join(', ') : '—'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
