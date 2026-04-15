import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronRight, MessageSquare } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import type { GnmAnalysis, ScoredRemedy } from '../../../../types/ai';
import type { CreatePrescriptionItemInput } from '../../../../types/prescription';
import './stages.css';

interface PrescriptionStageProps {
  visitId: string;
  rxItems: CreatePrescriptionItemInput[];
  onRxItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  advice: string;
  onAdviceChange: (val: string) => void;
  followUp: string;
  onFollowUpChange: (val: string) => void;
  diagnoses: string[];
  soapData?: { subjective?: string; objective?: string; plan?: string };
  patient?: { name: string; age?: number; gender?: string; mrn?: string } | null;
  gnmAnalysis: GnmAnalysis | null;
  scoredRemedies: ScoredRemedy[];
  onComplete: () => void;
  isCompleting: boolean;
  onPrescriptionStepChange?: (step: number, generateFn: () => void) => void;
}

const POTENCIES = ['6C', '30C', '200C', '1M', '10M', 'LM1'];
const ROUTES    = ['Dry on tongue', 'In water', 'Olfaction', 'External application'];

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isComplete = currentStep > step;
  const isActive   = currentStep === step;
  return (
    <div className="rx-step-indicator">
      <div className={`rx-step-circle ${isComplete ? 'rx-step-circle--complete' : isActive ? 'rx-step-circle--active' : ''}`}>
        {isComplete ? <Check style={{ width: 14, height: 14 }} /> : step}
      </div>
      <span className={`rx-step-label ${isActive ? 'rx-step-label--active' : isComplete ? 'rx-step-label--complete' : ''}`}>{label}</span>
    </div>
  );
}

