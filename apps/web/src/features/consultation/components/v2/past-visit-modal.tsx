import { X } from 'lucide-react';
import type { PatientHistoryVisit } from '../../../../hooks/use-patients';

interface PastVisitModalProps {
  open: boolean;
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

function Row({ k, v, muted }: { k: string; v: string | React.ReactNode; muted?: boolean }) {
  return (
    <div className="px-4 py-3.5 border-b border-[#E2E8F0] last:border-0 bg-white hover:bg-[#F8FAFC] transition-colors">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] mb-1.5">{k}</div>
      <div className={`text-[13.5px] font-medium leading-relaxed ${muted ? 'text-[#94A3B8] italic' : 'text-[#1E293B]'}`}>{v || '—'}</div>
    </div>
  );
}

export function PastVisitModal({ open, past, onClose }: PastVisitModalProps) {
  if (!open || !past) return null;

  const pastRemedy = past.prescriptions?.length
    ? past.prescriptions.map((p) => `${p.remedyName}${p.potency ? ' ' + p.potency : ''}${p.frequency ? ' (' + p.frequency + ')' : ''}${p.days ? ' for ' + p.days + ' days' : ''}`).join(', ')
    : '—';

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-[480px] h-full overflow-auto p-6 relative animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#E2E8F0] text-[#64748B] flex items-center justify-center hover:bg-[#F8FAFC] hover:text-[#0F0F0E] transition-colors shadow-sm">
          <X className="h-4.5 w-4.5" />
        </button>
        <h2 className="text-[20px] font-bold tracking-tight text-[#0F0F0E] mb-1">Visit Details</h2>
        <p className="text-[13.5px] font-medium text-[#64748B] mb-8">
          {fmtDate(past.visitDate)}
        </p>

        <div className="flex flex-col gap-5">
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 text-[13px] font-bold tracking-wide bg-[#F8FAFC] text-[#334155] border-b border-[#E2E8F0]">
              Clinical Information
            </div>
            <Row k="Chief Complaint" v={past.chiefComplaint || '—'} />
            <Row k="Assessment / Diagnosis" v={past.assessment || '—'} />
            <Row k="Prescription" v={pastRemedy} />
            <Row k="Advice" v={past.advice || '—'} />
            <Row
              k="Investigations / Labs"
              v={past.labResults?.length ? past.labResults.map((l) => l.type).join(', ') : '—'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
