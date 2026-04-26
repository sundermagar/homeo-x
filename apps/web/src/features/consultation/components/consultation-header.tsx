import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, Monitor, Loader2, CheckCircle2 } from 'lucide-react';
import { useVideoCallToken } from '../../../hooks/use-video-call';
import { formatName, calculateAge } from '../../../lib/format';
import { ROUTES } from '../../../lib/constants';
import { toast } from '../../../hooks/use-toast';
import type { Visit } from '../../../types/visit';
import type { Patient } from '../../../types/patient';
import type { ConsultStage } from '../hooks/use-consultation-state';

export type CallMode = 'AUDIO' | 'VIDEO' | 'IN_PERSON';

export interface VideoCallState {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  visitId: string;
  patientJoinLink: string;
}

interface ConsultationHeaderProps {
  visit: Visit;
  patient?: Patient | null;
  onStartVideoCall?: (state: VideoCallState) => void;
  onLeaveCall?: () => void;
  callMode?: CallMode;
  onCallModeChange?: (mode: CallMode) => void;
  consultStage?: ConsultStage;
  onStageChange?: (stage: ConsultStage) => void;
  isTranscribing?: boolean;
}

const STAGE_CONFIG: { key: ConsultStage; number: number; label: string }[] = [
  { key: 'PATIENT_INFO', number: 1, label: 'Patient Info' },
  { key: 'CONSULTATION', number: 2, label: 'Consult' },
  { key: 'TOTALITY', number: 3, label: 'Analysis' },
  { key: 'REPERTORY', number: 4, label: 'Remedy' },
];

function getStageIndex(stage: ConsultStage): number {
  return STAGE_CONFIG.findIndex(s => s.key === stage);
}

