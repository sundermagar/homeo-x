import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Waves,
  Check,
  User,
  Link,
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

  // ─── Shared transcript panel ──────────────────────────────────────────────
  const transcriptPanel = (
    <div className="flex flex-col flex-1 min-h-0 mt-3 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-3 pb-2 shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Live Transcript</span>
        {props.transcriptHeaderActions}
      </div>

      {/* Scrollable content */}
      <div ref={transcriptRef} className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 px-1 pb-3">
        {props.transcript.length === 0 && !props.interimText && !props.drInterimText && !props.ptInterimText && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Waves className="w-6 h-6 text-gray-200" />
            <p className="text-[12px] text-gray-400 italic m-0">Listening for conversation...</p>
          </div>
        )}
        {/* Final Segments */}
        {props.transcript.filter(s => s.isFinal).map((seg, idx) => {
          const displayText = seg.translatedText || seg.text;
          const isHindi = /[\u0900-\u097F]/.test(seg.text);
          const finalDisplay = (isHindi && !seg.translatedText) ? 'Translating...' : displayText;
          const isDoctor = seg.speaker === 'DOCTOR';

          return (
            <div key={idx} className={`flex flex-col gap-1 ${isDoctor ? 'items-end' : 'items-start'}`}>
              {/* Label + avatar row */}
              <div className={`flex items-center gap-2 ${isDoctor ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${isDoctor ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                  {isDoctor ? 'DM' : 'RV'}
                </div>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${isDoctor ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
                  {isDoctor ? 'Doctor' : 'Patient'}
                </span>
              </div>
              {/* Bubble */}
              <div className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed text-gray-800 rounded-[16px] ${isDoctor ? 'bg-[#EEF2FF] rounded-tr-[4px] ml-10' : 'bg-[#F3F4F6] rounded-tl-[4px] mr-10'}`}>
                {finalDisplay}
              </div>
            </div>
          );
        })}

        {/* Interim Text — DR */}
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

        {/* Interim Text — PT */}
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
      {props.transcriptBottomActions && (
        <div className="px-1 py-2 border-t border-gray-100 shrink-0">
          {props.transcriptBottomActions}
        </div>
      )}
    </div>
  );

  // ─── IN_PERSON Layout ─────────────────────────────────────────────────────
  if (callMode === 'IN_PERSON') {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-[11px]">
        <div className="border-[1.5px] border-[#3B82F6] bg-[#EFF6FF] rounded-xl p-[14px] flex items-center gap-[13px]">
          <div className="w-[52px] h-[52px] shrink-0 rounded-full bg-[#DBEAFE] border-[2.5px] border-[#3B82F6] flex items-center justify-center text-[#2563EB] shadow-[0_0_0_6px_rgba(59,130,246,0.12)]">
            <Mic className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#1D4ED8] uppercase tracking-widest mb-[7px]">Recording &middot; in-person</div>
            <div className="flex items-center gap-[3px] h-[26px]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-[3px] rounded-[1.5px] bg-[#3B82F6]" style={{ height: `${Math.max(6, Math.abs(Math.sin(i * 0.75)) * 14 + 6)}px`, animation: `awave 1.1s ease-in-out infinite alternate`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
          <button
            onClick={() => handlePauseToggle()}
            title={isPaused ? "Resume Recording" : "Pause Recording"}
            className="w-[36px] h-[36px] shrink-0 rounded-full border-[1.5px] border-[#3B82F6] bg-white text-[#3B82F6] flex items-center justify-center hover:bg-blue-50 transition-colors"
          >
            {isPaused ? <Play className="w-[15px] h-[15px] ml-0.5" /> : <Pause className="w-[15px] h-[15px]" />}
          </button>
        </div>

        {/* Transcript */}
        {transcriptPanel}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes awave { 0% { transform: scaleY(0.35); } 100% { transform: scaleY(1.6); } }
        ` }} />
      </div>
    );
  }



  // ─── AUDIO Layout ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[11px]">
      <div className="bg-white border border-[#E2E8F0] rounded-[14px] p-[18px_14px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative">
        <div className="flex items-center justify-between gap-[8px]">
          {/* PT */}
          <div className={`flex flex-col items-center gap-[7px] ${(props.localSpeaker === 'DOCTOR' && (!props.video?.isConnected || props.video?.remoteUsers?.length === 0)) ? 'opacity-40' : ''} transition-opacity`}>
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#CCFBF1] to-[#99F6E4] border-2 border-[#14B8A6] text-[#0F766E] flex items-center justify-center">
              <User className="w-[24px] h-[24px]" />
            </div>
            <span className="text-[9px] font-[800] text-[#0F766E] uppercase tracking-widest">Patient</span>
          </div>

          {/* Waveform / Waiting */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 h-[50px]">
            {!props.video?.isConnected ? (
              <>
                <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
                <span className="text-[9px] font-[700] text-indigo-500 uppercase tracking-widest">Connecting</span>
              </>
            ) : props.video?.remoteUsers?.length === 0 ? (
              <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 flex flex-col items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[8px] font-[800] text-gray-500 uppercase tracking-widest text-center">
                  Waiting for {props.localSpeaker === 'DOCTOR' ? 'Patient' : 'Doctor'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-indigo-400" style={{ height: `${Math.max(6, Math.abs(Math.sin(i * 0.7 + 0.5)) * 24 + 10)}px`, animation: !isPaused ? `awave ${1 + (i % 4) * 0.2}s ease-in-out infinite alternate` : 'none' }} />
                ))}
              </div>
            )}
          </div>

          {/* DR */}
          <div className={`flex flex-col items-center gap-[7px] ${(props.localSpeaker === 'PATIENT' && (!props.video?.isConnected || props.video?.remoteUsers?.length === 0)) ? 'opacity-40' : ''} transition-opacity`}>
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] border-2 border-[#6366F1] text-[#4338CA] flex items-center justify-center">
              <User className="w-[24px] h-[24px]" />
            </div>
            <span className="text-[9px] font-[800] text-[#4338CA] uppercase tracking-widest">Doctor</span>
          </div>
        </div>

        {/* Pause Overlay */}
        {(isPaused || props.isRemotePaused) && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-[4px] rounded-[14px] flex flex-col items-center justify-center z-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
              <Pause className="w-[18px] h-[18px] text-gray-500" />
            </div>
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest m-0">Call Paused</p>
            {isPaused && (
              <button 
                onClick={() => handlePauseToggle()}
                className="text-[10px] font-semibold text-indigo-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-1 hover:bg-gray-50"
              >
                <Play className="w-3 h-3" /> Resume
              </button>
            )}
          </div>
        )}

        {/* Hidden Audio Players */}
        {props.video && !isPaused && !props.isRemotePaused && props.video.remoteUsers?.map((user: any) => (
          <AudioPlayer key={`audio-${user.uid}`} track={user.audioTrack} />
        ))}
      </div>

      {/* Controls Row (.meetBar) */}
      <div className="flex items-center justify-center gap-[10px] mt-[4px]">
        <button
          onClick={props.video?.toggleMic}
          className={`w-[44px] h-[44px] rounded-full border flex items-center justify-center transition-colors ${props.video?.isMicOn ? 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] hover:bg-[#F3F4F6]' : 'border-red-200 bg-red-50 text-red-500'}`}
          title={props.video?.isMicOn ? 'Mute' : 'Unmute'}
        >
          {props.video?.isMicOn ? <Mic className="w-[19px] h-[19px]" /> : <MicOff className="w-[19px] h-[19px]" />}
        </button>

        <button
          onClick={() => handlePauseToggle()}
          className="w-[44px] h-[44px] rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-[19px] h-[19px] ml-0.5" /> : <Pause className="w-[19px] h-[19px]" />}
        </button>

        <button
          onClick={props.onLeave}
          className="w-[44px] h-[44px] rounded-full border border-[#EF4444] bg-[#EF4444] text-white flex items-center justify-center hover:bg-[#DC2626] transition-colors"
          title="End call"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[19px] h-[19px]">
            <path d="M21 15.46l-5.27-.61-2.52 2.52a15.05 15.05 0 0 1-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" transform="rotate(135 12 12)" />
          </svg>
        </button>

        {props.patientJoinLink && props.localSpeaker === 'DOCTOR' && (
          <button
            onClick={handleCopyLink}
            className={`w-[44px] h-[44px] rounded-full border flex items-center justify-center transition-colors ${copied ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#10B981]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#F3F4F6]'}`}
            title="Copy patient invite link"
          >
            {copied ? <Check className="w-[19px] h-[19px]" /> : <Link className="w-[19px] h-[19px]" />}
          </button>
        )}
      </div>

      {/* Transcript */}
      {props.localSpeaker === 'DOCTOR' && transcriptPanel}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes awave { 0% { transform: scaleY(0.35); } 100% { transform: scaleY(1.6); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-opacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      ` }} />
    </div>
  );
}

