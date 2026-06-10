import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useRecordVitals } from '../../../../hooks/use-visits';
import { toast } from '../../../../hooks/use-toast';
import type { Vitals } from '../../../../types/visit';

interface VitalsModalProps {
  open: boolean;
  visitId: string;
  /** Patient registration id — stamped on the saved vitals so they appear in patient history. */
  regid?: number;
  existingVitals?: Vitals | null;
  onClose: () => void;
  onSaved: () => void;
}

const FIELDS: { key: string; label: string; unit?: string; vitalKey: keyof Vitals; type?: string }[] = [
  { key: 'heightCm', label: 'Height', unit: 'cm', vitalKey: 'heightCm' },
  { key: 'weightKg', label: 'Weight', unit: 'kg', vitalKey: 'weightKg' },
  { key: 'systolicBp', label: 'BP (systolic)', unit: 'mmHg', vitalKey: 'systolicBp' },
  { key: 'diastolicBp', label: 'BP (diastolic)', unit: 'mmHg', vitalKey: 'diastolicBp' },
  { key: 'pulseRate', label: 'Pulse', unit: 'bpm', vitalKey: 'pulseRate' },
  { key: 'temperatureF', label: 'Temp', unit: '°F', vitalKey: 'temperatureF' },
  { key: 'oxygenSaturation', label: 'SpO₂', unit: '%', vitalKey: 'oxygenSaturation' },
  { key: 'respiratoryRate', label: 'Resp. rate', unit: '/min', vitalKey: 'respiratoryRate' },
  { key: 'lmpDate', label: 'LMP', vitalKey: 'lmpDate', type: 'date' },
];

export function VitalsModal({ open, visitId, regid, existingVitals, onClose, onSaved }: VitalsModalProps) {
  const recordVitals = useRecordVitals(visitId);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      FIELDS.forEach((f) => {
        const v = existingVitals?.[f.vitalKey];
        init[f.key] = v != null ? String(v) : '';
      });
      setValues(init);
    }
  }, [open, existingVitals]);

  if (!open) return null;

  const bmi = (() => {
    const h = parseFloat(values['heightCm'] || '');
    const w = parseFloat(values['weightKg'] || '');
    if (h > 0 && w > 0) return (w / Math.pow(h / 100, 2)).toFixed(1);
    return '—';
  })();

  const handleSave = async () => {
    const payload: Record<string, any> = {};
    if (regid != null && !isNaN(regid)) payload['regid'] = regid;
    FIELDS.forEach((f) => {
      if (f.type === 'date') {
        if (values[f.key]) payload[f.key] = values[f.key];
      } else {
        const num = parseFloat(values[f.key] || '');
        if (!isNaN(num)) payload[f.key] = num;
      }
    });
    try {
      await recordVitals.mutateAsync(payload as any);
      toast({ title: 'Vitals updated', variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to save vitals', description: err instanceof Error ? err.message : '', variant: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex justify-end bg-gray-900/40 backdrop-blur-[4px]" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-[440px] h-full overflow-auto relative animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-5 border-b border-[#F1F5F9]">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#E2E8F0] text-[#64748B] flex items-center justify-center hover:bg-[#F8FAFC] hover:text-[#0F0F0E] transition-colors">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-[20px] font-bold tracking-tight text-[#0F0F0E]">Update Vitals</h2>
          <p className="text-[13px] text-[#64748B] mt-1">Recorded values sync immediately to the sidebar.</p>
        </div>

        <div className="p-6 pb-24 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-4 group">
              <label className="w-[120px] shrink-0 text-[13px] font-medium text-[#475569] group-focus-within:text-[#2563EB] transition-colors">{f.label}</label>
              <div className="flex-1 relative">
                <input
                  type={f.type || 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  inputMode={f.type === 'date' ? undefined : 'decimal'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#0F0F0E] font-medium outline-none focus:border-[#3B82F6] focus:ring-4 focus:ring-[#EFF6FF] transition-all hover:border-[#CBD5E1]"
                  placeholder={f.type === 'date' ? '' : '0'}
                />
              </div>
              <span className="w-[44px] text-[12px] font-medium text-[#94A3B8]">{f.unit || ''}</span>
            </div>
          ))}
          
          <div className="pt-4 mt-4 border-t border-[#F1F5F9] flex items-center gap-4">
            <label className="w-[120px] shrink-0 text-[13px] font-medium text-[#475569]">BMI</label>
            <div className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[14px] font-semibold text-[#0F0F0E] font-mono shadow-inner shadow-black/5">{bmi}</div>
            <span className="w-[44px] text-[12px] font-medium text-[#94A3B8]">kg/m²</span>
          </div>
        </div>

        <div className="fixed bottom-0 right-0 w-full max-w-[440px] p-5 bg-white border-t border-[#F1F5F9]">
          <button
            onClick={handleSave}
            disabled={recordVitals.isPending}
            className="w-full h-[46px] rounded-xl flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-[14px] font-semibold transition-all disabled:opacity-60 shadow-[0_2px_10px_rgba(37,99,235,0.2)]"
          >
            {recordVitals.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Vitals'}
          </button>
        </div>
      </div>
    </div>
  );
}
