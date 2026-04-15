import { Video, Mic, RotateCcw, ExternalLink } from 'lucide-react';

interface VisitTypeIndicatorProps {
  visitType?: string;
  previousVisitId?: string;
}

const configs: Record<string, { icon: any; label: string; detail: string; color: string; borderColor: string; bg: string }> = {
  VIDEO:     { icon: Video,      label: 'Video Consultation',  detail: 'Use your preferred video platform. Document findings in SOAP notes as usual.', color: '#1D4ED8', borderColor: '#BFDBFE', bg: '#EFF6FF' },
  AUDIO:     { icon: Mic,        label: 'Audio Consultation',  detail: 'Phone/audio-only consultation. Use voice capture above to auto-document.',      color: '#15803D', borderColor: '#BBF7D0', bg: '#F0FDF4' },
  FOLLOW_UP: { icon: RotateCcw,  label: 'Follow-up Visit',     detail: 'Review previous diagnosis and treatment response.',                              color: '#B45309', borderColor: '#FDE68A', bg: '#FFFBEB' },
};

export function VisitTypeIndicator({ visitType, previousVisitId }: VisitTypeIndicatorProps) {
  const cfg = visitType ? configs[visitType] : null;
  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <div style={{ border: `1px solid ${cfg.borderColor}`, background: cfg.bg, borderRadius: 'var(--radius-xl)', padding: '0.625rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon style={{ width: 16, height: 16, color: cfg.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: cfg.color, margin: 0 }}>{cfg.label}</p>
          <p style={{ fontSize: 11, color: cfg.color, opacity: 0.8, margin: 0 }}>
            {cfg.detail}{visitType === 'FOLLOW_UP' && previousVisitId && ' Previous visit data available.'}
          </p>
        </div>
        {visitType === 'FOLLOW_UP' && previousVisitId && (
          <a href={`/consultation/${previousVisitId}`} target="_blank" rel="noopener noreferrer" style={{ color: cfg.color, flexShrink: 0 }}>
            <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        )}
      </div>
    </div>
  );
}
