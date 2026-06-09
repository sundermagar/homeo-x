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
    <div className="fixed inset-0 z-[400] flex justify-end bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-[440px] h-full overflow-auto p-6 relative animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[#E3E2DF] text-[#888786] flex items-center justify-center hover:bg-[#F4F3F1]">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-[#0F0F0E]">Update vitals</h2>
        <p className="text-[13px] text-[#4A4A47] mt-1 mb-4">Recorded values sync to the sidebar.</p>

        <div className="space-y-2.5">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <label className="w-[120px] shrink-0 text-[12px] font-medium text-[#4A4A47]">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                inputMode={f.type === 'date' ? undefined : 'decimal'}
                className="flex-1 px-3 py-2 rounded-md border border-[#E3E2DF] text-[13px] text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF]"
              />
              <span className="w-[44px] text-[11px] text-[#888786]">{f.unit || ''}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <label className="w-[120px] shrink-0 text-[12px] font-medium text-[#4A4A47]">BMI</label>
            <div className="flex-1 px-3 py-2 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] text-[13px] text-[#4A4A47] font-mono">{bmi}</div>
            <span className="w-[44px] text-[11px] text-[#888786]">kg/m²</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={recordVitals.isPending}
          className="pp-btn-primary w-full mt-5 h-10 inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {recordVitals.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save vitals'}
        </button>
      </div>
    </div>
  );
}
