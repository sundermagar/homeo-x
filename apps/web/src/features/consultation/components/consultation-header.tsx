import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Mic, Monitor, Loader2, CheckCircle2 } from 'lucide-react';
import { useVideoCallToken } from '../../../hooks/use-video-call';
import { formatName, calculateAge } from '../../../lib/format';
import { ROUTES } from '../../../lib/constants';
import { toast } from '../../../hooks/use-toast';
import type { Visit } from '../../../types/visit';
import type { Patient } from '../../../types/patient';
import type { ConsultStage } from '../hooks/use-consultation-state';
import './consultation-header.css';

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
  { key: 'CONSULTATION', number: 1, label: 'Consult' },
  { key: 'TOTALITY',     number: 2, label: 'Review' },
  { key: 'PRESCRIPTION', number: 3, label: 'Prescribe' },
];

function getStageIndex(stage: ConsultStage): number {
  if (stage === 'REPERTORY') return 1;
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
  isTranscribing = false,
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

    if ((targetMode === 'AUDIO' || targetMode === 'VIDEO') && callMode === 'IN_PERSON') {
      if (!onStartVideoCall || !visit.id) return;
      try {
        const result = await videoCallToken.mutateAsync({ visitId: visit.id, role: 'host' });
        const rawLink = result.patientJoinLink;
        const dynamicLink = rawLink?.includes('?') ? `${rawLink}&mode=${targetMode.toLowerCase()}` : `${rawLink}?mode=${targetMode.toLowerCase()}`;
        const patientJoinLink = dynamicLink?.startsWith('http')
          ? dynamicLink
          : `${window.location.origin}${dynamicLink || `/meet/${visit.id}?mode=${targetMode.toLowerCase()}`}`;
        onStartVideoCall({ appId: result.appId, channel: result.channel, token: result.token, uid: result.uid, visitId: visit.id, patientJoinLink });
        toast({ title: 'Call started', description: 'Share the link with the patient.', variant: 'success' });
        onCallModeChange(targetMode);
      } catch (err) {
        toast({ title: 'Failed to start call', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
      }
    } else if (targetMode === 'IN_PERSON') {
      onLeaveCall?.();
      onCallModeChange('IN_PERSON');
      toast({ title: 'Switched to In-person', description: 'Remote link disconnected.', variant: 'default' });
    } else {
      onCallModeChange(targetMode);
    }
  };

  const currentStageIndex = consultStage ? getStageIndex(consultStage) : 0;

  const handleBack = () => {
    if (!consultStage || !onStageChange) { navigate(ROUTES.DOCTOR_QUEUE); return; }
    switch (consultStage) {
      case 'PRESCRIPTION': onStageChange('REPERTORY'); break;
      case 'REPERTORY':    onStageChange('TOTALITY'); break;
      case 'TOTALITY':     onStageChange('CONSULTATION'); break;
      default:             navigate(ROUTES.DOCTOR_QUEUE); break;
    }
  };

  return (
    <header className="consult-header">
      <div className="consult-header__inner">
        {/* Patient Info */}
        <div className="consult-header__patient">
          <button type="button" onClick={handleBack} className="consult-header__back-btn" title="Back to queue">
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div className="consult-header__avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <h1 className="consult-header__name">{patientName}</h1>
            <p className="consult-header__meta">
              {[age != null ? `${age} yr` : null, gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Stage Tabs */}
        {consultStage && onStageChange && (
          <div className="consult-header__stages">
            {STAGE_CONFIG.map((stage, i) => {
              const isActive = consultStage === stage.key || (stage.key === 'TOTALITY' && consultStage === 'REPERTORY');
              const isCompleted = currentStageIndex > i;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => onStageChange(stage.key)}
                  className={`consult-header__stage-btn ${isActive ? 'consult-header__stage-btn--active' : ''} ${isCompleted && !isActive ? 'consult-header__stage-btn--completed' : ''}`}
                >
                  {isCompleted && !isActive && <CheckCircle2 style={{ width: 12, height: 12, color: 'var(--color-success-500)' }} />}
                  <span>{stage.number} {stage.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onStageChange('REPERTORY')}
              className={`consult-header__stage-btn ${consultStage === 'REPERTORY' ? 'consult-header__stage-btn--active' : ''}`}
            >
              Rep <span style={{ fontSize: 9 }}>✓</span>
            </button>
          </div>
        )}

        {/* Stage Dots */}
        {consultStage && (
          <div className="consult-header__dots">
            {[1, 2, 3].map((n) => {
              const isActiveDot = n - 1 === currentStageIndex;
              const isCompletedDot = n - 1 < currentStageIndex;
              return (
                <div
                  key={n}
                  className={`consult-header__dot ${isCompletedDot ? 'consult-header__dot--completed' : ''} ${isActiveDot ? 'consult-header__dot--active' : ''}`}
                >
                  {isCompletedDot ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : n}
                </div>
              );
            })}
          </div>
        )}

        <div className="consult-header__spacer" />

        {/* Right Controls */}
        <div className="consult-header__controls">
          <button type="button" onClick={() => handleModeClick('AUDIO')}
            className={`consult-header__mode-btn ${callMode === 'AUDIO' ? 'consult-header__mode-btn--active-audio' : ''}`}
          >
            <Mic style={{ width: 14, height: 14 }} />
            <span className="consult-header__mode-label">Audio</span>
          </button>

          <button type="button" onClick={() => handleModeClick('VIDEO')}
            className={`consult-header__mode-btn ${callMode === 'VIDEO' ? 'consult-header__mode-btn--active-video' : ''}`}
          >
            {videoCallToken.isPending && callMode === 'IN_PERSON' ? (
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
            ) : (
              <Video style={{ width: 14, height: 14 }} />
            )}
            <span className="consult-header__mode-label">Video</span>
          </button>

          <button type="button" onClick={() => handleModeClick('IN_PERSON')}
            className={`consult-header__mode-btn ${callMode === 'IN_PERSON' ? 'consult-header__mode-btn--active-inperson' : ''}`}
          >
            <Monitor style={{ width: 14, height: 14 }} />
            <span className="consult-header__mode-label">In-person</span>
          </button>

          {/* Transcribing Indicator */}
          <div className={`consult-header__mic-indicator ${isTranscribing ? 'consult-header__mic-indicator--active' : ''}`}>
            <span className="consult-header__mic-dot">
              {isTranscribing && <span className="consult-header__mic-dot-pulse" />}
              <span className={`consult-header__mic-dot-core ${isTranscribing ? 'consult-header__mic-dot-core--active' : ''}`} />
            </span>
            <span className={`consult-header__mic-label ${isTranscribing ? 'consult-header__mic-label--active' : ''}`}>
              {isTranscribing
                ? (callMode === 'IN_PERSON' ? 'Room mic active' : 'Transcribing call')
                : (callMode === 'VIDEO' ? 'Camera active, Mic off' : 'Mic off')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