export function ConsultationHeader({ 
  visit, 
  patient, 
  onStartVideoCall, 
  onLeaveCall,
  callMode = 'IN_PERSON', 
  onCallModeChange,
  consultStage, 
  onStageChange,
  isTranscribing = false
}: ConsultationHeaderProps) {
  const navigate = useNavigate();
  const videoCallToken = useVideoCallToken();

  const patientName = visit.patient
    ? formatName(visit.patient.firstName, visit.patient.lastName)
    : 'Unknown Patient';

  const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const gender = visit.patient?.gender;
  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleModeClick = async (targetMode: CallMode) => {
    if (!onCallModeChange) return;
    if (targetMode === callMode) return;
    
    // If going from IN_PERSON to VIDEO/AUDIO, we must connect to Agora if not already.
    if ((targetMode === 'AUDIO' || targetMode === 'VIDEO') && callMode === 'IN_PERSON') {
      if (!onStartVideoCall || !visit.id) return;
      try {
        const result = await videoCallToken.mutateAsync({ visitId: visit.id, role: 'host' });
        const rawLink = result.patientJoinLink;
        const dynamicLink = rawLink?.includes('?') ? `${rawLink}&mode=${targetMode.toLowerCase()}` : `${rawLink}?mode=${targetMode.toLowerCase()}`;
        const patientJoinLink = dynamicLink?.startsWith('http')
          ? dynamicLink
          : `${window.location.origin}${dynamicLink || `/meet/${visit.id}?mode=${targetMode.toLowerCase()}`}`;
        onStartVideoCall({
          appId: result.appId,
          channel: result.channel,
          token: result.token,
          uid: result.uid,
          visitId: visit.id,
          patientJoinLink,
        });
        toast({ title: 'Call started', description: 'Share the link with the patient.', variant: 'success' });
        onCallModeChange(targetMode);
      } catch (err) {
        toast({ title: 'Failed to start call', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
      }
    } 
    // If going from VIDEO/AUDIO to IN_PERSON, we leave the call
    else if (targetMode === 'IN_PERSON') {
      onLeaveCall?.();
      onCallModeChange('IN_PERSON');
      toast({ title: 'Switched to In-person', description: 'Remote link disconnected.', variant: 'default' });
    }
    // Switching between AUDIO and VIDEO (requires Agora to toggle cam, layout will handle it)
    else {
      onCallModeChange(targetMode);
    }
  };

  const currentStageIndex = consultStage ? getStageIndex(consultStage) : 0;

  const handleBack = () => {
    if (!consultStage || !onStageChange) {
      navigate(ROUTES.DOCTOR_QUEUE);
      return;
    }

    switch (consultStage) {
      case 'PRESCRIPTION':
        onStageChange('REPERTORY');
        break;
      case 'REPERTORY':
        onStageChange('TOTALITY');
        break;
      case 'TOTALITY':
        onStageChange('CONSULTATION');
        break;
      case 'CONSULTATION':
      default:
        navigate(ROUTES.DOCTOR_QUEUE);
        break;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Back Button + Patient Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0"
            title="Back to queue"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Patient Avatar */}
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
            {initials}
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{patientName}</h1>
            <p className="text-[10px] text-gray-500 truncate">
              {[age != null ? `${age} yr` : null, gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Stage Tabs */}
        {consultStage && onStageChange && (
          <div className="flex items-center gap-1 ml-4">
            {STAGE_CONFIG.map((stage, i) => {
              const isActive = consultStage === stage.key || (stage.key === 'TOTALITY' && consultStage === 'REPERTORY');
              const isCompleted = currentStageIndex > i;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => onStageChange(stage.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm'
                      : isCompleted
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isCompleted && !isActive && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                  <span>{stage.number} {stage.label}</span>
                </button>
              );
            })}

            {/* Repertorization tab — show when on REP or TOTALITY stage */}
            <button
              type="button"
              onClick={() => onStageChange('REPERTORY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                consultStage === 'REPERTORY'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              Rep <span className="text-[9px]">✓</span>
            </button>
          </div>
        )}

        {/* Stage Pagination Dots */}
        {consultStage && (
          <div className="flex items-center gap-1.5 ml-2">
            {[1, 2, 3].map((n) => {
              const isActiveDot = n - 1 === currentStageIndex;
              const isCompletedDot = n - 1 < currentStageIndex;
              return (
                <div
                  key={n}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isCompletedDot
                      ? 'bg-emerald-500 text-white'
                      : isActiveDot
                      ? 'bg-teal-500 text-white ring-2 ring-teal-400/30'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompletedDot ? <CheckCircle2 className="h-3 w-3" /> : n}
                </div>
              );
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button 
            type="button"
            onClick={() => handleModeClick('AUDIO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
              callMode === 'AUDIO' 
                ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audio</span>
          </button>

          {/* Video Toggle */}
          <button
            type="button"
            onClick={() => handleModeClick('VIDEO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
              callMode === 'VIDEO' 
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {videoCallToken.isPending && callMode === 'IN_PERSON' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Video</span>
          </button>

          {/* In-person Toggle */}
          <button
            type="button"
            onClick={() => handleModeClick('IN_PERSON')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
              callMode === 'IN_PERSON' 
                ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">In-person</span>
          </button>

          {/* Dynamic Transcribing Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
            isTranscribing 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-gray-100 border-gray-200'
          }`}>
            <span className="relative flex h-2 w-2">
              {isTranscribing && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isTranscribing ? 'bg-emerald-600' : 'bg-gray-400'}`} />
            </span>
            <span className={`text-[10px] font-bold ${isTranscribing ? 'text-emerald-700' : 'text-gray-500'}`}>
              {isTranscribing 
                ? (callMode === 'IN_PERSON' ? 'Room mic active' : 'Transcribing call') 
                : (callMode === 'VIDEO' ? 'Camera active, Mic off' : 'Mic off')}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 transition-colors ${
              isTranscribing ? 'text-emerald-700 bg-emerald-100' : 'text-gray-500 bg-gray-200'
            }`}>
              {callMode === 'VIDEO' && !isTranscribing ? <Video className="h-2 w-2" /> : <Mic className="h-2 w-2" />}
            </span>
          </div>


        </div>
      </div>
    </header>
  );
}
