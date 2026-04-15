import { X, Check, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AiConfidenceBadge } from './ai-confidence-badge';
import { DrugInteractionAlert } from './drug-interaction-alert';
import type { SoapSuggestion, PrescriptionSuggestion } from '../../../types/ai';

interface SoapSuggestionPanelProps { type: 'soap'; suggestion: SoapSuggestion; onApply: () => void; onDismiss: () => void; }
interface PrescriptionSuggestionPanelProps { type: 'prescription'; suggestion: PrescriptionSuggestion; onApply: () => void; onDismiss: () => void; }
type AiSuggestionPanelProps = SoapSuggestionPanelProps | PrescriptionSuggestionPanelProps;

export function AiSuggestionPanel(props: AiSuggestionPanelProps) {
  const { type, onApply, onDismiss } = props;
  return (
    <Card style={{ borderColor: '#DDD6FE', background: 'rgba(245,243,255,0.5)' }}>
      <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles style={{ width: 16, height: 16, color: '#7C3AED' }} />
          <CardTitle style={{ fontSize: 'var(--font-size-sm)', color: '#4C1D95' }}>AI Suggestion</CardTitle>
        </div>
        <AiConfidenceBadge confidence={type === 'soap' ? props.suggestion.confidence : props.suggestion.confidence} />
      </CardHeader>
      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {type === 'soap' && <SoapContent suggestion={props.suggestion} />}
        {type === 'prescription' && <PrescriptionContent suggestion={props.suggestion} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid #DDD6FE', paddingTop: '0.75rem' }}>
          <Button size="sm" onClick={onApply} style={{ background: '#7C3AED', color: 'white', gap: '0.25rem' }}>
            <Check style={{ width: 14, height: 14 }} /> Apply
          </Button>
          <Button size="sm" variant="outline" onClick={onDismiss} style={{ gap: '0.25rem' }}>
            <X style={{ width: 14, height: 14 }} /> Dismiss
          </Button>
          <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Doctor approval required</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SoapContent({ suggestion }: { suggestion: SoapSuggestion }) {
  const fields = [
    { key: 'subjective', label: 'Subjective' }, { key: 'objective', label: 'Objective' },
    { key: 'assessment', label: 'Assessment' }, { key: 'plan', label: 'Plan' },
  ] as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--font-size-sm)' }}>
      {fields.map(({ key, label }) => suggestion[key] && (
        <div key={key}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}: </span>
          <span style={{ color: 'var(--text-tertiary)' }}>{suggestion[key]}</span>
        </div>
      ))}
      {suggestion.icdCodes.length > 0 && (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ICD-10: </span>
          <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {suggestion.icdCodes.map((icd) => (
              <span key={icd.code} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 4, background: 'var(--color-primary-100)', padding: '0.125rem 0.5rem', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-700)' }}>
                {icd.code} — {icd.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionContent({ suggestion }: { suggestion: PrescriptionSuggestion }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 'var(--font-size-sm)' }}>
      {suggestion.medications.map((med, idx) => (
        <div key={idx} style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)', padding: '0.5rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{med.medicationName}</div>
          {med.genericName && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{med.genericName}</div>}
          <div style={{ marginTop: '0.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            <span>Dosage: {med.dosage}</span><span>Freq: {med.frequency}</span><span>Duration: {med.duration}</span>
          </div>
          {med.instructions && <div style={{ marginTop: '0.25rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{med.instructions}</div>}
        </div>
      ))}
      {suggestion.allergyWarnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {suggestion.allergyWarnings.map((w, i) => (
            <div key={i} style={{ borderRadius: 'var(--radius-card)', background: 'var(--color-error-100)', padding: '0.5rem', fontSize: 'var(--font-size-xs)', color: 'var(--color-error-700)' }}>{w}</div>
          ))}
        </div>
      )}
      <DrugInteractionAlert interactions={suggestion.interactions} />
    </div>
  );
}
