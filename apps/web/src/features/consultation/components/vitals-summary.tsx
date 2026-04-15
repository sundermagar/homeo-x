import { useState } from 'react';
import {
  Heart, Thermometer, Activity, Wind, Droplets,
  ChevronDown, ChevronUp, Check, AlertCircle,
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
function isCritical(v: Vitals): boolean {
  if (v.systolicBp != null && v.systolicBp >= 180) return true;
  if (v.oxygenSaturation != null && v.oxygenSaturation < 92) return true;
  if (v.temperatureF != null && v.temperatureF >= 103) return true;
  return false;
}

function VitalChip({ icon: Icon, label, critical }: { icon: React.ComponentType<{ style?: React.CSSProperties }>; label: string; critical?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      borderRadius: 'var(--radius-full)', padding: '0.125rem 0.5rem',
      fontSize: 11, fontWeight: 500,
      ...(critical
        ? { background: 'var(--color-error-100)', color: 'var(--color-error-700)' }
        : { background: 'var(--color-gray-100)', color: 'var(--text-secondary)' }),
    }}>
      <Icon style={{ width: 12, height: 12 }} />
      {label}
    </span>
  );
}

export function VitalsSummary({ visitId, vitals, onVitalsRecorded }: VitalsSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const hasVitals = vitals != null;
  const critical = hasVitals && isCritical(vitals);

  if (!expanded) {
    return (
      <Card style={critical ? { borderColor: 'var(--color-error-200)', background: 'rgba(254,242,242,0.5)', cursor: 'pointer' } : { cursor: 'pointer' }} onClick={() => setExpanded(true)}>
        <CardContent style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <Activity style={{ width: 16, height: 16, color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Vitals</span>
              {hasVitals ? (
                <>
                  <Check style={{ width: 14, height: 14, color: 'var(--color-success-500)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {formatBp(vitals.systolicBp, vitals.diastolicBp) && <VitalChip icon={Heart} label={`BP ${formatBp(vitals.systolicBp, vitals.diastolicBp)}`} critical={vitals.systolicBp != null && vitals.systolicBp >= 140} />}
                    {vitals.pulseRate != null && Number.isFinite(vitals.pulseRate) && <VitalChip icon={Activity} label={`HR ${vitals.pulseRate}`} />}
                    {vitals.temperatureF != null && Number.isFinite(vitals.temperatureF) && <VitalChip icon={Thermometer} label={`${vitals.temperatureF}°F`} critical={vitals.temperatureF >= 100.4} />}
                    {vitals.oxygenSaturation != null && Number.isFinite(vitals.oxygenSaturation) && <VitalChip icon={Wind} label={`SpO2 ${vitals.oxygenSaturation}%`} critical={vitals.oxygenSaturation < 95} />}
                    {vitals.bloodSugar != null && Number.isFinite(vitals.bloodSugar) && <VitalChip icon={Droplets} label={`BS ${vitals.bloodSugar}`} />}
                  </div>
                </>
              ) : <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>Not recorded</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {critical && <AlertCircle style={{ width: 16, height: 16, color: 'var(--color-error-500)' }} />}
              <Button variant="ghost" size="sm" style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                {hasVitals ? 'Edit' : 'Record'}<ChevronDown style={{ width: 12, height: 12, marginLeft: 4 }} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Vitals</span>
          </div>
          <Button variant="ghost" size="sm" style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: 'var(--font-size-xs)' }} onClick={() => setExpanded(false)}>
            Collapse <ChevronUp style={{ width: 12, height: 12, marginLeft: 4 }} />
          </Button>
        </div>
        <div style={{ padding: '1rem' }}>
          <VitalsSection visitId={visitId} existingVitals={vitals} onComplete={() => { onVitalsRecorded(); setExpanded(false); }} />
        </div>
      </CardContent>
    </Card>
  );
}
