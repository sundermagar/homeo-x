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
  PhoneOff,
  Link
} from 'lucide-react';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../types/scribing';

interface VideoCallPanelProps {
  video: any;
  localSpeaker: SpeakerLabel;
  patientJoinLink?: string;
  transcript: TranscriptSegmentLocal[];
  drInterimText?: string;
  ptInterimText?: string;
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
    if (!track) return;
    
    const element = videoRef.current;
    if (!element) return;

    console.log(`[VideoPlayer] Rendering track:`, track);

    // LiveKit tracks have .attach(element)
    if (typeof track.attach === 'function') {
      track.attach(element);
      return () => {
        if (typeof track.detach === 'function') track.detach(element);
      };
    } 
    
    // Agora tracks have .play(element)
    if (typeof track.play === 'function') {
      track.play(element, { fit: 'cover' });
      return () => {
        if (typeof track.stop === 'function') track.stop();
      };
    }

    // Fallback for MediaStreamTrack
    if (track instanceof MediaStreamTrack) {
      element.srcObject = new MediaStream([track]);
      return () => {
        element.srcObject = null;
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

export function VideoCallPanel(props: VideoCallPanelProps) {
  const {
    video,
    localSpeaker,
    patientJoinLink,
    transcript,
    isTranscribing,
    isRemotePaused,
    error,
    onLeave,
    onPauseToggle,
    transcriptHeaderActions,
    transcriptBottomActions,
    isPaused: externalPaused,
  } = props;
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
  }, [transcript.length, props.drInterimText, props.ptInterimText]);

  const handleCopyLink = () => {
    if (patientJoinLink) {
      // If doctor is visiting from localhost, force the Ngrok internet url for the patient link
      const BASE_URL = window.location.origin.includes('localhost') 
        ? `https://${import.meta.env.VITE_FRONTEND_URL || 'frying-deviancy-rocklike.ngrok-free.dev'}` 
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
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, gap: '11px', flex: 1, minHeight: 0 }}>

        {/* ── Video area ── */}
        <div style={{ borderRadius: '0.75rem', overflow: 'hidden', background: '#1E293B', position: 'relative', aspectRatio: '16/9', maxHeight: '320px', flexShrink: 0 }}>
          {/* Remote */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {video?.remoteUsers?.length > 0 && (
              <VideoPlayer track={video.remoteUsers[0]?.videoTrack} isLocal={false} />
            )}
          </div>

          {/* Local PiP */}
          <div style={{ position: 'absolute', top: 16, right: 16, width: '120px', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', zIndex: 10 }}>
            <VideoPlayer track={video?.localVideoTrack} isLocal />
          </div>

          {/* Hidden audio */}
          {!(isPaused || isRemotePaused) && video?.remoteUsers?.map((u: any) => (
            <AudioPlayer key={`audio-${u.uid}`} track={u.audioTrack} />
          ))}

          {/* Transcribing badge (Top Left) */}
          {isTranscribing && (
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, display: 'flex', alignItems: 'center', gap: '6px', background: '#0F292E', borderRadius: '9999px', padding: '6px 12px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Listening</span>
            </div>
          )}

          {/* Waiting overlay (Center) */}
          {video?.isConnected && video?.remoteUsers?.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1E1B4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video style={{ width: 28, height: 28, color: '#818CF8' }} />
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, background: '#0F172A', padding: '6px 16px', borderRadius: '9999px', margin: 0 }}>
                Waiting for {localSpeaker === 'DOCTOR' ? 'patient' : 'doctor'}...
              </p>
            </div>
          )}

          {/* Patient Badge (Bottom Left) */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #334155', padding: '6px 12px', borderRadius: '8px', zIndex: 10, backgroundColor: '#0F172A' }}>
            {video?.remoteUsers?.[0]?.isMicOn === false ? (
               <MicOff style={{ width: 14, height: 14, color: '#EF4444' }} />
            ) : (
               <Mic style={{ width: 14, height: 14, color: '#10B981' }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{localSpeaker === 'DOCTOR' ? 'Patient' : 'Doctor'}</span>
          </div>

          {/* Full Screen Button (Bottom Right) */}
          <button onClick={() => setIsFocused(true)} style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: '8px', background: 'transparent', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <Maximize style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Controls Row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '0', marginBottom: '0' }}>
          <button
            onClick={video?.toggleMic}
            style={{ width: 40, height: 40, borderRadius: '50%', background: video?.isMicOn ? '#F8FAFC' : '#FEF2F2', border: `1px solid ${video?.isMicOn ? '#E2E8F0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: video?.isMicOn ? '#475569' : '#EF4444' }}
            title={video?.isMicOn ? 'Mute' : 'Unmute'}
          >
            {video?.isMicOn ? <Mic style={{ width: 17, height: 17 }} /> : <MicOff style={{ width: 17, height: 17 }} />}
          </button>

          <button
            onClick={video?.toggleCamera}
            style={{ width: 40, height: 40, borderRadius: '50%', background: video?.isCameraOn ? '#F8FAFC' : '#FEF2F2', border: `1px solid ${video?.isCameraOn ? '#E2E8F0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: video?.isCameraOn ? '#475569' : '#EF4444' }}
            title={video?.isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {video?.isCameraOn ? <Video style={{ width: 17, height: 17 }} /> : <VideoOff style={{ width: 17, height: 17 }} />}
          </button>

          <button
            onClick={onLeave}
            style={{ width: 40, height: 40, borderRadius: '50%', background: '#EF4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
            title="End call"
          >
            <PhoneOff style={{ width: 17, height: 17 }} />
          </button>

          {patientJoinLink && localSpeaker === 'DOCTOR' && (
            <button
              onClick={handleCopyLink}
              style={{ width: 40, height: 40, borderRadius: '50%', background: copied ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${copied ? '#A7F3D0' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: copied ? '#10B981' : '#475569' }}
              title="Copy patient invite link"
            >
              {copied ? <Check style={{ width: 17, height: 17 }} /> : <Link style={{ width: 17, height: 17 }} />}
            </button>
          )}
        </div>

        {/* ── Transcript ── */}
        {localSpeaker === 'DOCTOR' && (
          <div className="flex flex-col flex-1 min-h-0 mt-3 border-t border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-1 pt-3 pb-2 shrink-0">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Live Transcript</span>
              {transcriptHeaderActions && <div>{transcriptHeaderActions}</div>}
            </div>

            {/* Scroll area */}
            <div ref={transcriptRef} className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 px-1 pb-3">
              {transcript.length === 0 && !props.drInterimText && !props.ptInterimText && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Waves className="w-6 h-6 text-gray-200" />
                  <p className="text-[12px] text-gray-400 italic m-0">Listening for conversation...</p>
                </div>
              )}
              {transcript.filter(s => s.isFinal).map((seg, idx) => {
                const isDoctor = seg.speaker === 'DOCTOR';
                const displayText = seg.translatedText || seg.text;
                return (
                  <div key={`${seg.speaker}-${seg.sequenceNumber}-${idx}`} className={`flex flex-col gap-1 ${isDoctor ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 ${isDoctor ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${isDoctor ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                        {isDoctor ? 'DM' : 'RV'}
                      </div>
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${isDoctor ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
                        {isDoctor ? 'Doctor' : 'Patient'}
                      </span>
                    </div>
                    <div className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed text-gray-800 rounded-[16px] ${isDoctor ? 'bg-[#EEF2FF] rounded-tr-[4px] ml-10' : 'bg-[#F3F4F6] rounded-tl-[4px] mr-10'}`}>
                      {displayText}
                    </div>
                  </div>
                );
              })}
              {props.drInterimText && (
                <div className="flex flex-col gap-1 items-end opacity-70">
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-[#F3F4F6] text-gray-400">DM</div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Doctor</span>
                  </div>
                  <div className="max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed text-gray-500 italic bg-[#F9FAFB] rounded-[16px] rounded-tr-[4px] ml-10">
                    {/[\u0900-\u097F]/.test(props.drInterimText) ? '...' : props.drInterimText}
                  </div>
                </div>
              )}
              {props.ptInterimText && (
                <div className="flex flex-col gap-1 items-start opacity-70">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-[#F3F4F6] text-gray-400">PT</div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Patient</span>
                  </div>
                  <div className="max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed text-gray-500 italic bg-[#F3F4F6] rounded-[16px] rounded-tl-[4px] mr-10">
                    {/[\u0900-\u097F]/.test(props.ptInterimText) ? '...' : props.ptInterimText}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            {transcriptBottomActions && (
              <div className="px-1 py-2 border-t border-gray-100 shrink-0">
                {transcriptBottomActions}
              </div>
            )}
          </div>
        )}

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
