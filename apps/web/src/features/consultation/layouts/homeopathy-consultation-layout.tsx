import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

import { ConsultationHeader, type VideoCallState, type CallMode } from '../components/consultation-header';
import { ConsultationStage } from '../components/stages/consultation-stage';
import { TotalityStage } from '../components/stages/totality-stage';
import { RepertoryStage } from '../components/stages/repertory-stage';
import { PrescriptionStage } from '../components/stages/prescription-stage';
import { ClinicalDirectionSelector } from '../components/clinical-direction-selector';
import { RubricRepertory } from '../components/rubric-repertory';
import { ConsultationBottomBar } from '../components/consultation-bottom-bar';
import { Button } from '../../../components/ui/button';
import { PrintPrescriptionButton } from '../../../components/print/print-prescription-button';
import { useScribingSession } from '../../../hooks/use-scribing';
import { ROUTES } from '../../../lib/constants';
import type { UseConsultationStateReturn } from '../hooks/use-consultation-state';
import type { UiHints } from '../../../types/consultation';
import type { Visit } from '../../../types/visit';
import type { Patient } from '../../../types/patient';

interface HomeopathyConsultationLayoutProps {
  visitId: string;
  visit: Visit;
  patient?: Patient | null;
  uiHints?: UiHints;
  state: UseConsultationStateReturn;
  refetch: () => void;
  videoCallState: VideoCallState | null;
  onStartVideoCall: (state: VideoCallState | null) => void;
  video: any;
}

