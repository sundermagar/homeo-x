import { Activity, CheckCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { VitalsPanel } from './vitals-panel';
import type { Vitals } from '../../../types/visit';

interface VitalsSectionProps {
  visitId: string;
  existingVitals?: Vitals | null;
  onComplete: () => void;
}

function VitalsSummary({ vitals }: { vitals: Vitals }) {
  const items = [
    vitals.systolicBp    != null ? `BP ${vitals.systolicBp}/${vitals.diastolicBp ?? '—'}` : null,
    vitals.pulseRate     != null ? `HR ${vitals.pulseRate}`                                : null,
    vitals.temperatureF  != null ? `T ${vitals.temperatureF}°F`                            : null,
    vitals.oxygenSaturation != null ? `SpO2 ${vitals.oxygenSaturation}%`                   : null,
    vitals.bloodSugar    != null ? `BS ${vitals.bloodSugar}`                               : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center',
          borderRadius: 'var(--radius-card)',
          background: 'var(--bg-surface-2)',
          padding: '0.125rem 0.5rem',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function VitalsSection({ visitId, existingVitals, onComplete }: VitalsSectionProps) {
  const hasVitals = existingVitals && (
    existingVitals.systolicBp != null ||
    existingVitals.pulseRate  != null ||
    existingVitals.temperatureF != null
  );

  return (
    <CollapsibleSection
      id="section-vitals"
      title="Vitals"
      subtitle={hasVitals ? 'Recorded' : 'Not yet recorded'}
      icon={<Activity style={{ width: 20, height: 20 }} />}
      defaultOpen={!hasVitals}
      badge={hasVitals ? (
        <Badge variant="success">
          <CheckCircle style={{ width: 12, height: 12, marginRight: 2 }} />
          Done
        </Badge>
      ) : undefined}
    >
      {hasVitals && <VitalsSummary vitals={existingVitals} />}
      <div style={hasVitals ? { marginTop: '0.75rem' } : {}}>
        <VitalsPanel visitId={visitId} existingVitals={existingVitals} onComplete={onComplete} />
      </div>
    </CollapsibleSection>
  );
}