function ResizablePreview({ patient, formattedDate, diagnoses, rxItems, supportiveTopical, followUp, antidoteAvoidance, gnmCounselling, soapData }: {
  patient?: PrescriptionStageProps['patient'];
  formattedDate: string; diagnoses: string[];
  rxItems: CreatePrescriptionItemInput[];
  supportiveTopical: string; followUp: string;
  antidoteAvoidance: string; gnmCounselling: string;
  soapData?: { subjective?: string; objective?: string; plan?: string };
}) {
  const [width, setWidth] = useState(384);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(384);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isDragging.current = true;
    startX.current = e.clientX; startWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      setWidth(Math.max(280, Math.min(700, startWidth.current + delta)));
    };
    const handleMouseUp = () => { isDragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  return (
    <div className="rx-preview-panel" style={{ width }}>
      <div className="rx-preview-drag-handle" onMouseDown={handleMouseDown} title="Drag to resize">
        <div className="rx-preview-drag-bar" />
      </div>
      <div className="rx-preview-content">
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="stage-section-label">Prescription Preview</span>
        </div>
        <div className="rx-preview-card rx-card">
          <div className="rx-preview-header-grid">
            <div><span className="rx-preview-field-label">Patient</span><span className="rx-preview-field-value">{patient?.name || '—'}</span></div>
            <div style={{ textAlign: 'right' }}><span className="rx-preview-field-label">Age</span><span className="rx-preview-field-value">{patient?.age ? `${patient.age} yr` : '—'} / {patient?.gender?.[0] || '—'}</span></div>
            <div><span className="rx-preview-field-label">Date</span><span className="rx-preview-field-value">{formattedDate}</span></div>
            <div style={{ textAlign: 'right' }}><span className="rx-preview-field-label">ID</span><span className="rx-preview-field-value">#{patient?.mrn || '—'}</span></div>
          </div>

          {soapData && (soapData.subjective || soapData.objective) && (
            <div>
              <span className="rx-preview-section-label">Clinical Summary</span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                {[soapData.subjective, soapData.objective].filter(Boolean).join('\n\n')}
              </p>
            </div>
          )}

          {diagnoses.length > 0 && (
            <div>
              <span className="rx-preview-section-label">Diagnosis</span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.25rem' }}>{diagnoses.join(' — ')}</p>
            </div>
          )}

          <div>
            <span className="rx-preview-section-label">Prescription</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.25rem' }}>
              {rxItems.map((item, i) => (
                <div key={i} className="rx-preview-item">
                  <p className="rx-preview-item-name">{item.medicationName || '—'}</p>
                  <p className="rx-preview-item-detail">{item.dosage || '30C'} · {item.frequency || 'Single dose'} · {item.route || 'Dry on tongue'}</p>
                  {item.instructions && <p className="rx-preview-item-instruction">{item.instructions}</p>}
                </div>
              ))}
            </div>
          </div>

          {supportiveTopical && (
            <div>
              <span className="rx-preview-section-label">Advice &amp; Management</span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{supportiveTopical}</p>
            </div>
          )}

          {followUp && (
            <div>
              <span className="rx-preview-section-label">Follow-Up</span>
              <div className="rx-followup-box">
                <p>{followUp}</p>
                {antidoteAvoidance && <p style={{ marginTop: '0.25rem', fontWeight: 400, fontSize: 11 }}>{antidoteAvoidance}</p>}
              </div>
            </div>
          )}

          {gnmCounselling && (
            <div>
              <span className="rx-preview-section-label">Additional Advisory</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>{gnmCounselling}</p>
            </div>
          )}

          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-default)', marginTop: '1rem' }}>
            <span className="rx-preview-section-label">Consulting Physician</span>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: '2px' }}>BHMS · CCH · GNM Practitioner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrescriptionStage({
  visitId: _visitId, rxItems, onRxItemsChange,
  advice: _advice, onAdviceChange: _onAdviceChange,
  followUp, onFollowUpChange, diagnoses, soapData, patient,
  gnmAnalysis, scoredRemedies, onComplete: _onComplete,
  isCompleting: _isCompleting, onPrescriptionStepChange,
}: PrescriptionStageProps) {
  const [prescriptionStep, setPrescriptionStep] = useState(1);
  const [selectedRemedyNames, setSelectedRemedyNames] = useState<string[]>([]);
  const [antidoteAvoidance, setAntidoteAvoidance] = useState('No coffee, camphor, strong perfumes, menthol for 4 weeks.');
  const [supportiveTopical, setSupportiveTopical] = useState('');
  const [gnmCounselling, setGnmCounselling] = useState('');

  const allRemedies = gnmAnalysis?.rankedRemedies || [];
  const resolution  = gnmAnalysis?.resolutionStrategy;

  useEffect(() => { if (resolution?.directions?.length) setGnmCounselling(resolution.directions.join('\n')); }, [resolution]);
  useEffect(() => {
    if (rxItems.length > 0 && selectedRemedyNames.length === 0) {
      setSelectedRemedyNames(rxItems.map(item => item.medicationName).filter(Boolean) as string[]);
    }
  }, [rxItems]);

  const handleToggleRemedy = (name: string) => {
    const isSelected = selectedRemedyNames.includes(name);
    const nextNames = isSelected ? selectedRemedyNames.filter(n => n !== name) : [...selectedRemedyNames, name];
    setSelectedRemedyNames(nextNames);
    if (isSelected) { onRxItemsChange(rxItems.filter(item => item.medicationName !== name)); }
    else { onRxItemsChange([...rxItems, { medicationName: name, genericName: '', dosage: '200C', route: 'Dry on tongue', instructions: '1 dose dry on tongue. Single.', frequency: 'Stat', duration: '1 day' }]); }
  };

  const updateRxItem = (index: number, updates: Partial<CreatePrescriptionItemInput>) => {
    const next = [...rxItems]; next[index] = { ...next[index], ...updates }; onRxItemsChange(next);
  };

  const handleConfirmPotency = useCallback(() => setPrescriptionStep(3), []);
  useEffect(() => { onPrescriptionStepChange?.(prescriptionStep, handleConfirmPotency); }, [prescriptionStep, handleConfirmPotency, onPrescriptionStepChange]);

  const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const badgeMap: Record<string, string> = { strongest: 'rx-match-badge--1st', strong: 'rx-match-badge--inter', moderate: 'rx-match-badge--topical' };
  const badgeLabel: Record<string, string> = { strongest: '1st', strong: 'Intercurrent', moderate: 'Topical' };

  return (
    <div className="stage-layout">
      {/* LEFT: Form */}
      <div className="stage-col--main stage-section">
        {/* Stepper */}
        <div className="rx-stepper">
          <StepIndicator step={1} currentStep={prescriptionStep} label="Remedy" />
          <span className="rx-step-divider"><ChevronRight style={{ width: 12, height: 12 }} /></span>
          <StepIndicator step={2} currentStep={prescriptionStep} label="Potency" />
          <span className="rx-step-divider"><ChevronRight style={{ width: 12, height: 12 }} /></span>
          <StepIndicator step={3} currentStep={prescriptionStep} label="Send" />
        </div>

        {/* Step 1 */}
        {prescriptionStep === 1 && (
          <div className="stage-section">
            {allRemedies.length > 0 && (
              <div className="rx-voice-hint">
                <MessageSquare style={{ width: 16, height: 16, color: 'var(--color-primary-600)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="rx-voice-hint__label">Voice Command</p>
                  <p className="rx-voice-hint__text">
                    "Prescribe {allRemedies[0]?.name} 200C single dose, review four weeks, {allRemedies[2]?.name || ''} topical"
                  </p>
                </div>
              </div>
            )}

            <div>
              <span className="stage-section-label" style={{ marginBottom: '0.75rem' }}>Select Remedy</span>
              <div className="stage-section">
                {allRemedies.map((remedy, i) => {
                  const isSelected = selectedRemedyNames.includes(remedy.name);
                  const score = scoredRemedies.find(r => r.remedyName === remedy.name)?.totalScore;
                  const badgeClass = badgeMap[remedy.matchStrength] || 'rx-match-badge--topical';
                  const badgeLbl   = badgeLabel[remedy.matchStrength] || 'Topical';
                  return (
                    <button key={i} type="button" onClick={() => handleToggleRemedy(remedy.name)}
                      className={`rx-remedy-btn ${isSelected ? 'rx-remedy-btn--selected' : ''}`}
                    >
                      <div className="rx-remedy-btn__inner">
                        <div className={`rx-remedy-checkbox ${isSelected ? 'rx-remedy-checkbox--checked' : ''}`}>
                          {isSelected && <Check style={{ width: 10, height: 10, color: 'white', strokeWidth: 4 }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="rx-remedy-name">{remedy.name}</span>
                            {score && <span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: 'var(--color-gray-100)', color: 'var(--text-tertiary)', fontWeight: 700 }}>Score {score}</span>}
                          </div>
                          <p className="rx-remedy-keynotes">{remedy.keynotes.slice(0, 2).join(' · ')}</p>
                        </div>
                        <span className={`rx-match-badge ${badgeClass}`}>{badgeLbl}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => {
                  onRxItemsChange(selectedRemedyNames.map(name => ({ medicationName: name, genericName: '', dosage: '200C', route: 'Dry on tongue', instructions: '1 dose dry on tongue. Single.', frequency: 'Stat', duration: '1 day' })));
                  setPrescriptionStep(2);
                }} className="rx-continue-btn">
                  {selectedRemedyNames.length > 0 ? `Use ${selectedRemedyNames.length} Remedies` : 'Continue Without Remedy'}
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {prescriptionStep === 2 && (
          <div className="stage-section">
            <span className="stage-section-label" style={{ marginBottom: '0.5rem' }}>Adjust Remedy Settings</span>
            {rxItems.length > 0 ? rxItems.map((item, idx) => (
              <div key={idx} className="symptom-group">
                <div className="symptom-group__header">
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.medicationName}</span>
                  <span className="stage-section-label">Configuration {idx + 1}</span>
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="stage-section-label" style={{ marginBottom: '0.5rem' }}>Potency</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {POTENCIES.map(pot => (
                        <button key={pot} type="button" onClick={() => updateRxItem(idx, { dosage: pot })}
                          className={`rx-potency-chip ${item.dosage === pot ? 'rx-potency-chip--active' : ''}`}
                        >{pot}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="stage-section-label" style={{ marginBottom: '0.5rem' }}>Dose Instructions</label>
                      <Input value={item.instructions || ''} onChange={e => updateRxItem(idx, { instructions: e.target.value })} style={{ fontSize: 'var(--font-size-xs)', height: '2.25rem' }} placeholder="e.g. 1 dose now" />
                    </div>
                    <div>
                      <label className="stage-section-label" style={{ marginBottom: '0.5rem' }}>Route</label>
                      <select value={item.route} onChange={e => updateRxItem(idx, { route: e.target.value })}
                        style={{ width: '100%', height: '2.25rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)', fontSize: 'var(--font-size-xs)', paddingLeft: '0.625rem' }}
                      >
                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="stage-empty-panel" style={{ padding: '2rem', background: 'var(--bg-surface-2)' }}>
                <p style={{ fontStyle: 'italic' }}>No remedies selected. Move direct to advice.</p>
              </div>
            )}

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span className="stage-section-label" style={{ marginBottom: '0.5rem' }}>Global Settings</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="stage-section-label" style={{ marginBottom: '0.375rem' }}>Antidote avoidance</label>
                  <Input value={antidoteAvoidance} onChange={e => setAntidoteAvoidance(e.target.value)} style={{ fontSize: 'var(--font-size-xs)', height: '2.25rem' }} placeholder="No coffee, camphor..." />
                </div>
                <div>
                  <label className="stage-section-label" style={{ marginBottom: '0.375rem' }}>Follow-up</label>
                  <Input value={followUp} onChange={e => onFollowUpChange(e.target.value)} style={{ fontSize: 'var(--font-size-xs)', height: '2.25rem' }} placeholder="30 April 2026..." />
                </div>
              </div>
              <div>
                <label className="stage-section-label" style={{ marginBottom: '0.375rem' }}>Supportive / topical</label>
                <Input value={supportiveTopical} onChange={e => setSupportiveTopical(e.target.value)} style={{ fontSize: 'var(--font-size-xs)', height: '2.25rem' }} placeholder="Jaborandi Q..." />
              </div>
              <div>
                <label className="stage-section-label" style={{ marginBottom: '0.375rem' }}>GNM counselling</label>
                <Input value={gnmCounselling} onChange={e => setGnmCounselling(e.target.value)} style={{ fontSize: 'var(--font-size-xs)', height: '2.25rem' }} placeholder="Plan village visit..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {prescriptionStep === 3 && (
          <div className="rx-ready-check">
            <div className="rx-ready-circle">
              <Check style={{ width: 32, height: 32, color: 'var(--color-success-600)' }} />
            </div>
            <div>
              <h3 className="rx-ready-title">Prescription Ready</h3>
              <p className="rx-ready-subtitle">Review the preview. Use the bottom bar to share, print, or complete.</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Resizable Preview */}
      <ResizablePreview
        patient={patient} formattedDate={formattedDate}
        diagnoses={diagnoses} rxItems={rxItems}
        supportiveTopical={supportiveTopical} followUp={followUp}
        antidoteAvoidance={antidoteAvoidance} gnmCounselling={gnmCounselling}
        soapData={soapData}
      />
    </div>
  );
}
