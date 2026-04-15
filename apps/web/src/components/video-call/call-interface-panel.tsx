import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Waves,
  Copy,
  Check,
} from 'lucide-react';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../types/scribing';
import { VideoCallPanel } from './video-call-panel';

export type CallMode = 'AUDIO' | 'VIDEO' | 'IN_PERSON';

interface CallInterfacePanelProps {
  callMode: CallMode;
  video: any;
  localSpeaker: SpeakerLabel;
  patientJoinLink?: string;
  transcript: TranscriptSegmentLocal[];
  interimText?: string;
  remoteInterimText?: string | null;
  isTranscribing?: boolean;
  isRemotePaused?: boolean;
  error?: string | null;
  onLeave?: () => void;
  onPauseToggle?: (isPaused: boolean) => void;
  aiQuestions?: Array<{ id: string; question: string; category: string; answered: boolean }>;
  isGeneratingQuestions?: boolean;
  onQuestionAnswered?: (id: string) => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  transcriptHeaderActions?: React.ReactNode;
  transcriptBottomActions?: React.ReactNode;
  isPaused?: boolean;
}

// Hidden audio player for Agora
const AudioPlayer = ({ track }: { track: any }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (track) {
      setTimeout(() => {
        if (typeof track.play === 'function') track.play();
        else if (typeof track.attach === 'function' && audioRef.current) track.attach(audioRef.current);
        else if (track instanceof MediaStreamTrack && audioRef.current) audioRef.current.srcObject = new MediaStream([track]);
      }, 0);
      return () => {
        if (typeof track.stop === 'function') track.stop();
        else if (typeof track.detach === 'function' && audioRef.current) track.detach(audioRef.current);
      };
    }
  }, [track]);
  return <audio ref={audioRef} autoPlay className="hidden" />;
};

