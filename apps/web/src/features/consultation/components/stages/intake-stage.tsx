import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { Patient } from '../../../../types/patient';
import type { Visit } from '../../../../types/visit';
import './stages.css';

interface IntakeStageProps {
  patient?: Patient | null;
  visit: Visit;
  patientAge?: number;
  onNext: () => void;
}

export function IntakeStage({ patient, visit, patientAge, onNext }: IntakeStageProps) {
  const consultModes = [
    { label: 'Audio only',    active: visit.visitType === 'AUDIO' },
    { label: 'Audio + Video', active: visit.visitType === 'VIDEO' },
    { label: 'In-person',     active: !visit.visitType || !['AUDIO', 'VIDEO'].includes(visit.visitType as string) },
  ];

  return (
    <div className="stage-layout">
      {/* ═══ LEFT: PATIENT DEMOGRAPHICS ═══ */}
      <div className="stage-col--narrow stage-section">
        <span className="stage-section-label stage-section-label--primary">Patient Demographics</span>

        <div className="stage-section">
          <div className="demog-grid">
            <div className="demog-field">
              <label>Name</label>
              <Input readOnly value={patient ? `${patient.firstName} ${patient.lastName}` : '—'} className="demog-input" />
            </div>
            <div className="demog-field">
              <label>Age</label>
              <Input readOnly value={patientAge ? `${patientAge} years` : '—'} className="demog-input" />
            </div>
          </div>

          <div className="demog-grid">
            <div className="demog-field">
              <label>Gender</label>
              <Input readOnly value={patient?.gender || '—'} className="demog-input" />
            </div>
            <div className="demog-field">
              <label>Marital Status</label>
              <Input readOnly value="—" className="demog-input" />
            </div>
          </div>

          <div className="demog-grid">
            <div className="demog-field">
              <label>Occupation</label>
              <Input readOnly value="—" className="demog-input" />
            </div>
            <div className="demog-field">
              <label>Education</label>
              <Input readOnly value="—" className="demog-input" />
            </div>
          </div>

          <div className="demog-field">
            <label>Domicile / Origin</label>
            <Input readOnly value="—" className="demog-input" />
          </div>

          <div className="demog-field">
            <label>Chief complaint &amp; duration</label>
            <Input readOnly value={visit.chiefComplaint || '—'} className="demog-input" />
          </div>
        </div>

        {/* Consultation Mode */}
        <div className="stage-section" style={{ paddingTop: '0.5rem' }}>
          <span className="stage-section-label">Consultation Mode</span>
          <div className="consult-mode-chips">
            {consultModes.map(mode => (
              <span key={mode.label} className={`consult-mode-chip ${mode.active ? 'consult-mode-chip--active' : ''}`}>
                {mode.label}
              </span>
            ))}
          </div>
        </div>

        {/* AI Toggles */}
        <div className="stage-section" style={{ paddingTop: '0.5rem' }}>
          <span className="stage-section-label">AI Assistance</span>
          <div className="ai-toggle-list">
            {['Auto-transcription', 'GNM Analysis', 'KENT Repertory'].map(label => (
              <label key={label} className="ai-toggle-item">
                <input type="checkbox" defaultChecked />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CENTER: NEVER WELL SINCE — EVENT HISTORY ═══ */}
      <div className="stage-col--main stage-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="stage-section-label">Never Well Since — Event History</span>
          <span className="ai-badge">DHS pre-loaded by AI</span>
        </div>

        <div className="stage-empty-panel">
          <p>Event history will populate during consultation</p>
          <p>Start the consultation to begin AI-powered timeline extraction</p>
        </div>

        <div className="stage-start-cta">
          <Button onClick={onNext}>
            Start Consultation →
          </Button>
        </div>
      </div>

      {/* ═══ RIGHT: CONSULTATION HISTORY ═══ */}
      <div className="stage-col--medium-narrow stage-section">
        <span className="stage-section-label">Consultation History</span>
        <div className="stage-empty-panel stage-empty-panel--sm">
          <p>No previous visits</p>
        </div>
      </div>
    </div>
  );
}
