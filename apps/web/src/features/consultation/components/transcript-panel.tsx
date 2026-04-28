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

const speakerColors: Record<string, string> = {
  DOCTOR: 'bg-blue-100 text-blue-700',
  PATIENT: 'bg-green-100 text-green-700',
  UNKNOWN: 'bg-gray-100 text-gray-600',
};

export function TranscriptPanel({ segments, interimText, isRecording }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new segments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments.length, interimText]);

  if (segments.length === 0 && !interimText) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        {isRecording
          ? 'Listening... Speak to start transcribing.'
          : 'Start recording to see the live transcript here.'}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 pr-1">
      {segments.map((seg) => (
        <div key={seg.sequenceNumber} className="flex gap-2 text-sm">
          <span className="text-xs text-gray-400 min-w-[3rem] pt-0.5 text-right tabular-nums">
            {formatTime(seg.startTimeMs)}
          </span>
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${speakerColors[seg.speaker]}`}>
            {seg.speaker === 'DOCTOR' ? 'Dr' : seg.speaker === 'PATIENT' ? 'Pt' : '?'}
          </Badge>
          <div className="flex-1 flex flex-col pt-0.5">
            <span className="text-gray-800">{seg.text}</span>
            {seg.translatedText && seg.translatedText !== seg.text && (
              <span className="text-[11px] text-gray-500 italic mt-0.5 border-l-2 border-gray-200 pl-2">
                {seg.translatedText}
              </span>
            )}
          </div>
          {seg.confidence != null && (
            <span
              className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                seg.confidence > 0.8 ? 'bg-green-400' : seg.confidence > 0.5 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              title={`Confidence: ${Math.round(seg.confidence * 100)}%`}
            />
          )}
        </div>
      ))}

      {interimText && (
        <div className="flex gap-2 text-sm">
          <span className="text-xs text-gray-400 min-w-[3rem] pt-0.5 text-right">...</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-gray-50 text-gray-400">
            ...
          </Badge>
          <span className="flex-1 text-gray-400 italic animate-pulse">{interimText}</span>
        </div>
      )}
    </div>
  );
}