export function CallInterfacePanel({ callMode, ...props }: CallInterfacePanelProps) {
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(props.isPaused ?? (callMode === 'IN_PERSON'));

  useEffect(() => {
    if (props.isPaused !== undefined && props.isPaused !== isPaused) {
      handlePauseToggle(props.isPaused);
    }
  }, [props.isPaused]);

  useEffect(() => {
    const shouldPause = callMode === 'IN_PERSON';
    setIsPaused(shouldPause);
    if (props.onPauseToggle) props.onPauseToggle(shouldPause);
  }, [callMode]);

  useEffect(() => {
    if (!props.video?.isConnected) return;
    if (callMode === 'AUDIO') {
      props.video.setVideo(false);
      props.video.setAudio(true);
    } else if (callMode === 'VIDEO') {
      props.video.setVideo(true);
      props.video.setAudio(true);
    }
  }, [callMode, props.video?.isConnected]);

  const handleCopyLink = () => {
    if (props.patientJoinLink) {
      const BASE_URL = window.location.origin.includes('localhost') 
        ? 'https://lordliest-thu-unsuccessfully.ngrok-free.dev' 
        : window.location.origin;
      const fullUrl = new URL(props.patientJoinLink, BASE_URL).toString();
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePauseToggle = useCallback(async (forcedOrEvent?: boolean | React.MouseEvent) => {
    const nextState = typeof forcedOrEvent === 'boolean' ? forcedOrEvent : !isPaused;
    if (nextState === isPaused && typeof forcedOrEvent !== 'boolean') return;

    if (nextState) {
      if (props.onStopRecording) props.onStopRecording();
    } else {
      if (props.onStartRecording) props.onStartRecording();
    }

    setIsPaused(nextState);
    props.onPauseToggle?.(nextState);

    if (callMode !== 'IN_PERSON') {
      if (nextState) {
        await props.video?.setAudio(false);
        await props.video?.setVideo(false);
      } else {
        if (callMode === 'AUDIO') {
          await props.video?.setAudio(true);
        } else {
          await props.video?.setAudio(true);
          await props.video?.setVideo(true);
        }
      }
    }
  }, [isPaused, props.video, props.onPauseToggle, props.onStartRecording, props.onStopRecording, callMode]);

  if (callMode === 'VIDEO') {
    return <VideoCallPanel {...props} />;
  }

  // ─── Shared transcript panel ───────────────────────────────────────────────
  const transcriptPanel = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', borderRadius: '0.875rem', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transcript</span>
        {props.transcriptHeaderActions}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {props.transcript.length === 0 && !props.interimText && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingTop: '1.5rem', textAlign: 'center' }}>
            <Waves style={{ width: 22, height: 22, color: '#D1D5DB' }} />
            <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>Listening for conversation...</p>
          </div>
        )}
        {props.transcript.filter(s => s.isFinal).map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, ...(seg.speaker === 'DOCTOR' ? { background: '#F3F4F6', color: '#374151' } : { background: '#EFF6FF', color: '#1D4ED8' }) }}>
              {seg.speaker === 'DOCTOR' ? 'DR' : 'PT'}
            </div>
            <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
              {seg.translatedText || seg.text}
            </p>
          </div>
        ))}
        {props.interimText && (
          <div style={{ display: 'flex', gap: '0.625rem', opacity: 0.7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#EFF6FF', color: '#93C5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>...</div>
            <p style={{ fontSize: 12, color: 'rgba(59,130,246,0.7)', fontStyle: 'italic', margin: 0 }}>{props.interimText}</p>
          </div>
        )}
        {props.remoteInterimText && (
          <div style={{ display: 'flex', gap: '0.625rem', opacity: 0.7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: '#EFF6FF', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>...</div>
            <p style={{ fontSize: 12, color: 'rgba(99,102,241,0.7)', fontStyle: 'italic', margin: 0 }}>{props.remoteInterimText}</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {props.transcriptBottomActions && (
        <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
          {props.transcriptBottomActions}
        </div>
      )}
    </div>
  );

  // ─── IN_PERSON Layout ─────────────────────────────────────────────────────
  if (callMode === 'IN_PERSON') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #14B8A6', background: '#F0FDFA', borderRadius: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem', gap: '0.75rem' }}>

          {/* Recording control card */}
          <div style={{ background: 'white', borderRadius: '0.875rem', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
            {isPaused ? (
              <>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MicOff style={{ width: 34, height: 34, color: '#9CA3AF' }} />
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tap to begin</p>
                <button
                  onClick={handlePauseToggle}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 2.5rem', borderRadius: '9999px', background: '#0D9488', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}
                >
                  <Mic style={{ width: 20, height: 20 }} />
                  Start Recording
                </button>
              </>
            ) : (
              <>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#CCFBF1', border: '3px solid #14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px rgba(20,184,166,0.12)' }}>
                  <Mic style={{ width: 34, height: 34, color: '#0D9488' }} />
                </div>
                {/* Waveform */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 36 }}>
                  {[...Array(14)].map((_, i) => (
                    <div key={i} style={{ width: 3, borderRadius: 1.5, background: '#14B8A6', height: `${Math.max(4, Math.abs(Math.sin(i * 0.75)) * 22 + 6)}px`, animation: `wave ${1 + (i % 3) * 0.3}s ease-in-out infinite alternate` }} />
                  ))}
                </div>
                <button
                  onClick={handlePauseToggle}
                  style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'transparent', border: '1px solid #FEE2E2', borderRadius: '0.5rem', padding: '0.3rem 0.875rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Stop Recording
                </button>
              </>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: 'rgba(20,184,166,0.2)', flexShrink: 0 }} />

          {/* Small mic indicator (right-aligned) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #14B8A6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic style={{ width: 16, height: 16, color: '#14B8A6' }} />
            </div>
          </div>

          {/* Transcript */}
          {transcriptPanel}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(2.4); } }
        ` }} />
      </div>
    );
  }

  // ─── AUDIO Layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #F59E0B', background: '#FFFBEB', borderRadius: '1rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem', gap: '0.875rem' }}>

        {/* Visualization */}
        <div style={{ background: 'white', borderRadius: '0.875rem', border: '1px solid #FDE68A', padding: '1.25rem 1rem', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* PT */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#6B7280' }}>PT</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Patient</span>
            </div>

            {/* Waveform */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 50, padding: '0 0.5rem' }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ width: 4, borderRadius: 2, background: '#F59E0B', height: `${Math.max(6, Math.abs(Math.sin(i * 0.9 + 0.5)) * 28 + 8)}px`, animation: !isPaused ? `wave ${1 + (i % 3) * 0.25}s ease-in-out infinite alternate` : 'none', opacity: 0.85 }} />
              ))}
            </div>

            {/* DR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF3C7', border: '2.5px solid #F59E0B', boxShadow: '0 0 0 6px rgba(245,158,11,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#92400E' }}>DR</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Doctor</span>
            </div>
          </div>

          {/* Pause overlay */}
          {(isPaused || props.isRemotePaused) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,251,235,0.96)', backdropFilter: 'blur(4px)', borderRadius: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF3C7', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pause style={{ width: 18, height: 18, color: '#B45309' }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Call Paused</p>
              {isPaused && (
                <button onClick={handlePauseToggle} style={{ fontSize: 11, color: '#B45309', background: 'transparent', border: '1px solid #FDE68A', borderRadius: '0.375rem', padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  <Play style={{ width: 10, height: 10, display: 'inline', marginRight: 4 }} />Resume
                </button>
              )}
            </div>
          )}

          {/* Hidden Agora audio players */}
          {props.video && !isPaused && !props.isRemotePaused && props.video.remoteUsers?.map((user: any) => (
            <AudioPlayer key={`audio-${user.uid}`} track={user.audioTrack} />
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <button
            onClick={props.onLeave}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.625rem', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0.375rem' }}
          >
            <div style={{ width: 11, height: 11, background: '#EF4444', borderRadius: 2, flexShrink: 0 }} />
            Stop Call
          </button>

          <button
            onClick={handlePauseToggle}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.625rem', background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0.375rem' }}
          >
            <div style={{ width: 11, height: 11, background: '#374151', borderRadius: 2, flexShrink: 0 }} />
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          {props.patientJoinLink && (
            <button
              onClick={handleCopyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.625rem', background: 'transparent', border: 'none', color: '#0D9488', cursor: 'pointer', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0.375rem', marginLeft: 'auto' }}
            >
              {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
              Invite
            </button>
          )}
        </div>

        {/* Transcript */}
        {transcriptPanel}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(2.4); } }
      ` }} />
    </div>
  );
}
