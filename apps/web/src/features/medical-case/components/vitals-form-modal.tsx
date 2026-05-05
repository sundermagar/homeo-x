import { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Activity, Scale, MoveVertical, Thermometer, Heart, Wind, Droplets, Loader2, Save } from 'lucide-react';
import { useManageClinicalRecords } from '../hooks/use-medical-cases';
import '../styles/medical-case.css';

interface VitalsFormModalProps {
  visitId: number;
  regid: number;
  initialData?: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VitalsFormModal({ visitId, regid, initialData, onClose, onSuccess }: VitalsFormModalProps) {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');

  const [form, setForm] = useState({
    height: initialData?.heightCm || '',
    weight: initialData?.weightKg || '',
    temperatureF: initialData?.temperatureF || '',
    pulseRate: initialData?.pulseRate || '',
    systolicBp: initialData?.systolicBp || '',
    diastolicBp: initialData?.diastolicBp || '',
    respiratoryRate: initialData?.respiratoryRate || '',
    oxygenSaturation: initialData?.oxygenSaturation || '',
    lmpDate: initialData?.lmpDate || '',
    notes: initialData?.notes || '',
  });

  const { saveVitals } = useManageClinicalRecords();

  // Normalized values for database
  const normalizedHeight = useMemo(() => {
    if (!form.height) return null;
    const h = parseFloat(form.height);
    return heightUnit === 'in' ? h * 2.54 : h;
  }, [form.height, heightUnit]);

  const normalizedWeight = useMemo(() => {
    if (!form.weight) return null;
    const w = parseFloat(form.weight);
    return weightUnit === 'lbs' ? w / 2.20462 : w;
  }, [form.weight, weightUnit]);

  // BMI Calculation
  const bmi = useMemo(() => {
    if (normalizedHeight && normalizedWeight && normalizedHeight > 0) {
      const hInMeters = normalizedHeight / 100;
      return parseFloat((normalizedWeight / (hInMeters * hInMeters)).toFixed(1));
    }
    return null;
  }, [normalizedHeight, normalizedWeight]);

  const handleUnitToggle = (type: 'weight' | 'height') => {
    if (type === 'weight') {
      const current = parseFloat(form.weight);
      if (current) {
        const next = weightUnit === 'kg' ? (current * 2.20462).toFixed(1) : (current / 2.20462).toFixed(1);
        setForm(prev => ({ ...prev, weight: next }));
      }
      setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg');
    } else {
      const current = parseFloat(form.height);
      if (current) {
        const next = heightUnit === 'cm' ? (current / 2.54).toFixed(1) : (current * 2.54).toFixed(1);
        setForm(prev => ({ ...prev, height: next }));
      }
      setHeightUnit(heightUnit === 'cm' ? 'in' : 'cm');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveVitals.mutateAsync({
        visitId,
        regid,
        heightCm: normalizedHeight,
        weightKg: normalizedWeight,
        bmi,
        temperatureF: form.temperatureF ? parseFloat(form.temperatureF) : null,
        pulseRate: form.pulseRate ? parseInt(form.pulseRate) : null,
        systolicBp: form.systolicBp ? parseInt(form.systolicBp) : null,
        diastolicBp: form.diastolicBp ? parseInt(form.diastolicBp) : null,
        respiratoryRate: form.respiratoryRate ? parseInt(form.respiratoryRate) : null,
        oxygenSaturation: form.oxygenSaturation ? parseFloat(form.oxygenSaturation) : null,
        lmpDate: form.lmpDate || null,
        notes: form.notes || null,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save vitals:', err);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px' }}>
        <header className="mc-drawer-header" style={{ background: 'var(--pp-blue)', color: 'white' }}>
          <div className="mc-drawer-header-title">
            <Activity size={18} /> Record Clinical Vitals
          </div>
          <button className="mc-drawer-close" onClick={onClose} style={{ color: 'white', opacity: 0.8 }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ padding: '16px 24px', background: 'var(--pp-warm-1)', borderBottom: '1px solid var(--pp-warm-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', fontWeight: 800, textTransform: 'uppercase' }}>Patient Context</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--pp-ink)' }}>Visit ID: #{visitId}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', fontWeight: 800, textTransform: 'uppercase' }}>Reg ID</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--pp-ink)' }}>PT-{regid}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mc-drawer-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg-card)' }}>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>

            {/* Physical Stats Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--pp-blue)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Weight</label>
                    <button type="button" onClick={() => handleUnitToggle('weight')} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>{weightUnit.toUpperCase()}</button>
                  </div>
                  <input type="number" step="0.1" name="weight" value={form.weight} onChange={handleChange} placeholder={`0.0 ${weightUnit}`} className="pp-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Height</label>
                    <button type="button" onClick={() => handleUnitToggle('height')} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>{heightUnit.toUpperCase()}</button>
                  </div>
                  <input type="number" step="0.1" name="height" value={form.height} onChange={handleChange} placeholder={`0.0 ${heightUnit}`} className="pp-input" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>BMI</label>
                  <div style={{
                    height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: bmi && (bmi > 25 || bmi < 18.5) ? 'var(--pp-danger-bg)' : 'var(--pp-success-bg)',
                    color: bmi && (bmi > 25 || bmi < 18.5) ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)',
                    borderRadius: '10px', fontWeight: 800, fontSize: '1rem', border: '1px solid currentColor'
                  }}>
                    {bmi || '--'}
                  </div>
                </div>
              </div>
            </div>

            {/* Vitals Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--pp-blue)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cardio & Respiratory</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>BP (Systolic)</label>
                  <input type="number" name="systolicBp" value={form.systolicBp} onChange={handleChange} placeholder="120" className="pp-input" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>BP (Diastolic)</label>
                  <input type="number" name="diastolicBp" value={form.diastolicBp} onChange={handleChange} placeholder="80" className="pp-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Pulse (bpm)</label>
                  <input type="number" name="pulseRate" value={form.pulseRate} onChange={handleChange} placeholder="72" className="pp-input" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Temp (°F)</label>
                  <input type="number" step="0.1" name="temperatureF" value={form.temperatureF} onChange={handleChange} placeholder="98.6" className="pp-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>SpO2 (%)</label>
                  <input type="number" step="0.1" name="oxygenSaturation" value={form.oxygenSaturation} onChange={handleChange} placeholder="98" className="pp-input" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Resp. Rate</label>
                  <input type="number" name="respiratoryRate" value={form.respiratoryRate} onChange={handleChange} placeholder="18" className="pp-input" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>LMP (Last Menstrual Period)</label>
                <input type="date" name="lmpDate" value={form.lmpDate} onChange={handleChange} className="pp-input" />
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-2)' }}>Clinical Findings</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Observe physical appearance, patient complaints, etc."
                className="pp-textarea"
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>

          <footer style={{ padding: '24px', background: 'var(--pp-warm-1)', borderTop: '1px solid var(--pp-warm-3)', display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px' }} disabled={saveVitals.isPending}>
              {saveVitals.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Vitals Record
            </button>
          </footer>
        </form>
      </div>
    </>,
    document.body
  );
}
