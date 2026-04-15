import { useEffect, useRef } from 'react';
import { Badge } from '../../../components/ui/badge';
import type { TranscriptSegmentLocal } from '../../../types/scribing';

interface TranscriptPanelProps {
  segments: TranscriptSegmentLocal[];
  interimText: string;
  isRecording: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const speakerBadgeStyle: Record<string, React.CSSProperties> = {
  DOCTOR:  { background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' },
  PATIENT: { background: 'var(--color-success-100)', color: 'var(--color-success-700)' },
  UNKNOWN: { background: 'var(--color-gray-100)',    color: 'var(--text-secondary)' },
};

const confidenceDotColor = (confidence: number) =>
  confidence > 0.8 ? '#4ADE80' : confidence > 0.5 ? '#FBBF24' : '#F87171';

export function TranscriptPanel({ segments, interimText, isRecording }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [segments.length, interimText]);

  if (segments.length === 0 && !interimText) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '8rem', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
        {isRecording ? 'Listening... Speak to start transcribing.' : 'Start recording to see the live transcript here.'}
      </div>
    );
  }

  return (
    <div ref={scrollRef} style={{ maxHeight: '16rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
      {segments.map((seg) => (
        <div key={seg.sequenceNumber} style={{ display: 'flex', gap: '0.5rem', fontSize: 'var(--font-size-sm)', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', minWidth: '3rem', paddingTop: '2px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(seg.startTimeMs)}
          </span>
          <Badge variant="outline" style={{ fontSize: 10, height: '1.25rem', padding: '0 0.375rem', flexShrink: 0, ...speakerBadgeStyle[seg.speaker] }}>
            {seg.speaker === 'DOCTOR' ? 'Dr' : seg.speaker === 'PATIENT' ? 'Pt' : '?'}
          </Badge>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '2px' }}>
            <span style={{ color: 'var(--text-primary)' }}>{seg.text}</span>
            {seg.translatedText && seg.translatedText !== seg.text && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px', borderLeft: '2px solid var(--border-default)', paddingLeft: '0.5rem', lineHeight: 1.5 }}>
                {seg.translatedText}
              </span>
            )}
          </div>
          {seg.confidence != null && (
            <span
              style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', marginTop: '0.375rem', flexShrink: 0, background: confidenceDotColor(seg.confidence) }}
              title={`Confidence: ${Math.round(seg.confidence * 100)}%`}
            />
          )}
        </div>
      ))}

      {interimText && (
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: 'var(--font-size-sm)', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', minWidth: '3rem', textAlign: 'right' }}>...</span>
          <Badge variant="outline" style={{ fontSize: 10, height: '1.25rem', padding: '0 0.375rem', background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }}>...</Badge>
          <span style={{ flex: 1, color: 'var(--text-tertiary)', fontStyle: 'italic', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>{interimText}</span>
        </div>
      )}
    </div>
  );
}
