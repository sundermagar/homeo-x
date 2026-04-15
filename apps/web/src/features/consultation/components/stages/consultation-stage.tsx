import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AICaptureModule } from '../ai-capture-module';
import { CallInterfacePanel, type CallMode } from '../../../../components/video-call/call-interface-panel';
import { useBinaryTranscriber } from '../../../../hooks/use-binary-transcriber';
import { useAiTranslate } from '../../../../hooks/use-ai-suggest';
import type { VideoCallState } from '../consultation-header';
import type { SoapSuggestion, HomeopathyConsultResult } from '../../../../types/ai';
import type { GnmAnalysis } from '../../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../../types/scribing';
import { useAiQuestionSuggestions } from '../../hooks/use-ai-question-suggestions';
import './stages.css';

interface ConsultationStageProps {
  visitId: string;
  visit: any;
  patient: any;
  patientAge?: number;
  sttLanguage: 'en-IN' | 'hi-IN';
  onSoapGenerated: (s: SoapSuggestion) => void;
  onHomeopathyConsultGenerated: (r: HomeopathyConsultResult) => void;
  onVoiceUsed: () => void;
  onTranscriptUpdate: (t: string) => void;
  videoCallState: VideoCallState | null;
  onStartVideoCall: (s: VideoCallState | null) => void;
  callMode: CallMode;
  video: any;
  isVideoPaused: boolean;
  onPauseToggle: (p: boolean) => void;
  gnmAnalysis: GnmAnalysis | null;
}

function GradeBadge({ grade }: { grade: number }) {
  return <span className={`grade-badge grade-badge--${Math.min(grade, 3)}`}>{grade}</span>;
}

