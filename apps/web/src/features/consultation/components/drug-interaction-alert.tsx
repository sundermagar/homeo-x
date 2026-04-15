import { AlertTriangle, XOctagon, AlertCircle, Info } from 'lucide-react';
import type { DrugInteractionWarning } from '../../../types/ai';

interface DrugInteractionAlertProps {
  interactions: DrugInteractionWarning[];
}

const severityConfig = {
  CONTRAINDICATED: { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B', icon: XOctagon,      label: 'CONTRAINDICATED' },
  MAJOR:           { bg: '#FFF7ED', border: '#FDBA74', color: '#9A3412', icon: AlertTriangle,  label: 'MAJOR' },
  MODERATE:        { bg: '#FEFCE8', border: '#FDE047', color: '#713F12', icon: AlertCircle,    label: 'MODERATE' },
  MINOR:           { bg: '#EFF6FF', border: '#93C5FD', color: '#1E3A8A', icon: Info,           label: 'MINOR' },
  UNKNOWN:         { bg: '#F9FAFB', border: '#D1D5DB', color: '#374151', icon: Info,           label: 'UNKNOWN' },
} as const;

export function DrugInteractionAlert({ interactions }: DrugInteractionAlertProps) {
  if (interactions.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>Drug Interaction Warnings</h4>
      {interactions.map((interaction, idx) => {
        const cfg = severityConfig[interaction.severity as keyof typeof severityConfig] || severityConfig.UNKNOWN;
        const Icon = cfg.icon;
        return (
          <div key={idx} style={{ borderRadius: 'var(--radius-card)', border: `1px solid ${cfg.border}`, padding: '0.75rem', background: cfg.bg }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Icon style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, color: cfg.color }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: cfg.color }}>
                  {cfg.label}: {interaction.drugA} + {interaction.drugB}
                </div>
                <p style={{ marginTop: 2, fontSize: 'var(--font-size-xs)', color: cfg.color, opacity: 0.8, margin: '2px 0 0' }}>{interaction.description}</p>
                {interaction.management && <p style={{ marginTop: '0.25rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>Management: {interaction.management}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
