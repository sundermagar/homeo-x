import { useState, type ReactNode } from 'react';
import { X, Upload, Loader2, ClipboardCheck, FlaskConical } from 'lucide-react';
import { api } from '../../../../lib/api-client';
import { useManageClinicalRecords } from '../../../medical-case/hooks/use-medical-cases';
import { toast } from '../../../../hooks/use-toast';

// ── Shared right-side drawer shell (matches the v2 modals) ──
function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-[480px] h-full overflow-auto p-6 relative animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#E2E8F0] text-[#64748B] flex items-center justify-center hover:bg-[#F8FAFC] hover:text-[#0F0F0E] transition-colors shadow-sm">
          <X className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-center gap-2.5 mb-1 mt-1">
          <FlaskConical className="h-5 w-5 text-[#2563EB]" />
          <h2 className="text-[20px] font-bold tracking-tight text-[#0F0F0E]">{title}</h2>
        </div>
        {subtitle && <p className="text-[13.5px] font-medium text-[#64748B] mb-8 ml-[30px]">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

// `data` is a flat object { "Test Name": "value with units" } (same shape as case history).
const META_KEYS = new Set(['summary', 'attachmenturl', 'attachment_url', 'investdate', 'invest_date', 'id', 'date', 'type', 'provider']);

function classifyFlag(v: string): 'hi' | 'lo' | 'ok' | null {
  const s = v.toLowerCase();
  if (/\(?\b(high|critical|↑)\b\)?|\bh\b|\bhi\b/.test(s)) return 'hi';
  if (/\(?\b(low|↓)\b\)?|\blo\b|\bl\b/.test(s)) return 'lo';
  if (/\(?\b(normal|ok)\b\)?/.test(s)) return 'ok';
  return null;
}

type LabRow = { name: string; value: string; flag: 'hi' | 'lo' | 'ok' | null };

function dataToRows(data: unknown): LabRow[] {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data as Record<string, any>)
    .filter(([k, v]) => !META_KEYS.has(k.toLowerCase()) && v != null && String(v).trim() !== '')
    .map(([k, v]) => ({ name: k, value: String(v), flag: classifyFlag(String(v)) }));
}

const FLAG_STYLE: Record<'hi' | 'lo' | 'ok', { label: string; cls: string }> = {
  hi: { label: 'HI', cls: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]' },
  lo: { label: 'LO', cls: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]' },
  ok: { label: 'OK', cls: 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]' },
};