export function ConsultationStage({
  visitId, visit, patient, patientAge, sttLanguage,
  onSoapGenerated, onHomeopathyConsultGenerated, onVoiceUsed,
  onTranscriptUpdate, videoCallState, onStartVideoCall,
  callMode, video, isVideoPaused, onPauseToggle, gnmAnalysis,
}: ConsultationStageProps) {
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [remoteInterimText, setRemoteInterimText] = useState<string | null>(null);
  const nextSeqRef = useRef(0);
  useAiTranslate();

  const patientJoined = callMode !== 'IN_PERSON' && video?.remoteUsers?.length > 0;
  const triggerEvents = gnmAnalysis?.coreConflict?.triggerEvents || [];
  const mentalTraits = gnmAnalysis?.homeopathicTotality?.mentalEmotional || [];
  const physicalGenerals = gnmAnalysis?.homeopathicTotality?.physicalGenerals || [];
  const phases = gnmAnalysis?.phases;
  const conflict = gnmAnalysis?.coreConflict;

  const completedSections = [triggerEvents.length > 0, mentalTraits.length > 0, physicalGenerals.length > 0].filter(Boolean).length;
  const totalSections = 6;

  const onTranscriptResult = useCallback((result: any) => {
    if (result.isTranslationUpdate) {
      setSegments(prev => {
        const updated = prev.map(s =>
          (s.timestamp === result.timestamp && s.speaker === (result.role === 'PATIENT' ? 'PATIENT' : 'DOCTOR'))
            ? { ...s, translatedText: result.translatedText } : s
        );
        const fullText = updated.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n');
        setTimeout(() => onTranscriptUpdate?.(fullText), 0);
        return updated;
      });
      return;
    }
    const speaker: SpeakerLabel = result.role === 'PATIENT' ? 'PATIENT' : 'DOCTOR';
    if (result.isFinal) {
      const segment: TranscriptSegmentLocal = {
        sequenceNumber: nextSeqRef.current++, text: result.text,
        translatedText: result.translatedText, speaker, confidence: 0.95,
        startTimeMs: 0, endTimeMs: 0, isFinal: true, timestamp: result.timestamp,
      };
      setSegments(prev => {
        const updated = [...prev, segment];
        const fullText = updated.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n');
        setTimeout(() => onTranscriptUpdate?.(fullText), 0);
        return updated;
      });
      if (speaker === 'DOCTOR') setInterimText(''); else setRemoteInterimText(null);
    } else {
      if (speaker === 'DOCTOR') setInterimText(result.text); else setRemoteInterimText(result.text);
    }
  }, [onTranscriptUpdate]);

  const binaryTranscriber = useBinaryTranscriber({
    visitId, engine: 'GOOGLE', languageCode: sttLanguage, role: 'DOCTOR',
    onTranscript: onTranscriptResult, onError: (err) => console.error('Transcription error:', err),
  });

  useEffect(() => {
    if (callMode === 'IN_PERSON') return;
    if (patientJoined && !binaryTranscriber.isRecording && !binaryTranscriber.isConnecting) {
      binaryTranscriber.startRecording(); onVoiceUsed?.();
    } else if (!patientJoined && binaryTranscriber.isRecording) {
      binaryTranscriber.stopRecording(); setInterimText(''); setRemoteInterimText(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientJoined, callMode]);

  const handleStartRecording = useCallback(() => { binaryTranscriber.startRecording(); onVoiceUsed?.(); }, [binaryTranscriber, onVoiceUsed]);
  const handleStopRecording = useCallback(() => { binaryTranscriber.stopRecording(); setInterimText(''); setRemoteInterimText(null); }, [binaryTranscriber]);
  const aiQuestions = useAiQuestionSuggestions(segments, binaryTranscriber.isRecording);

  // Auto-expand questions panel when new questions arrive
  useEffect(() => {
    if (aiQuestions.questions.length > 0) {
      setQuestionsExpanded(true);
    }
  }, [aiQuestions.questions.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Progress Bar */}
      {gnmAnalysis && (
        <div className="consult-stage__progress-bar">
          <Sparkles style={{ width: 14, height: 14, flexShrink: 0, color: '#B45309' }} />
          <span className="consult-stage__progress-text">
            {conflict ? `Background complete — ${conflict.conflictType} confirmed` : 'AI analyzing conversation...'}
            {phases?.isRecurrentTrack && ` · ${phases.trackTriggers?.length || 0} rails found`}
            {mentalTraits?.length > 0 ? ` · Now extracting mental generals` : ''}
          </span>
          <span className="consult-stage__progress-badge">{completedSections}/{totalSections}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'row', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* LEFT: Symptom panels */}
        <div className="stage-col--main stage-section">
          {/* Never Well Since */}
          <div className="symptom-group" style={{ borderColor: 'var(--border-default)' }}>
            <div className="symptom-group__header" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-light)' }}>
              <span className="symptom-group__header-label" style={{ color: 'var(--text-secondary)' }}>⚡ Never Well Since — Event Timeline</span>
              {triggerEvents.length > 0 && <span className="symptom-count-badge" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)' }}>✓ All extracted</span>}
            </div>
            <div style={{ padding: '1rem' }}>
              {triggerEvents.length > 0 ? (
                <div className="dhs-timeline">
                  {triggerEvents.map((event, i) => (
                    <div key={i} className="dhs-event">
                      <p className="dhs-event-label">Event {i + 1} {i === 0 && '· PRIMARY DHS'}{i > 0 && ` · Rail ${i}`}</p>
                      <p className="dhs-event-body">"{event}"</p>
                      {conflict && i === 0 && <p className="dhs-event-conflict">{conflict.conflictType} · {conflict.affectedTissue}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                  Timeline will build from conversation...
                </p>
              )}
            </div>
          </div>

          {/* Mental Generals */}
          <div className="symptom-group symptom-group--mental">
            <div className="symptom-group__header">
              <span className="symptom-group__header-label">💜 Mental Generals</span>
              {mentalTraits.length > 0 && <span className="symptom-count-badge">{mentalTraits.length} extracted</span>}
            </div>
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {mentalTraits.length > 0 ? mentalTraits.map((trait, i) => (
                <div key={i} className="symptom-row">
                  <span className="symptom-row__text">{trait}</span>
                  <GradeBadge grade={3} />
                </div>
              )) : <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '0.75rem 0' }}>Extracting from conversation...</p>}
            </div>
          </div>

          {/* Physical Generals */}
          <div className="symptom-group symptom-group--physical">
            <div className="symptom-group__header">
              <span className="symptom-group__header-label">🔴 Physical Generals</span>
              {physicalGenerals.length > 0 && <span className="symptom-count-badge">{physicalGenerals.length} confirmed</span>}
            </div>
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {physicalGenerals.length > 0 ? physicalGenerals.map((gen, i) => (
                <div key={i} className="symptom-row">
                  <span className="symptom-row__text">{gen}</span>
                  <GradeBadge grade={2} />
                </div>
              )) : <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '0.75rem 0' }}>Pending extraction...</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: sticky transcription panel */}
        <div style={{ width: '18rem', flexShrink: 0, position: 'sticky', top: '1rem', height: 'calc(100vh - 7rem)', minHeight: '520px' }}>
          <AICaptureModule
            visitId={visitId}
            aiContext={{ specialty: visit.specialty, patientAge, patientGender: patient?.gender, allergies: patient?.allergies }}
            externalSegments={segments}
            isExternalRecording={binaryTranscriber.isRecording}
            onSoapGenerated={onSoapGenerated}
            onHomeopathyConsultGenerated={onHomeopathyConsultGenerated}
            onVoiceUsed={onVoiceUsed}
            onTranscriptUpdate={onTranscriptUpdate}
          >
            {({ AttachLabButton, GenerateButton, uploadStatus }) => (
              <CallInterfacePanel
                callMode={callMode} video={video} localSpeaker="DOCTOR"
                patientJoinLink={videoCallState?.patientJoinLink}
                transcript={segments} interimText={interimText}
                remoteInterimText={remoteInterimText}
                isTranscribing={binaryTranscriber.isRecording}
                isRemotePaused={false} error={null}
                onLeave={() => onStartVideoCall?.(null as any)}
                onPauseToggle={onPauseToggle} isPaused={isVideoPaused}
                onStartRecording={handleStartRecording} onStopRecording={handleStopRecording}
                aiQuestions={aiQuestions.questions} isGeneratingQuestions={aiQuestions.isGenerating}
                onQuestionAnswered={aiQuestions.markAnswered}
                transcriptHeaderActions={AttachLabButton}
                transcriptBottomActions={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {uploadStatus}{GenerateButton}
                  </div>
                }
              />
            )}
          </AICaptureModule>
        </div>
      </div>

      {/* BOTTOM: AI Next Questions */}
      {aiQuestions.questions.length > 0 && (
        <div className="consult-stage__questions-bar">
          <div className="consult-stage__questions-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="consult-stage__sparkle-icon">
                <Sparkles style={{ width: 16, height: 16, color: 'var(--color-primary-600)' }} />
              </div>
              <div>
                <span className="consult-stage__questions-title">
                  Next Questions — AI
                  {aiQuestions.isGenerating && (
                    <span style={{ marginLeft: '0.5rem', fontSize: 10, color: 'var(--color-primary-400)', fontWeight: 500, animation: 'pulse 1.5s ease-in-out infinite' }}>updating...</span>
                  )}
                </span>
                <span className="consult-stage__questions-subtitle">
                  {aiQuestions.questions.filter(q => !q.answered).length} clinical directions to explore
                </span>
              </div>
            </div>
            <button onClick={() => setQuestionsExpanded(!questionsExpanded)} className="consult-stage__expand-btn">
              {questionsExpanded ? 'Collapse' : 'Expand Suggestions'}
            </button>
          </div>

          {questionsExpanded && (
            <div className="consult-stage__questions-grid">
              {aiQuestions.questions.filter(q => !q.answered).map((q: any) => (
                <button
                  key={q.id} type="button"
                  onClick={() => {
                    aiQuestions.markAnswered(q.id);
                    const segment: TranscriptSegmentLocal = {
                      sequenceNumber: nextSeqRef.current++, text: q.question,
                      translatedText: q.question, speaker: 'DOCTOR', confidence: 1.0,
                      startTimeMs: 0, endTimeMs: 0, isFinal: true, timestamp: Date.now(),
                    };
                    setSegments(prev => {
                      const updated = [...prev, segment];
                      const fullText = updated.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n');
                      setTimeout(() => onTranscriptUpdate?.(fullText), 0);
                      return updated;
                    });
                  }}
                  className="consult-stage__question-card"
                >
                  <p className="consult-stage__question-text">"{q.question}"</p>
                  <div className="consult-stage__question-arrow">
                    <ArrowRight style={{ width: 12, height: 12, color: 'var(--color-primary-400)' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
