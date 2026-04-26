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
    vitals.systolicBp != null ? `BP ${vitals.systolicBp}/${vitals.diastolicBp ?? '—'}` : null,
    vitals.pulseRate != null ? `HR ${vitals.pulseRate}` : null,
    vitals.temperatureF != null ? `T ${vitals.temperatureF}°F` : null,
    vitals.oxygenSaturation != null ? `SpO2 ${vitals.oxygenSaturation}%` : null,
    vitals.bloodSugar != null ? `BS ${vitals.bloodSugar}` : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function VitalsSection({ visitId, existingVitals, onComplete }: VitalsSectionProps) {
  const hasVitals = existingVitals && (
    existingVitals.systolicBp != null ||
    existingVitals.pulseRate != null ||
    existingVitals.temperatureF != null
  );

  return (
    <CollapsibleSection
      id="section-vitals"
      title="Vitals"
      subtitle={hasVitals ? 'Recorded' : 'Not yet recorded'}
      icon={<Activity className="h-5 w-5" />}
      defaultOpen={!hasVitals}
      badge={
        hasVitals ? (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle className="h-3 w-3 mr-0.5" />
            Done
          </Badge>
        ) : undefined
      }
    >
      {hasVitals && <VitalsSummary vitals={existingVitals} />}
      <div className={hasVitals ? 'mt-3' : ''}>
        <VitalsPanel
          visitId={visitId}
          existingVitals={existingVitals}
          onComplete={onComplete}
        />
      </div>
    </CollapsibleSection>
  );
}
