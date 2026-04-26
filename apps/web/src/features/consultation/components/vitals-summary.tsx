import { useState } from 'react';
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplets,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { VitalsSection } from './vitals-section';
import type { Vitals } from '../../../types/visit';

interface VitalsSummaryProps {
  visitId: string;
  vitals?: Vitals | null;
  onVitalsRecorded: () => void;
}

function formatBp(systolic?: number, diastolic?: number): string | null {
  if (systolic == null || !Number.isFinite(systolic)) return null;
  return `${systolic}/${diastolic ?? '—'}`;
}

function isCritical(vitals: Vitals): boolean {
  if (vitals.systolicBp != null && vitals.systolicBp >= 180) return true;
  if (vitals.oxygenSaturation != null && vitals.oxygenSaturation < 92) return true;
  if (vitals.temperatureF != null && vitals.temperatureF >= 103) return true;
  return false;
}

export function VitalsSummary({ visitId, vitals, onVitalsRecorded }: VitalsSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const hasVitals = vitals != null;
  const critical = hasVitals && isCritical(vitals);

  // Collapsed state — single row summary
  if (!expanded) {
    return (
      <Card
        className={`cursor-pointer transition-colors ${
          critical
            ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
            : ''
        }`}
        onClick={() => setExpanded(true)}
      >
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vitals
              </span>

              {hasVitals ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {/* Inline vital chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {formatBp(vitals.systolicBp, vitals.diastolicBp) && (
                      <VitalChip
                        icon={Heart}
                        label={`BP ${formatBp(vitals.systolicBp, vitals.diastolicBp)}`}
                        critical={vitals.systolicBp != null && vitals.systolicBp >= 140}
                      />
                    )}
                    {vitals.pulseRate != null && Number.isFinite(vitals.pulseRate) && (
                      <VitalChip icon={Activity} label={`HR ${vitals.pulseRate}`} />
                    )}
                    {vitals.temperatureF != null && Number.isFinite(vitals.temperatureF) && (
                      <VitalChip
                        icon={Thermometer}
                        label={`${vitals.temperatureF}°F`}
                        critical={vitals.temperatureF >= 100.4}
                      />
                    )}
                    {vitals.oxygenSaturation != null && Number.isFinite(vitals.oxygenSaturation) && (
                      <VitalChip
                        icon={Wind}
                        label={`SpO2 ${vitals.oxygenSaturation}%`}
                        critical={vitals.oxygenSaturation < 95}
                      />
                    )}
                    {vitals.bloodSugar != null && Number.isFinite(vitals.bloodSugar) && (
                      <VitalChip icon={Droplets} label={`BS ${vitals.bloodSugar}`} />
                    )}
                  </div>
                </>
              ) : (
                <span className="text-xs text-gray-400">Not recorded</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {critical && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                {hasVitals ? 'Edit' : 'Record'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded state — full vitals form
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Vitals
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setExpanded(false)}
          >
            Collapse
            <ChevronUp className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <div className="p-4">
          <VitalsSection
            visitId={visitId}
            existingVitals={vitals}
            onComplete={() => {
              onVitalsRecorded();
              setExpanded(false);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function VitalChip({
  icon: Icon,
  label,
  critical,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  critical?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        critical
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
