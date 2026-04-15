// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Copy,
  Check,
  Loader2,
  Square,
  Pause,
  Play,
  Maximize,
  Minimize,
  Waves,
} from 'lucide-react';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../types/scribing';

interface VideoCallPanelProps {
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
  onQuestionAnswered?: (questionId: string) => void;
  transcriptHeaderActions?: React.ReactNode;
  transcriptBottomActions?: React.ReactNode;
  isPaused?: boolean;
}

const VideoPlayer = ({ track, isLocal }: { track: any; isLocal?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (track) {
      setTimeout(() => {
        if (typeof track.play === 'function' && containerRef.current) {
          track.play(containerRef.current, { fit: 'cover' });
        } else if (typeof track.attach === 'function' && videoRef.current) {
          track.attach(videoRef.current);
        } else if (track instanceof MediaStreamTrack && videoRef.current) {
          videoRef.current.srcObject = new MediaStream([track]);
        }
      }, 0);
      return () => {
        if (typeof track.stop === 'function') track.stop();
        else if (typeof track.detach === 'function' && videoRef.current) track.detach(videoRef.current);
      };
    }
  }, [track]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#0F172A', overflow: 'hidden', transform: isLocal ? 'scaleX(-1)' : 'none' }}>
      {track && typeof track.play !== 'function' && (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {!track && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VideoOff style={{ width: 32, height: 32, color: '#475569', opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
};

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
  return <audio ref={audioRef} autoPlay style={{ display: 'none' }} />;
};

export function VideoCallPanel({
  video,
  localSpeaker,
  patientJoinLink,
  transcript,
  interimText,
  remoteInterimText,
  isTranscribing,
  isRemotePaused,
  error,
  onLeave,
  onPauseToggle,
  transcriptHeaderActions,
  transcriptBottomActions,
  isPaused: externalPaused,
}: VideoCallPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(externalPaused ?? false);
  const [isFocused, setIsFocused] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalPaused !== undefined && externalPaused !== isPaused) {
      handlePauseToggle(externalPaused);
    }
  }, [externalPaused]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length, interimText]);

  const handleCopyLink = () => {
    if (patientJoinLink) {
      // If doctor is visiting from localhost, force the Ngrok internet url for the patient link
      const BASE_URL = window.location.origin.includes('localhost') 
        ? 'https://lordliest-thu-unsuccessfully.ngrok-free.dev' 
        : window.location.origin;
      const fullUrl = new URL(patientJoinLink, BASE_URL).toString();
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePauseToggle = useCallback(async (forcedOrEvent?: boolean | React.MouseEvent) => {
    const nextState = typeof forcedOrEvent === 'boolean' ? forcedOrEvent : !isPaused;
    if (nextState === isPaused && typeof forcedOrEvent !== 'boolean') return;
    setIsPaused(nextState);
    onPauseToggle?.(nextState);
    if (nextState) {
      await video?.setAudio(false);
      await video?.setVideo(false);
    } else {
      await video?.setAudio(true);
      await video?.setVideo(true);
    }
  }, [isPaused, video, onPauseToggle]);

  // Focused/fullscreen mode
  if (isFocused) {
    return (
      <div style={{ position: 'fixed', inset: '1rem', zIndex: 50, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #E0E7FF' }}>
        {/* Full screen video */}
        <div style={{ flex: 2, position: 'relative', background: '#0F172A', minHeight: '40vh' }}>
          {video?.remoteUsers?.length > 0 && <VideoPlayer track={video.remoteUsers[0]?.videoTrack} isLocal={false} />}
          <div style={{ position: 'absolute', top: 8, right: 8, width: 100, aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)', zIndex: 10 }}>
            <VideoPlayer track={video?.localVideoTrack} isLocal />
          </div>
          <button onClick={() => setIsFocused(false)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Minimize style={{ width: 16, height: 16 }} />
          </button>
          {!(isPaused || isRemotePaused) && video?.remoteUsers?.map((u: any) => <AudioPlayer key={u.uid} track={u.audioTrack} />)}
        </div>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid #F3F4F6' }}>
          <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            <Square style={{ width: 12, height: 12, fill: 'white' }} /> STOP
          </button>
          <button onClick={handlePauseToggle} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#374151' }}>
            {isPaused ? <Play style={{ width: 12, height: 12 }} /> : <Pause style={{ width: 12, height: 12 }} />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <button onClick={video?.toggleMic} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${video?.isMicOn ? '#6366F1' : '#FCA5A5'}`, background: video?.isMicOn ? '#EEF2FF' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {video?.isMicOn ? <Mic style={{ width: 15, height: 15, color: '#6366F1' }} /> : <MicOff style={{ width: 15, height: 15, color: '#EF4444' }} />}
          </button>
          <button onClick={video?.toggleCamera} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${video?.isCameraOn ? '#6366F1' : '#FCA5A5'}`, background: video?.isCameraOn ? '#EEF2FF' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {video?.isCameraOn ? <Video style={{ width: 15, height: 15, color: '#6366F1' }} /> : <VideoOff style={{ width: 15, height: 15, color: '#EF4444' }} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', border: '1px solid #E0E7FF', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem', gap: '0.75rem' }}>

        {/* ── Video area ── */}
        <div style={{ borderRadius: '0.75rem', overflow: 'hidden', background: '#0F172A', position: 'relative', height: '180px', flexShrink: 0, border: '1px solid #1E293B' }}>
          {/* Remote */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {video?.remoteUsers?.length > 0 && <VideoPlayer track={video.remoteUsers[0]?.videoTrack} isLocal={false} />}
          </div>

          {/* Local PiP */}
          <div style={{ position: 'absolute', top: 8, right: 8, width: 72, aspectRatio: '16/9', background: '#000', borderRadius: 6, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.15)', zIndex: 10 }}>
            <VideoPlayer track={video?.localVideoTrack} isLocal />
          </div>

          {/* Hidden audio */}
          {!(isPaused || isRemotePaused) && video?.remoteUsers?.map((u: any) => (
            <AudioPlayer key={`audio-${u.uid}`} track={u.audioTrack} />
          ))}

          {/* Paused overlay */}
          {(isPaused || isRemotePaused) && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(6px)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pause style={{ width: 22, height: 22, color: '#818CF8' }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Paused</p>
              {isPaused && (
                <button onClick={handlePauseToggle} style={{ fontSize: 11, color: '#818CF8', background: 'transparent', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.375rem', padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  <Play style={{ width: 10, height: 10, display: 'inline', marginRight: 4 }} />Resume
                </button>
              )}
            </div>
          )}

          {/* Connecting overlay */}
          {!video?.isConnected && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', background: '#1E293B' }}>
              <Loader2 style={{ width: 28, height: 28, color: '#6366F1', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Connecting to secure video channel...</p>
            </div>
          )}

          {/* Waiting overlay */}
          {video?.isConnected && video?.remoteUsers?.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', background: '#1E293B' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video style={{ width: 22, height: 22, color: '#6366F1' }} />
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, background: '#0F172A', border: '1px solid #1E293B', padding: '0.25rem 0.875rem', borderRadius: '9999px', margin: 0 }}>
                Waiting for {localSpeaker === 'DOCTOR' ? 'patient' : 'doctor'}...
              </p>
            </div>
          )}

          {/* Transcribing badge */}
          {isTranscribing && (
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '9999px', padding: '0.25rem 0.625rem', backdropFilter: 'blur(8px)' }}>
              <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-block' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.75 }} />
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Listening</span>
            </div>
          )}
        </div>

        {/* ── Patient invite link ── */}
        {patientJoinLink && localSpeaker === 'DOCTOR' && (
          <div style={{ display: 'flex', alignItems: 'center', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Patient Portal</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#4338CA', margin: '2px 0 0' }}>Invite Call Link</p>
            </div>
            <button onClick={handleCopyLink} style={{ width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              {copied ? <Check style={{ width: 14, height: 14, color: '#10B981' }} /> : <Copy style={{ width: 14, height: 14 }} />}
            </button>
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
          {/* STOP */}
          <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Square style={{ width: 11, height: 11, fill: 'white' }} /> Stop
          </button>

          {/* PAUSE */}
          <button onClick={handlePauseToggle} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151' }}>
            {isPaused ? <Play style={{ width: 11, height: 11 }} /> : <Pause style={{ width: 11, height: 11 }} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          {/* Icon controls (right) */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button onClick={() => setIsFocused(true)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E0E7FF', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366F1' }}>
              <Maximize style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={video?.toggleMic} style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${video?.isMicOn ? '#C7D2FE' : '#FCA5A5'}`, background: video?.isMicOn ? '#EEF2FF' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {video?.isMicOn ? <Mic style={{ width: 13, height: 13, color: '#6366F1' }} /> : <MicOff style={{ width: 13, height: 13, color: '#EF4444' }} />}
            </button>
            <button onClick={video?.toggleCamera} style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${video?.isCameraOn ? '#C7D2FE' : '#FCA5A5'}`, background: video?.isCameraOn ? '#EEF2FF' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {video?.isCameraOn ? <Video style={{ width: 13, height: 13, color: '#6366F1' }} /> : <VideoOff style={{ width: 13, height: 13, color: '#EF4444' }} />}
            </button>
          </div>
        </div>

        {/* ── Transcript ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', borderRadius: '0.875rem', border: '1px solid #E5E7EB' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid #6366F1', paddingBottom: '0.2rem' }}>Transcript</span>
            {transcriptHeaderActions && <div>{transcriptHeaderActions}</div>}
          </div>

          {/* Scroll area */}
          <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '0.625rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {transcript.length === 0 && !interimText && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingTop: '1.5rem', textAlign: 'center' }}>
                <Waves style={{ width: 22, height: 22, color: '#D1D5DB' }} />
                <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>Listening for conversation...</p>
              </div>
            )}
            {transcript.filter(s => s.isFinal).map((seg, idx) => (
              <div key={`${seg.speaker}-${seg.sequenceNumber}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: seg.speaker === 'DOCTOR' ? '#3B82F6' : '#16A34A' }}>
                  {seg.speaker === 'DOCTOR' ? 'DR' : 'PT'}
                </div>
                <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                  {seg.translatedText || seg.text}
                </p>
              </div>
            ))}
            {interimText && (
              <div style={{ display: 'flex', gap: '0.625rem', opacity: 0.65 }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>DR</div>
                <p style={{ fontSize: 12, color: 'rgba(59,130,246,0.7)', fontStyle: 'italic', margin: 0 }}>{interimText}</p>
              </div>
            )}
            {remoteInterimText && (
              <div style={{ display: 'flex', gap: '0.625rem', opacity: 0.65 }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, color: '#4ADE80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>PT</div>
                <p style={{ fontSize: 12, color: 'rgba(34,197,94,0.7)', fontStyle: 'italic', margin: 0 }}>{remoteInterimText}</p>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          {transcriptBottomActions && (
            <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
              {transcriptBottomActions}
            </div>
          )}
        </div>

        {/* Error */}
        {(video?.error || error) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 10, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
            {video?.error || error}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
      ` }} />
    </div>
  );
}