export function HomeopathyConsultationLayout({
  visitId, visit, patient, state, videoCallState, onStartVideoCall, video,
}: HomeopathyConsultationLayoutProps) {
  const navigate = useNavigate();
  const [callMode, setCallMode] = useState<CallMode>('IN_PERSON');
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [isEditingRubrics, setIsEditingRubrics] = useState(false);

  useEffect(() => { setCallMode('IN_PERSON'); setIsEditingRubrics(false); }, [visitId]);

  useEffect(() => {
    if (!video) return;
    if (callMode === 'AUDIO') { video.setVideo(false); video.setAudio(true); }
    else if (callMode === 'VIDEO') { video.setVideo(true); video.setAudio(true); }
  }, [callMode, video]);

  const { data: scribingSession } = useScribingSession(visitId);
  useEffect(() => { if (scribingSession) state.setSessionId(scribingSession.id); }, [scribingSession, state]);

  const [prescriptionStep, setPrescriptionStep] = useState(1);
  const generatePrescriptionRef = useRef<(() => void) | null>(null);
  const handlePrescriptionStepChange = useCallback((step: number, generateFn: () => void) => {
    setPrescriptionStep(step);
    generatePrescriptionRef.current = generateFn;
  }, []);

  const renderStageContent = () => {
    switch (state.consultStage) {
      case 'CONSULTATION':
        return (
          <>
            {state.isSelectingDirection && state.pendingConsultResult && (
              <div style={{ padding: '3rem 0', animation: 'fadeIn 0.4s ease-out' }}>
                <ClinicalDirectionSelector
                  suggestions={state.pendingConsultResult.diagnosisData}
                  onSelect={state.handleSelectDirection}
                />
              </div>
            )}

            {!state.isSelectingDirection && state.pendingConsultResult && (
              <div style={{
                marginBottom: '1rem',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-2xl)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'fadeIn 0.3s ease-out',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 900, color: 'var(--color-primary-900)', margin: 0, letterSpacing: '-0.01em' }}>Clinical Direction Locked</h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-primary-700)', margin: '2px 0 0' }}>
                    Focusing assessment on: {state.soapData.assessment}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={state.handleReopenDirectionSelector}>
                  Change Direction
                </Button>
              </div>
            )}

            <div style={state.isSelectingDirection ? { display: 'none' } : {}}>
              <ConsultationStage
                visitId={visitId} visit={visit} patient={patient}
                patientAge={state.patientAge} sttLanguage={state.sttLanguage}
                onSoapGenerated={state.handleSoapGenerated}
                onHomeopathyConsultGenerated={state.handleHomeopathyConsultGenerated}
                onVoiceUsed={state.handleVoiceUsed}
                onTranscriptUpdate={state.setOngoingTranscript}
                videoCallState={videoCallState} onStartVideoCall={onStartVideoCall}
                callMode={callMode} video={video}
                isVideoPaused={isVideoPaused} onPauseToggle={setIsVideoPaused}
                gnmAnalysis={state.gnmAnalysis}
              />
            </div>
          </>
        );

      case 'TOTALITY':
        return (
          <TotalityStage
            gnmAnalysis={state.gnmAnalysis} rankedRemedies={state.scoredRemedies}
            subjective={state.soapData.subjective} assessment={state.soapData.assessment}
            onRepertorize={() => state.setConsultStage('REPERTORY')}
            onPrescribe={() => state.setConsultStage('PRESCRIPTION')}
          />
        );

      case 'REPERTORY':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-card)', padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: 0 }}>Repertorization Grid</h2>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>Analyze rubric coverage and prescribe manually</p>
              </div>
              <Button onClick={() => setIsEditingRubrics(!isEditingRubrics)} variant="outline" size="sm" style={{ fontWeight: 700 }}>
                {isEditingRubrics ? 'Close Editor' : '+ Add/Edit Rubrics'}
              </Button>
            </div>

            {isEditingRubrics && (
              <div style={{ animation: 'fadeIn 0.3s ease-out', position: 'relative', zIndex: 10 }}>
                <RubricRepertory
                  visitId={visitId}
                  initialRubrics={state.suggestedRubrics}
                  onRubricsChange={state.setSuggestedRubrics}
                  onScoredRemediesChange={state.setScoredRemedies}
                  onAutoSuggestRemedy={state.handleAutoSuggestRemedy}
                />
              </div>
            )}

            <RepertoryStage
              selectedRubrics={state.suggestedRubrics}
              scoredRemedies={state.scoredRemedies}
              onApplyRemedy={(name, potency) => state.handleApplyGnmRemedy(name, potency)}
            />
          </div>
        );

      case 'PRESCRIPTION':
        return (
          <PrescriptionStage
            visitId={visitId} rxItems={state.rxItems}
            onRxItemsChange={state.setRxItems}
            advice={state.advice} onAdviceChange={state.setAdvice}
            followUp={state.followUp} onFollowUpChange={state.setFollowUp}
            diagnoses={state.selectedDiagnoses} soapData={state.soapData}
            patient={patient ? { name: `${patient.firstName} ${patient.lastName}`, age: state.patientAge, gender: patient.gender, mrn: patient.mrn || patient.id } : null}
            gnmAnalysis={state.gnmAnalysis} scoredRemedies={state.scoredRemedies}
            onComplete={state.handleComplete} isCompleting={state.isCompleting}
            onPrescriptionStepChange={handlePrescriptionStepChange}
          />
        );

      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-surface-2)' }}>
      <ConsultationHeader
        visit={visit} patient={patient}
        onStartVideoCall={onStartVideoCall} onLeaveCall={() => onStartVideoCall(null)}
        callMode={callMode} onCallModeChange={setCallMode}
        isTranscribing={false} consultStage={state.consultStage}
        onStageChange={state.setConsultStage}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1rem 1rem 6rem' }}>
          {renderStageContent()}
        </div>
      </div>

      <ConsultationBottomBar
        onComplete={() => {
          if (state.consultStage === 'CONSULTATION') state.setConsultStage('TOTALITY');
          else if (state.consultStage === 'TOTALITY') state.setConsultStage('REPERTORY');
          else if (state.consultStage === 'REPERTORY') state.setConsultStage('PRESCRIPTION');
          else if (state.consultStage === 'PRESCRIPTION' && prescriptionStep === 2) {
            generatePrescriptionRef.current?.();
          } else {
            state.handleComplete();
          }
        }}
        onSkipAction={() => { if (state.consultStage === 'TOTALITY') state.setConsultStage('PRESCRIPTION'); }}
        onSaveDraft={state.handleSaveDraft}
        isCompleting={state.isCompleting}
        isSaving={state.isSaving}
        completeLabel={
          state.consultStage === 'CONSULTATION' ? 'Wrap up →' :
          state.consultStage === 'TOTALITY'     ? 'Repertorize →' :
          state.consultStage === 'REPERTORY'    ? 'Prescribe →' :
          prescriptionStep === 2               ? 'Generate Prescription →' :
          'Complete & Next Patient'
        }
      />

      {/* Completion Overlay */}
      {state.showCompleted && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{
            background: 'white', borderRadius: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            padding: '2.5rem', maxWidth: '24rem', width: '100%', margin: '0 1rem',
            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem',
            animation: 'fadeIn 0.5s ease-out',
          }}>
            <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
              <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: 'white' }} />
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 0.5rem' }}>
                Consultation Complete
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                The remedy plan, GNM analysis, and SOAP notes have been successfully archived.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <PrintPrescriptionButton
                visitId={visitId} variant="outline" size="md"
                label="Download Prescription"
                style={{ width: '100%', height: '3rem', borderRadius: 'var(--radius-xl)', border: '2px solid var(--border-default)', fontWeight: 700, color: 'var(--text-secondary)' }}
                inlineData={{ soapData: state.soapData, rxItems: state.rxItems, advice: state.advice, followUp: state.followUp, visit: visit as any, patient: patient as any }}
              />
              <Button onClick={() => navigate(ROUTES.DOCTOR_QUEUE)} style={{ width: '100%', height: '3rem', borderRadius: 'var(--radius-xl)', fontWeight: 900, fontSize: 'var(--font-size-sm)' }}>
                <ArrowRight style={{ width: 16, height: 16, marginRight: '0.5rem' }} />
                Next Patient
              </Button>
            </div>

            <button
              onClick={() => state.setShowCompleted(false)}
              style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color var(--transition-fast)' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-disabled)'}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
