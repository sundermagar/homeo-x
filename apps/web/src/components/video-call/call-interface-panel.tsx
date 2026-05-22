import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Square, Pause, Play, Waves, Copy, Check, User } from 'lucide-react';
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
  drInterimText?: string;
  ptInterimText?: string;
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
        else if (typeof track.attach === 'function' && audioRef.current)
          track.attach(audioRef.current);
        else if (track instanceof MediaStreamTrack && audioRef.current)
          audioRef.current.srcObject = new MediaStream([track]);
      }, 0);
      return () => {
        if (typeof track.stop === 'function') track.stop();
        else if (typeof track.detach === 'function' && audioRef.current)
          track.detach(audioRef.current);
      };
    }
  }, [track]);
  return <audio ref={audioRef} autoPlay className="hidden" />;
};

export function CallInterfacePanel({ callMode, ...props }: CallInterfacePanelProps) {
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(props.isPaused ?? false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [props.transcript.length, props.drInterimText, props.ptInterimText, props.interimText]);

  useEffect(() => {
    if (props.isPaused !== undefined && props.isPaused !== isPaused) {
      handlePauseToggle(props.isPaused);
    }
  }, [props.isPaused]);

  useEffect(() => {
    if (callMode === 'IN_PERSON') {
      setIsPaused(false);
      if (props.onPauseToggle) props.onPauseToggle(false);
    }
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
        ? `https://${import.meta.env['VITE_FRONTEND_URL'] || 'frying-deviancy-rocklike.ngrok-free.dev'}`
        : window.location.origin;

      const url = new URL(props.patientJoinLink, BASE_URL);
      url.searchParams.set('mode', callMode.toLowerCase());

      const fullUrl = url.toString();
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePauseToggle = useCallback(
    async (forcedOrEvent?: boolean | React.MouseEvent) => {
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
    },
    [
      isPaused,
      props.video,
      props.onPauseToggle,
      props.onStartRecording,
      props.onStopRecording,
      callMode,
    ],
  );

  if (callMode === 'VIDEO') {
    return <VideoCallPanel {...props} />;
  }

  // ─── Shared transcript panel ───────────────────────────────────────────────
  const transcriptPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'white',
        borderRadius: '0.875rem',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #F3F4F6',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Transcript
        </span>
        {props.transcriptHeaderActions}
      </div>

      {/* Scrollable content */}
      <div
        ref={transcriptRef}
        style={{
          maxHeight: 160,
          minHeight: 100,
          overflowY: 'auto',
          padding: '0.625rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {props.transcript.length === 0 && !props.interimText && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1.5rem 0',
              textAlign: 'center',
            }}
          >
            <Waves style={{ width: 22, height: 22, color: '#D1D5DB' }} />
            <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>
              Listening for conversation...
            </p>
          </div>
        )}
        {/* Final Segments */}
        {props.transcript
          .filter((s) => s.isFinal)
          .map((seg, idx) => {
            const displayText = seg.translatedText || seg.text;
            const isHindi = /[\u0900-\u097F]/.test(seg.text);
            const finalDisplay = isHindi && !seg.translatedText ? 'Translating...' : displayText;

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    background: seg.speaker === 'DOCTOR' ? '#F1F5F9' : '#EEF2FF',
                    color: seg.speaker === 'DOCTOR' ? '#475569' : '#4F46E5',
                    border: `1px solid ${seg.speaker === 'DOCTOR' ? '#E2E8F0' : '#C7D2FE'}`,
                  }}
                >
                  {seg.speaker === 'DOCTOR' ? 'DR' : 'PT'}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: '#1E293B',
                    fontWeight: 500,
                    margin: 0,
                    lineHeight: 1.6,
                    paddingTop: 2,
                  }}
                >
                  {finalDisplay}
                </p>
              </div>
            );
          })}

        {/* Interim Text — DR */}
        {props.drInterimText && (
          <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
                background: '#F8FAFC',
                color: '#94A3B8',
                border: '1px solid #F1F5F9',
              }}
            >
              DR
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#64748B',
                fontStyle: 'italic',
                margin: 0,
                paddingTop: 2,
              }}
            >
              {/[\u0900-\u097F]/.test(props.drInterimText) ? '...' : props.drInterimText}
            </p>
          </div>
        )}

        {/* Interim Text — PT */}
        {props.ptInterimText && (
          <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
                background: '#F5F3FF',
                color: '#A78BFA',
                border: '1px solid #EDE9FE',
              }}
            >
              PT
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#8B5CF6',
                fontStyle: 'italic',
                margin: 0,
                paddingTop: 2,
              }}
            >
              {/[\u0900-\u097F]/.test(props.ptInterimText) ? '...' : props.ptInterimText}
            </p>
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
  // Panel is preserved; only the manual "Tap to begin" message and the
  // Start/Stop Recording buttons are removed. Recording auto-starts on mount,
  // so the panel always renders the active mic + waveform indicator.
  if (callMode === 'IN_PERSON') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid #14B8A6',
          background: '#F0FDFA',
          borderRadius: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '1rem',
            gap: '0.75rem',
          }}
        >
          {/* Recording status card — auto-active, no manual buttons */}
          <div
            style={{
              background: 'white',
              borderRadius: '0.875rem',
              padding: '1.5rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.875rem',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#CCFBF1',
                border: '3px solid #14B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 8px rgba(20,184,166,0.12)',
              }}
            >
              <Mic style={{ width: 34, height: 34, color: '#0D9488' }} />
            </div>
            {/* Waveform */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                height: 36,
              }}
            >
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    borderRadius: 1.5,
                    background: '#14B8A6',
                    height: `${Math.max(4, Math.abs(Math.sin(i * 0.75)) * 22 + 6)}px`,
                    animation: `wave ${1 + (i % 3) * 0.3}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: 'rgba(20,184,166,0.2)', flexShrink: 0 }} />

          {/* Small mic indicator (right-aligned) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={() => handlePauseToggle()}
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1.5px solid #14B8A6',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {isPaused ? (
                <MicOff style={{ width: 16, height: 16, color: '#EF4444' }} />
              ) : (
                <Mic style={{ width: 16, height: 16, color: '#14B8A6' }} />
              )}
            </button>
          </div>

          {/* Transcript */}
          {transcriptPanel}
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(2.4); } }
        `,
          }}
        />
      </div>
    );
  }

  // ─── AUDIO Layout ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        background:
          'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: '1.25rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '1.25rem',
          gap: '1rem',
        }}
      >
        {/* Visualization */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '1rem',
            border: '1px solid #E2E8F0',
            padding: '1.5rem 1.25rem',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* PT */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.625rem',
                opacity:
                  props.localSpeaker === 'DOCTOR' &&
                  (!props.video?.isConnected || props.video?.remoteUsers?.length === 0)
                    ? 0.4
                    : 1,
                transition: 'opacity 0.3s',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%)',
                  border: '2.5px solid #14B8A6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F766E',
                  boxShadow: '0 8px 16px rgba(20,184,166,0.12)',
                }}
              >
                <User style={{ width: 28, height: 28 }} />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#0F766E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Patient
              </span>
            </div>

            {/* Waveform or Waiting Indicator */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                height: 60,
                padding: '0 1rem',
              }}
            >
              {!props.video?.isConnected ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #E2E8F0',
                      borderTopColor: '#6366F1',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#6366F1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Connecting
                  </span>
                </div>
              ) : props.video?.remoteUsers?.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: '#F8FAFC',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#6366F1',
                      animation: 'pulse-opacity 1.5s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                    }}
                  >
                    Waiting for {props.localSpeaker === 'DOCTOR' ? 'Patient' : 'Doctor'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        borderRadius: 2,
                        background: 'linear-gradient(to top, #6366F1, #818CF8)',
                        height: `${Math.max(6, Math.abs(Math.sin(i * 0.7 + 0.5)) * 34 + 10)}px`,
                        animation: !isPaused
                          ? `wave ${1 + (i % 4) * 0.2}s ease-in-out infinite alternate`
                          : 'none',
                        opacity: 0.95,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* DR */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.625rem',
                opacity:
                  props.localSpeaker === 'PATIENT' &&
                  (!props.video?.isConnected || props.video?.remoteUsers?.length === 0)
                    ? 0.4
                    : 1,
                transition: 'opacity 0.3s',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #C7D2FE 100%)',
                  border: '2.5px solid #6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4338CA',
                  boxShadow: '0 8px 16px rgba(99,102,241,0.12)',
                }}
              >
                <User style={{ width: 28, height: 28 }} />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#4338CA',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Doctor
              </span>
            </div>
          </div>

          {/* Pause overlay */}
          {(isPaused || props.isRemotePaused) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <Pause style={{ width: 18, height: 18, color: '#475569' }} />
              </div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}
              >
                Call Paused
              </p>
              {isPaused && (
                <button
                  onClick={() => handlePauseToggle()}
                  style={{
                    fontSize: 11,
                    color: '#6366F1',
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '0.5rem',
                    padding: '0.375rem 0.875rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  <Play style={{ width: 10, height: 10 }} />
                  Resume
                </button>
              )}
            </div>
          )}

          {/* Hidden Agora audio players */}
          {props.video &&
            !isPaused &&
            !props.isRemotePaused &&
            props.video.remoteUsers?.map((user: any) => (
              <AudioPlayer key={`audio-${user.uid}`} track={user.audioTrack} />
            ))}
        </div>

        {/* Controls row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexShrink: 0,
            flexWrap: 'wrap',
            marginTop: '0.25rem',
          }}
        >
          <button
            onClick={props.onLeave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '2rem',
              transition: 'all 0.2s',
            }}
          >
            <Square style={{ width: 12, height: 12, fill: '#EF4444' }} />
            Stop Call
          </button>

          <button
            onClick={() => handlePauseToggle()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(71, 85, 105, 0.08)',
              border: '1px solid rgba(71, 85, 105, 0.15)',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '2rem',
              transition: 'all 0.2s',
            }}
          >
            {isPaused ? (
              <Play style={{ width: 12, height: 12 }} />
            ) : (
              <Pause style={{ width: 12, height: 12 }} />
            )}
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={props.video?.toggleMic}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              background: props.video?.isMicOn
                ? 'rgba(99, 102, 241, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: props.video?.isMicOn
                ? '1px solid rgba(99, 102, 241, 0.15)'
                : '1px solid rgba(239, 68, 68, 0.15)',
              color: props.video?.isMicOn ? '#4F46E5' : '#EF4444',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '2rem',
              transition: 'all 0.2s',
            }}
          >
            {props.video?.isMicOn ? (
              <Mic style={{ width: 12, height: 12 }} />
            ) : (
              <MicOff style={{ width: 12, height: 12 }} />
            )}
            {props.video?.isMicOn ? 'Mute' : 'Unmute'}
          </button>

          {props.patientJoinLink && (
            <button
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.875rem',
                background: 'rgba(13, 148, 136, 0.08)',
                border: '1px solid rgba(13, 148, 136, 0.15)',
                color: '#0D9488',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '2rem',
                marginLeft: 'auto',
                transition: 'all 0.2s',
              }}
            >
              {copied ? (
                <Check style={{ width: 12, height: 12 }} />
              ) : (
                <Copy style={{ width: 12, height: 12 }} />
              )}
              Invite
            </button>
          )}
        </div>

        {/* Transcript */}
        {props.localSpeaker === 'DOCTOR' && transcriptPanel}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(2.4); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-opacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `,
        }}
      />
    </div>
  );
}
