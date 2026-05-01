import { useState, useEffect } from 'react';
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
  const [form, setForm] = useState({
    heightCm: initialData?.heightCm || '',
    weightKg: initialData?.weightKg || '',
    temperatureF: initialData?.temperatureF || '',
    pulseRate: initialData?.pulseRate || '',
    systolicBp: initialData?.systolicBp || '',
    diastolicBp: initialData?.diastolicBp || '',
    respiratoryRate: initialData?.respiratoryRate || '',
    oxygenSaturation: initialData?.oxygenSaturation || '',
    lmpDate: initialData?.lmpDate || '',
    notes: initialData?.notes || '',
  });

  const [bmi, setBmi] = useState<number | null>(null);
  const { saveVitals } = useManageClinicalRecords();

  // Auto-calculate BMI
  useEffect(() => {
    const h = parseFloat(form.heightCm);
    const w = parseFloat(form.weightKg);
    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const b = w / (heightInMeters * heightInMeters);
      setBmi(parseFloat(b.toFixed(1)));
    } else {
      setBmi(null);
    }
  }, [form.heightCm, form.weightKg]);

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
        heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
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
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel">
        <header className="appt-drawer-header">
          <div>
            <h2 className="appt-drawer-title">Record Vitals / Triage</h2>
            <p className="appt-header-sub" style={{ marginTop: 4 }}>Patient ID: PT-{regid} · Visit Reference: #{visitId}</p>
          </div>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="appt-drawer-body" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="mc-form-grid" style={{ flex: 1 }}>
            
            {/* Height & Weight Section */}
            <div className="mc-form-section">
              <div className="mc-section-header">Physical Stats</div>
              <div className="mc-input-row">
                <div className="mc-input-group">
                  <label>Weight (kg)</label>
                  <div className="mc-input-wrap">
                    <Scale className="mc-input-icon" size={14} />
                    <input type="number" step="0.1" name="weightKg" value={form.weightKg} onChange={handleChange} placeholder="0.0" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>Height (cm)</label>
                  <div className="mc-input-wrap">
                    <MoveVertical className="mc-input-icon" size={14} />
                    <input type="number" step="1" name="heightCm" value={form.heightCm} onChange={handleChange} placeholder="0" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>Calculated BMI</label>
                  <div className="mc-bmi-display" data-status={bmi && bmi > 25 ? 'warning' : 'normal'}>
                    {bmi || '--'}
                  </div>
                </div>
              </div>
            </div>

            {/* Vitals Section */}
            <div className="mc-form-section">
              <div className="mc-section-header">Critical Vitals</div>
              <div className="mc-input-row">
                <div className="mc-input-group">
                  <label>Blood Pressure (Systolic)</label>
                  <div className="mc-input-wrap">
                    <Heart className="mc-input-icon" size={14} />
                    <input type="number" name="systolicBp" value={form.systolicBp} onChange={handleChange} placeholder="120" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>BP (Diastolic)</label>
                  <div className="mc-input-wrap">
                    <input type="number" name="diastolicBp" value={form.diastolicBp} onChange={handleChange} placeholder="80" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>Pulse (bpm)</label>
                  <div className="mc-input-wrap">
                    <Heart className="mc-input-icon pulse-icon" size={14} />
                    <input type="number" name="pulseRate" value={form.pulseRate} onChange={handleChange} placeholder="72" />
                  </div>
                </div>
              </div>

              <div className="mc-input-row" style={{ marginTop: 12 }}>
                <div className="mc-input-group">
                  <label>Temperature (°F)</label>
                  <div className="mc-input-wrap">
                    <Thermometer className="mc-input-icon" size={14} />
                    <input type="number" step="0.1" name="temperatureF" value={form.temperatureF} onChange={handleChange} placeholder="98.6" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>SpO2 (%)</label>
                  <div className="mc-input-wrap">
                    <Droplets className="mc-input-icon" size={14} />
                    <input type="number" step="0.1" name="oxygenSaturation" value={form.oxygenSaturation} onChange={handleChange} placeholder="98" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>Resp. Rate</label>
                  <div className="mc-input-wrap">
                    <Wind className="mc-input-icon" size={14} />
                    <input type="number" name="respiratoryRate" value={form.respiratoryRate} onChange={handleChange} placeholder="18" />
                  </div>
                </div>
                <div className="mc-input-group">
                  <label>LMP (Last Menstrual Period)</label>
                  <div className="mc-input-wrap">
                    <input type="date" name="lmpDate" value={form.lmpDate} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mc-input-group" style={{ gridColumn: 'span 2' }}>
              <label>Clinical Findings (Examination)</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Physical appearance, patient complaints, etc." rows={3} />
            </div>
          </div>

          <footer className="appt-form-actions" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="appt-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="appt-btn appt-btn-primary" disabled={saveVitals.isPending}>
              {saveVitals.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Vitals
            </button>
          </footer>
        </form>
      </div>
    </>,
    document.body
  );
}
