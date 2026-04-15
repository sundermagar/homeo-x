import { Button } from '../../../../components/ui/button';
import type { GnmAnalysis, ScoredRemedy } from '../../../../types/ai';
import './stages.css';

interface TotalityStageProps {
  gnmAnalysis: GnmAnalysis | null;
  rankedRemedies: ScoredRemedy[];
  subjective: string;
  assessment: string;
  onRepertorize: () => void;
  onPrescribe: () => void;
}

function GradeBadge({ grade }: { grade: number }) {
  return (
    <span className={`grade-badge grade-badge--${grade}`}>{grade}</span>
  );
}

export function TotalityStage({ gnmAnalysis, rankedRemedies, subjective, assessment, onRepertorize, onPrescribe }: TotalityStageProps) {
  const mentalTraits    = gnmAnalysis?.homeopathicTotality?.mentalEmotional || [];
  const physicalGenerals = gnmAnalysis?.homeopathicTotality?.physicalGenerals || [];
  const conflict         = gnmAnalysis?.coreConflict;
  const phases           = gnmAnalysis?.phases;
  const resolution       = gnmAnalysis?.resolutionStrategy;
  const totalSymptoms    = mentalTraits.length + physicalGenerals.length;
  const aiRemedies       = gnmAnalysis?.rankedRemedies || [];

  const remedyBorderClass = (i: number) => ['remedy-card--1st', 'remedy-card--2nd', 'remedy-card--3rd'][i] || '';

  return (
    <div className="stage-layout">
      {/* ═══ LEFT: CASE NARRATIVE ═══ */}
      <div className="stage-col--narrow stage-section stage-col--scrollable">
        <span className="stage-section-label">Case Narrative — AI Built from Conversation</span>

        {subjective && (
          <div className="case-narrative-quote">
            <p>
              "{subjective.slice(0, 200)}{subjective.length > 200 ? '...' : ''}"
              <span className="quote-note">— Built from what the patient said. Nothing pre-loaded.</span>
            </p>
          </div>
        )}

        {/* Never Well Since Timeline */}
        {conflict && (
          <div className="stage-section">
            <span className="stage-section-label" style={{ color: 'var(--color-primary-600)' }}>Never Well Since — DHS + Rails</span>
            <div className="dhs-timeline">
              {conflict.triggerEvents.map((event, i) => (
                <div key={i} className="dhs-event">
                  <div className="timeline-dot" style={{ background: i === 0 ? 'var(--color-error-500)' : '#F59E0B' }} />
                  <div style={{ paddingLeft: '0.75rem' }}>
                    <p className="dhs-event-label">{i === 0 ? '● PRIMARY DHS' : `● Rail ${i}`}</p>
                    <p className="dhs-event-body">{event}</p>
                    <p className="dhs-event-conflict">{conflict.conflictType}{i > 0 && ' → reactivation'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GNM Full Map */}
        {phases && (
          <div className="stage-section">
            <span className="stage-section-label">GNM Full Map</span>
            <div className="gnm-panel gnm-panel--conflict">
              <p className="gnm-panel-label">Tissue Layer · Conflict-Active Phase</p>
              <p>{phases.conflictActive}</p>
            </div>
            <div className="gnm-panel gnm-panel--healing">
              <p className="gnm-panel-label">Healing Phase — Episodic</p>
              <p>{phases.healingPhase}</p>
            </div>
            {resolution && (
              <div className="gnm-panel gnm-panel--resolution">
                <p className="gnm-panel-label">Resolution Pathway</p>
                {resolution.directions.map((dir, i) => <p key={i}>{dir}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ CENTER: SYMPTOM TOTALITY ═══ */}
      <div className="stage-col--main stage-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="stage-section-label">Symptom Totality — Priority Ranked</span>
          {totalSymptoms > 0 && (
            <span className="symptom-count-badge">{totalSymptoms} symptoms</span>
          )}
        </div>

        {mentalTraits.length > 0 && (
          <div className="symptom-group symptom-group--mental">
            <div className="symptom-group__header">
              <span className="symptom-group__header-label">💜 Mental Generals — §211 Highest Priority</span>
            </div>
            {mentalTraits.map((trait, i) => (
              <div key={i} className="symptom-row">
                <span className="symptom-row__text">{trait}</span>
                <GradeBadge grade={3} />
              </div>
            ))}
          </div>
        )}

        {physicalGenerals.length > 0 && (
          <div className="symptom-group symptom-group--physical">
            <div className="symptom-group__header">
              <span className="symptom-group__header-label">🔴 Physical Generals</span>
            </div>
            {physicalGenerals.map((gen, i) => (
              <div key={i} className="symptom-row">
                <span className="symptom-row__text">{gen}</span>
                <GradeBadge grade={2} />
              </div>
            ))}
          </div>
        )}

        <div className="symptom-group symptom-group--particular">
          <div className="symptom-group__header">
            <span className="symptom-group__header-label">💎 Particulars — Lowest Weight</span>
          </div>
          <div className="symptom-row" style={{ padding: '1rem' }}>
            <span className="symptom-row__text" style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
              {assessment || 'Diagnosis pending AI analysis'}
            </span>
            <GradeBadge grade={2} />
          </div>
          {subjective && <p style={{ padding: '0 1rem 0.75rem', fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{subjective.slice(0, 150)}...</p>}
        </div>
      </div>

      {/* ═══ RIGHT: REMEDY ANALYSIS ═══ */}
      <div className="stage-col--narrow stage-section">
        <span className="stage-section-label">Remedy Analysis</span>

        {aiRemedies.length > 0 ? aiRemedies.map((remedy, i) => {
          const score = rankedRemedies.find(r => r.remedyName === remedy.name)?.totalScore || remedy.rank;
          return (
            <div key={i} className={`remedy-card rx-card ${remedyBorderClass(i)}`}>
              <div className="remedy-card__header">
                <span className="remedy-card__name">{remedy.name}</span>
                <span className="remedy-card__score">Score {score}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {remedy.keynotes.map((k, j) => (
                  <div key={j} className="remedy-keynote">
                    <span className="remedy-keynote__check">✓</span>
                    <span className="remedy-keynote__text">{k}</span>
                  </div>
                ))}
              </div>
              {remedy.whenToUse && <p className="remedy-card__role">Role: {remedy.whenToUse}</p>}
            </div>
          );
        }) : (
          <div className="stage-empty-panel">
            <p>Remedy ranking will appear after AI analysis</p>
          </div>
        )}

        {aiRemedies.length > 0 && (
          <div className="remedy-cta-group">
            <Button onClick={onPrescribe} style={{ width: '100%' }}>
              Prescribe {aiRemedies[0]?.name} →
            </Button>
            <button type="button" onClick={onRepertorize} className="repertorize-link">
              View repertorization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