function LabValues({ data }: { data: unknown }) {
  const rows = dataToRows(data);
  if (rows.length === 0) return null;
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-4 py-3 text-[13px] font-bold tracking-wide bg-[#F8FAFC] text-[#334155] border-b border-[#E2E8F0]">Values</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] last:border-0 bg-white hover:bg-[#F8FAFC] transition-colors">
          <span className="text-[13.5px] font-medium text-[#1E293B] flex-1 min-w-0">{r.name}</span>
          <span className="text-[13.5px] font-mono font-semibold text-[#0F0F0E] text-right">{r.value}</span>
          {r.flag && (
            <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md ${FLAG_STYLE[r.flag].cls}`}>{FLAG_STYLE[r.flag].label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryBlock({ text }: { text: string }) {
  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] mb-2 mt-2">Summary</div>
      <div className="text-[13.5px] font-medium leading-relaxed text-[#1E293B] bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-4 whitespace-pre-line hover:border-[#CBD5E1] transition-colors">{text}</div>
    </>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(iso); }
}

// ════ View an existing lab report (from history) ════
export function LabReportDrawer({ lab, onClose, onUseSummary }: { lab: any | null; onClose: () => void; onUseSummary?: (summary: string) => void }) {
  if (!lab) return null;
  const summary: string = lab.summary || (lab.data && typeof lab.data === 'object' ? lab.data.summary : '') || '';
  return (
    <Drawer title={lab.type || 'Lab report'} subtitle={fmtDate(lab.date || lab.visitDate)} onClose={onClose}>
      <LabValues data={lab.data} />
      {summary ? <SummaryBlock text={summary} /> : <p className="text-[12px] text-[#888786] italic">No summary available for this report.</p>}
      {onUseSummary && summary && (
        <button onClick={() => { onUseSummary(summary); onClose(); }} className="pp-btn-primary w-full mt-5 h-10 inline-flex items-center justify-center gap-2">
          <ClipboardCheck className="h-4 w-4" /> Use this summary
        </button>
      )}
    </Drawer>
  );
}

// ════ Upload a report → analyse (values + summary) → save & use ════
interface ParsedReport { type: string; data: Record<string, any>; summary: string; investDate: string; attachmentUrl?: string }

export function LabUploadDrawer({
  open, regid, visitId, onClose, onUseSummary, onSaved,
}: {
  open: boolean; regid?: number; visitId?: string;
  onClose: () => void; onUseSummary: (summary: string) => void; onSaved?: () => void;
}) {
  const { saveInvestigation } = useManageClinicalRecords();
  const [analysing, setAnalysing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [summary, setSummary] = useState('');
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') || f.type.startsWith('image/');
    if (!ok) { toast({ title: 'Unsupported format', description: 'Please select a PDF or image of the lab report.', variant: 'error' }); return; }
    setFileName(f.name);
    setParsed(null);
    setSummary('');
    setSaved(false);
    setAnalysing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      // Same analysis endpoint the case-history page uses → returns { parsed: { type, data, summary }, attachmentUrl }.
      // The fetch api client needs the /api prefix (unlike the axios apiClient used in case history).
      const res: any = await api.post('/api/medical-cases/records/investigations/upload', fd);
      const p = res?.parsed;
      if (!p) {
        toast({ title: 'Could not read the report', description: res?.error ? String(res.error).slice(0, 160) : 'No values were extracted — try a clearer photo or a text PDF.', variant: 'error' });
        return;
      }
      const next: ParsedReport = {
        type: p.type || 'Specific',
        data: p.data || {},
        summary: p.summary || '',
        investDate: p.date || new Date().toISOString().split('T')[0],
        attachmentUrl: res.attachmentUrl,
      };
      setParsed(next);
      setSummary(next.summary);

      // Auto-store the analysed report in Labs (with its date) as soon as it's read.
      if (regid) {
        try {
          await saveInvestigation.mutateAsync({
            regid,
            visitId: visitId ? Number(visitId) : undefined,
            type: next.type,
            data: next.data,
            investDate: next.investDate,
            summary: next.summary,
            attachmentUrl: next.attachmentUrl,
          });
          setSaved(true);
          onSaved?.();
          toast({ title: 'Report analysed & saved to Labs', variant: 'success' });
        } catch (err) {
          toast({ title: 'Analysed, but could not save to Labs', description: err instanceof Error ? err.message : '', variant: 'error' });
        }
      } else {
        toast({ title: 'Report analysed', variant: 'success' });
      }
    } catch (err) {
      toast({ title: 'Analysis failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
    } finally {
      setAnalysing(false);
    }
  };

  const handleUse = () => {
    onUseSummary(summary);
    onClose();
  };

  return (
    <Drawer title="Upload & analyse report" subtitle="Pick a PDF or photo — the AI extracts the values and a summary." onClose={onClose}>
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#BFDBFE] bg-[#EFF6FF] rounded-xl p-8 text-center cursor-pointer hover:bg-[#DBEAFE] transition-colors">
        <Upload className="h-6 w-6 text-[#2563EB]" />
        <span className="text-[13px] font-semibold text-[#2563EB]">{fileName ? 'Choose another file' : 'Click to choose a file'}</span>
        <span className="text-[11px] text-[#888786]">{fileName || 'Lab report — PDF or photo'}</span>
        <input type="file" accept="application/pdf,.pdf,image/*" onChange={handleFile} className="hidden" />
      </label>

      {analysing && (
        <div className="flex items-center gap-2 mt-4 text-[13px] text-[#2563EB] font-medium">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysing {fileName}…
        </div>
      )}

      {parsed && !analysing && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-semibold text-[#2563EB]">{parsed.type} · {fmtDate(parsed.investDate)}</span>
            {saved && <span className="text-[10px] font-bold uppercase tracking-wide text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded px-1.5 py-0.5">Saved to Labs</span>}
          </div>
          <LabValues data={parsed.data} />
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888786] mb-2">Summary</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            className="w-full text-[13px] leading-relaxed text-[#0F0F0E] border border-[#E3E2DF] rounded-lg p-3 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] resize-y"
          />
          <button onClick={handleUse} className="pp-btn-primary w-full mt-3 h-10 inline-flex items-center justify-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Use this summary
          </button>
        </div>
      )}
    </Drawer>
  );
}
