import { ArrowLeft, CheckCircle, Trash2, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';

interface PrescriptionReviewProps {
  rxItems: CreatePrescriptionItemInput[]; onRxItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  advice: string; onAdviceChange: (val: string) => void;
  followUp: string; onFollowUpChange: (val: string) => void;
  diagnoses: string[]; onDiagnosesChange: (val: string[]) => void;
  patient?: { id: string; name: string; age?: number; gender?: string; allergies?: string[]; } | null;
  visit?: { id: string; visitDate: string; refNo?: string; } | null;
  onBack: () => void; onComplete: () => void; isCompleting: boolean;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 style={{ fontSize: 10, fontWeight: 900, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 0.5rem' }}>{children}</h3>
);

const transparentInput: React.CSSProperties = { border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, height: 'auto' };

export function PrescriptionReview({ rxItems, onRxItemsChange, advice, onAdviceChange, followUp, onFollowUpChange, diagnoses, onDiagnosesChange, patient, visit, onBack, onComplete, isCompleting }: PrescriptionReviewProps) {
  const adviceRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (adviceRef.current) { adviceRef.current.style.height = 'auto'; adviceRef.current.style.height = `${adviceRef.current.scrollHeight}px`; } }, [advice]);

  const handleUpdateItem = (index: number, field: keyof CreatePrescriptionItemInput, value: string) => {
    const next = [...rxItems]; next[index] = { ...next[index], [field]: value }; onRxItemsChange(next);
  };
  const handleRemoveItem = (index: number) => onRxItemsChange(rxItems.filter((_, i) => i !== index));
  const handleAddItem = () => onRxItemsChange([...rxItems, { medicationName: '', genericName: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' }]);

  const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const divider12: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' };

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out', background: 'var(--bg-card)', boxShadow: 'var(--shadow-2xl)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-light)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>

      {/* Clinic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--text-primary)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>MMC Clinic</h1>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>Dr. Sarah M. Richardson — MBBS, MD (Family Medicine)</p>
            <p style={{ margin: 0 }}>Reg. No. MCI-IL-0362019 · +1 (217) 555-0198</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ color: 'var(--text-disabled)', margin: 0 }}>{formattedDate}</p>
          <p style={{ margin: 0 }}>Ref #RX-{visit?.id.slice(-5).toUpperCase() || '2026-00847'}</p>
        </div>
      </div>

      {/* Patient Details */}
      <section>
        <SectionLabel>Patient Details</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
          {[
            { l: 'Patient Name', v: patient?.name || 'John A. Patterson', style: {} },
            { l: 'Age / Sex',    v: `${patient?.age ? `${patient.age} yrs` : '40 yrs'} · ${patient?.gender?.[0] || 'M'}`, style: {} },
            { l: 'Patient ID',   v: patient?.id || 'PT-GF-00421', style: {} },
            { l: 'Allergy',      v: patient?.allergies?.length ? patient.allergies.join(', ') : 'None Reported', style: { color: patient?.allergies?.length ? 'var(--color-error-600)' : 'inherit' } },
          ].map((cell, i, arr) => (
            <div key={i} style={{ padding: '0.75rem', borderRight: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>{cell.l}</label>
              <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, ...cell.style }}>{cell.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diagnosis */}
      <section>
        <SectionLabel>Diagnosis</SectionLabel>
        <Input value={diagnoses.join(', ')} onChange={e => onDiagnosesChange(e.target.value.split(',').map(s => s.trim()))} style={{ ...transparentInput, fontSize: 'var(--font-size-lg)', fontWeight: 900 }} placeholder="e.g. Acute Upper Respiratory Tract Infection..." />
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontWeight: 500, fontStyle: 'italic', margin: '4px 0 0' }}>Seasonal Allergic Rhinitis (ICD-10: J06.9, J30.9)</p>
      </section>

      {/* Medicines */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>Medicines</SectionLabel>
          <Button variant="ghost" size="sm" onClick={handleAddItem} style={{ height: '1.5rem', fontSize: 10, textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-success-600)', background: 'rgba(240,253,244,0.5)' }}>
            <Plus style={{ width: 12, height: 12, marginRight: 4 }} /> Add Medicine
          </Button>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 5fr 2fr 2fr 2fr', gap: '1rem', fontSize: 10, fontWeight: 900, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.5rem', paddingLeft: '0.5rem' }}>
            <div style={{ textAlign: 'center' }}>#</div><div>Medicine</div><div>Dose</div><div>Frequency</div><div>Duration</div>
          </div>
          <div style={{ borderBottom: '2px solid var(--text-primary)' }}>
            {rxItems.length === 0 ? <p style={{ padding: '2.5rem 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-disabled)', fontStyle: 'italic', textAlign: 'center', fontWeight: 500 }}>No medications prescribed yet.</p> : rxItems.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 5fr 2fr 2fr 2fr', gap: '1rem', padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-light)', alignItems: 'center', transition: 'background var(--transition-fast)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-disabled)' }}>{idx + 1}.</div>
                <div style={{ position: 'relative' }}>
                  <Input value={item.medicationName} onChange={e => handleUpdateItem(idx, 'medicationName', e.target.value)} style={{ ...transparentInput, fontSize: 'var(--font-size-sm)', fontWeight: 900 }} placeholder="Amoxicillin 500mg Capsules" />
                  {item.instructions && <p style={{ fontSize: 10, color: 'var(--text-disabled)', fontStyle: 'italic', marginTop: 2 }}>{item.instructions}</p>}
                </div>
                <Input value={item.dosage} onChange={e => handleUpdateItem(idx, 'dosage', e.target.value)} style={{ ...transparentInput, fontSize: 'var(--font-size-xs)', fontWeight: 700 }} placeholder="500mg" />
                <Input value={item.frequency} onChange={e => handleUpdateItem(idx, 'frequency', e.target.value)} style={{ ...transparentInput, fontSize: 'var(--font-size-xs)', fontWeight: 700 }} placeholder="3x daily" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
                  <Input value={item.duration} onChange={e => handleUpdateItem(idx, 'duration', e.target.value)} style={{ ...transparentInput, fontSize: 'var(--font-size-xs)', fontWeight: 700 }} placeholder="7 days" />
                  <button onClick={() => handleRemoveItem(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', transition: 'color var(--transition-fast)', padding: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error-500)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advice & Follow-up */}
      <div style={{ ...divider12, paddingTop: '1rem' }}>
        <div>
          <SectionLabel>Advice</SectionLabel>
          <Textarea ref={adviceRef} value={advice} onChange={e => onAdviceChange(e.target.value)} style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, fontSize: 'var(--font-size-xs)', fontWeight: 500, lineHeight: 1.6, minHeight: '2.5rem', resize: 'none', overflow: 'hidden' }} placeholder="• Take all medications after meals..." />
        </div>
        <div>
          <SectionLabel>Follow-up</SectionLabel>
          <Input value={followUp} onChange={e => onFollowUpChange(e.target.value)} style={{ ...transparentInput, fontSize: 'var(--font-size-sm)', fontWeight: 900 }} placeholder="Within 7 days to assess response..." />
          <p style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, fontStyle: 'italic', margin: '4px 0 0' }}>(Approx. {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})</p>
        </div>
      </div>

      {/* Signature */}
      <div style={{ paddingTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', minWidth: '15rem' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Dr. Sarah M. Richardson</p>
          <div style={{ fontSize: 9, color: 'var(--text-disabled)', fontWeight: 700 }}>
            <p style={{ textTransform: 'uppercase', margin: 0 }}>MBBS, MD (Family Medicine)</p>
            <p style={{ margin: 0 }}>DEA: AR5839217 | NPI: 1234567890</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ paddingTop: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-light)' }}>
        <Button variant="ghost" onClick={onBack} style={{ height: '3rem', padding: '0 1.5rem', color: 'var(--text-tertiary)', fontWeight: 900, borderRadius: 'var(--radius-xl)', gap: '0.5rem', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em' }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </Button>
        <Button onClick={onComplete} disabled={isCompleting} style={{ height: '3rem', padding: '0 2.5rem', background: 'var(--text-primary)', color: 'white', fontWeight: 900, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-2xl)', gap: '0.75rem', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em', transition: 'all 0.2s' }}>
          {isCompleting ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 16, height: 16 }} />}
          {isCompleting ? 'Finalizing...' : 'Complete & Next Patient'}
        </Button>
      </div>
    </div>
  );
}
