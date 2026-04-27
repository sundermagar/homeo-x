import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowRight, Stethoscope, Brain, FlaskConical, UserCircle } from 'lucide-react';

import type { VideoCallState, CallMode } from '../components/consultation-header';
import { PatientInfoStage } from '../components/stages/patient-info-stage';
import { ConsultationStage } from '../components/stages/consultation-stage';
import { TotalityStage } from '../components/stages/totality-stage';
import { RepertoryStage } from '../components/stages/repertory-stage';
import type { RemedyRxRow } from '../components/stages/repertory-stage';
import { ClinicalDirectionSelector } from '../components/clinical-direction-selector';
import { ConsultationBottomBar } from '../components/consultation-bottom-bar';
import { Button } from '../../../components/ui/button';
import { PrintPrescriptionButton } from '../../../components/print/print-prescription-button';
import { useScribingSession, useHomeopathyConsult } from '../../../hooks/use-scribing';
import { useVideoCallToken } from '../../../hooks/use-video-call';
import { useExtractRubrics, useRepertorizeScore } from '../../../hooks/use-repertorization';
import { toast } from '../../../hooks/use-toast';
import { ROUTES } from '../../../lib/constants';
import { formatName, calculateAge } from '../../../lib/format';
import { cn } from '../../../lib/cn';
import type { UseConsultationStateReturn, ConsultStage } from '../hooks/use-consultation-state';
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
  visitId,
  visit,
  patient,
  state,
  videoCallState,
  onStartVideoCall,
  video,
}: HomeopathyConsultationLayoutProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [callMode, setCallMode] = useState<CallMode>('IN_PERSON');
  const [isVideoPaused, setIsVideoPaused] = useState(true);

  // Click-handler for both "Next Patient" buttons — invalidates the dashboard,
  // queue, waitlist, appointments, and visit caches so the doctor sees fresh
  // data. Without this, React Query serves stale entries that still show the
  // just-completed patient as active.
  const handleNextPatient = () => {
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['queue'] });
    qc.invalidateQueries({ queryKey: ['waitlist'] });
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['visits'] });
    qc.invalidateQueries({ queryKey: ['visit', visitId] });
    qc.invalidateQueries({ queryKey: ['appointment-visit', visitId] });
    navigate(ROUTES.DOCTOR_QUEUE);
  };

  // Track RepertoryStage's current data so the bottom bar "Complete" button can use it
  const repertoryDataRef = useRef<{ rows: import('../components/stages/repertory-stage').RemedyRxRow[]; advice: string; followUp: string }>({ rows: [], advice: '', followUp: '' });
  // Reset local layout state when navigating to a new patient
  useEffect(() => {
    setCallMode('IN_PERSON');
  }, [visitId]);

  const { data: scribingSession } = useScribingSession(visitId);

  // Sync scribing session to state
  useEffect(() => {
    if (scribingSession) {
      state.setSessionId(scribingSession.id);
    }
  }, [scribingSession, state]);

  // ─── Video call token ───
  const videoCallToken = useVideoCallToken();

  const handleStartConsultation = useCallback(async () => {
    // CRITICAL: Request mic permission INSIDE the user-gesture click handler.
    // Once granted, the child ConsultationStage's getUserMedia call will succeed
    // even when called from a useEffect (which has no user-gesture context).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release this initial probe stream — the real transcriber will
      // create its own stream once mounted. This is just to grab the permission.
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to start the consultation.',
        variant: 'error',
      });
      return;
    }

    // If Audio or Video mode, start the call first
    if (callMode === 'AUDIO' || callMode === 'VIDEO') {
      try {
        const result = await videoCallToken.mutateAsync({ visitId, role: 'host' });
        const rawLink = result.patientJoinLink;
        const dynamicLink = rawLink?.includes('?')
          ? `${rawLink}&mode=${callMode.toLowerCase()}`
          : `${rawLink}?mode=${callMode.toLowerCase()}`;
        const patientJoinLink = dynamicLink?.startsWith('http')
          ? dynamicLink
          : `${window.location.origin}${dynamicLink || `/meet/${visitId}?mode=${callMode.toLowerCase()}`}`;
        onStartVideoCall({
          appId: result.appId,
          channel: result.channel,
          token: result.token,
          uid: result.uid,
          visitId,
          patientJoinLink,
        });
        toast({ title: 'Call started', description: `Share the patient link to connect. Mode: ${callMode}`, variant: 'success' });
      } catch (err) {
        toast({ title: 'Failed to start call', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
      }
    }
    state.setConsultStage('CONSULTATION');
    setIsVideoPaused(false);
  }, [callMode, visitId, videoCallToken, onStartVideoCall, state, setIsVideoPaused]);

  // ─── Backend repertorization hooks ───
  const extractRubrics = useExtractRubrics();
  const repertorizeScore = useRepertorizeScore();
  const homeopathyConsult = useHomeopathyConsult();

  const handleRepertorize = useCallback(async () => {
    const symptoms = state.categorizedSymptoms;
    const total = symptoms.mental.length + symptoms.physical.length + symptoms.particular.length;
    if (total === 0) {
      toast({ title: 'No symptoms', description: 'Extract symptoms before prescribing.', variant: 'error' });
      return;
    }

    try {
      // Phase 1: Call the unified backend pipeline which internally extracts rubrics,
      // scores remedies, generates prescription drafts, and creates SOAP summaries.
      // Build transcript from symptoms for the AI
      const symptomTranscript = [
        ...symptoms.mental.map(s => `Doctor: Patient reports ${s}`),
        ...symptoms.physical.map(s => `Doctor: Patient has ${s}`),
        ...symptoms.particular.map(s => `Doctor: Patient complains of ${s}`),
      ].join('\n');

      // Awaited — SOAP MUST be populated before the user lands on REPERTORY. Otherwise
      // a user who clicks Approve & Next fast gets an empty prescription PDF.
      let soapPopulated = false;
      try {
        const result: any = await homeopathyConsult.mutateAsync({
          transcript: state.ongoingTranscript || symptomTranscript,
          visitId,
          patientAge: state.patientAge,
          patientGender: patient?.gender,
          thermalReaction: state.thermalReaction,
          miasm: state.miasm,
          consultationMode: state.consultationMode,
        });

        // Set the unified backend results to state
        if (result?.rubricsResult?.suggestedRubrics?.length) {
          state.setSuggestedRubrics(result.rubricsResult.suggestedRubrics);
        }
        if (result?.remedyScores?.scoredRemedies?.length) {
          state.setScoredRemedies(result.remedyScores.scoredRemedies);
        }

        if (result?.prescriptionDraft) {
          const draft = result.prescriptionDraft;
          const clinicalFindings = result.clinicalData?.clinicalFindings || [];
          const objectiveText = clinicalFindings.length > 0
            ? `Clinical Findings:\n- ${clinicalFindings.join('\n- ')}`
            : '';
          const planData = draft.caseAnalysis || '';
          const planText = Array.isArray(planData) ? planData.join('\n') : planData;

          state.setSoapData({
            subjective: draft.consultationSummary || '',
            objective: objectiveText,
            assessment: result.diagnosisData?.primaryDiagnosis?.name || '',
            plan: planText,
            clinicalSummary: result.caseSummary || '',
          });
          soapPopulated = !!(draft.consultationSummary || objectiveText || planText);

          if (draft.advice?.length) {
            state.setAdvice(draft.advice.join('\n'));
          }
          if (draft.followUp) {
            const followUpText = draft.followUp;
            const date = new Date();
            const daysMatch = followUpText.match(/(\d+)\s*day/i);
            const weeksMatch = followUpText.match(/(\d+)\s*week/i);
            const monthsMatch = followUpText.match(/(\d+)\s*month/i);
            if (daysMatch) date.setDate(date.getDate() + parseInt(daysMatch[1]));
            else if (weeksMatch) date.setDate(date.getDate() + parseInt(weeksMatch[1]) * 7);
            else if (monthsMatch) date.setMonth(date.getMonth() + parseInt(monthsMatch[1]));
            else date.setDate(date.getDate() + 15);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            state.setFollowUp(`${yyyy}-${mm}-${dd}`);
          }
        }
      } catch (e) {
        console.warn('[Repertorize] Phase 3 homeopathy consult failed, using fallback SOAP', e);
      }

      // Fallback: AI Phase 3 failed or returned no draft — synthesise a minimal
      // SOAP from the extracted symptoms + top remedy so the printed prescription
      // is never blank.
      if (!soapPopulated) {
        const subjective = [
          visit.chiefComplaint ? `Chief complaint: ${visit.chiefComplaint}` : null,
          symptoms.mental.length ? `Mental: ${symptoms.mental.join('; ')}` : null,
          symptoms.physical.length ? `Physical: ${symptoms.physical.join('; ')}` : null,
          symptoms.particular.length ? `Particular: ${symptoms.particular.join('; ')}` : null,
        ].filter(Boolean).join('\n');

        const topRemedy = state.scoredRemedies?.[0]?.remedyName || (state.scoredRemedies?.[0] as any)?.name;
        state.setSoapData({
          subjective,
          objective: '',
          assessment: topRemedy ? `Indicated remedy: ${topRemedy}` : 'Homeopathic case — see rubrics',
          plan: 'Prescription based on totality of symptoms and repertorization.',
          clinicalSummary: '',
        });
      }

      // Navigate to remedy page AFTER SOAP is populated
      state.setConsultStage('REPERTORY');
    } catch (error) {
      console.error('Prescribing failed:', error);
      toast({ title: 'Prescribing failed', description: 'Please try again.', variant: 'error' });
    }
  }, [state, visit, patient, visitId, extractRubrics, repertorizeScore, homeopathyConsult]);


  // ─── Render current stage content ───
  const renderStageContent = () => {
    switch (state.consultStage) {
      case 'PATIENT_INFO':
        return (
          <PatientInfoStage
            visit={visit}
            patient={patient}
            consultationMode={state.consultationMode}
            onConsultationModeChange={state.setConsultationMode}
            callMode={callMode}
            onCallModeChange={setCallMode}
            onStartConsultation={handleStartConsultation}
          />
        );

      case 'CONSULTATION':
        return (
          <>
            {/* Clinical Direction Selector Overlay */}
            {state.isSelectingDirection && state.pendingConsultResult && (
              <div className="py-12 animate-in fade-in zoom-in duration-500">
                <ClinicalDirectionSelector
                  suggestions={state.pendingConsultResult.diagnosisData}
                  onSelect={state.handleSelectDirection}
                />
              </div>
            )}

            {!state.isSelectingDirection && state.pendingConsultResult && (
              <div className="mb-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md px-5 py-3 flex items-center justify-between animate-in fade-in shadow-sm">
                <div>
                  <h4 className="text-[14px] font-bold text-[#1E3A8A] tracking-tight">Clinical Direction Locked</h4>
                  <p className="text-[12px] font-medium text-[#2563EB] mt-0.5">Focusing assessment on: {state.soapData.assessment}</p>
                </div>
                <button onClick={state.handleReopenDirectionSelector} className="pp-btn-secondary h-9 px-3 text-[12px]">
                   Change Direction
                </button>
              </div>
            )}

            <div className={state.isSelectingDirection ? 'hidden' : ''}>
              <ConsultationStage
                visitId={visitId}
                visit={visit}
                patient={patient}
                patientAge={state.patientAge}
                sttLanguage={state.sttLanguage}
                onSoapGenerated={state.handleSoapGenerated}
                onHomeopathyConsultGenerated={state.handleHomeopathyConsultGenerated}
                onVoiceUsed={state.handleVoiceUsed}
                onTranscriptUpdate={state.setOngoingTranscript}
                videoCallState={videoCallState}
                onStartVideoCall={onStartVideoCall}
                callMode={callMode}
                video={video}
                isVideoPaused={isVideoPaused}
                onPauseToggle={setIsVideoPaused}
                gnmAnalysis={state.gnmAnalysis}
                consultationMode={state.consultationMode}
                onConsultationModeChange={state.setConsultationMode}
                categorizedSymptoms={state.categorizedSymptoms}
                onSymptomsExtracted={state.handleSymptomsExtracted}
                onAnalyseSymptoms={() => state.setConsultStage('TOTALITY')}
              />
            </div>
          </>
        );

      case 'TOTALITY':
        return (
          <TotalityStage
            gnmAnalysis={state.gnmAnalysis}
            rankedRemedies={state.scoredRemedies}
            subjective={state.soapData.subjective}
            assessment={state.soapData.assessment}
            onRepertorize={handleRepertorize}
            onPrescribe={() => state.setConsultStage('PRESCRIPTION')}
            categorizedSymptoms={state.categorizedSymptoms}
            onCategorizedSymptomsChange={state.setCategorizedSymptoms}
            isRepertorizing={extractRubrics.isPending || repertorizeScore.isPending || homeopathyConsult.isPending}
            thermalReaction={state.thermalReaction}
            onThermalReactionChange={state.setThermalReaction}
            miasm={state.miasm}
            onMiasmChange={state.setMiasm}
          />
        );

      case 'REPERTORY':
        return (
          <RepertoryStage
            selectedRubrics={state.suggestedRubrics}
            scoredRemedies={state.scoredRemedies}
            onApplyAllRemedies={async (rows: RemedyRxRow[], advice: string, followUp: string) => {
              // Map the UI rows to the CreatePrescriptionItemInput format
              const rxItems = rows.map(r => ({
                medicationName: r.remedyName,
                genericName: '',
                dosage: r.potency,
                frequency: r.frequency,
                duration: r.duration,
                route: 'Globules',
                instructions: r.instruction,
              }));
              // Call complete with data directly — bypasses async state flush
              await state.handleCompleteWithData(rxItems, advice, followUp);
            }}
            onComplete={() => {}} // noop — completion handled inside onApplyAllRemedies
            isCompleting={state.isCompleting}
            aiAdvice={state.advice}
            aiFollowUp={state.followUp}
            isGeneratingAdvice={homeopathyConsult.isPending}
            onDataChange={(rows, adv, fu) => { repertoryDataRef.current = { rows, advice: adv, followUp: fu }; }}
          />
        );

      default:
        return null;
    }
  };

  // ─── Sidebar step config ───
  const STEPS: { key: ConsultStage; label: string; icon: React.ReactNode }[] = [
    { key: 'PATIENT_INFO', label: 'Patient Info & Mode', icon: <UserCircle className="h-3.5 w-3.5" /> },
    { key: 'CONSULTATION', label: 'Consultation Chat', icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { key: 'TOTALITY', label: 'Symptom Analysis', icon: <Brain className="h-3.5 w-3.5" /> },
    { key: 'REPERTORY', label: 'Remedy & Prescription', icon: <FlaskConical className="h-3.5 w-3.5" /> },
  ];

  const currentStepIdx = STEPS.findIndex(s => s.key === state.consultStage);
  const patientName = patient ? formatName(patient.firstName, patient.lastName) : 'New Patient';
  const patientAge = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined;
  const patientInitials = patientName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const modeLabel = { acute: 'Acute', chronic: 'Chronic', followup: 'Follow-up' }[state.consultationMode] || 'Acute';
  const modeColor = { acute: 'bg-amber-100 text-amber-700', chronic: 'bg-blue-100 text-blue-700', followup: 'bg-emerald-100 text-emerald-700' }[state.consultationMode];
  const typeLabel = { IN_PERSON: 'In-Person', AUDIO: 'Audio Call', VIDEO: 'Video Call' }[callMode];
  const typeIcon = { IN_PERSON: '🏥', AUDIO: '📞', VIDEO: '📹' }[callMode];

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF8]">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-64 bg-white border-r border-[#E3E2DF] flex flex-col shrink-0">
        {/* Patient Card */}
        <div className="px-5 py-4 border-b border-[#E3E2DF] bg-[#FAFAF8]">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-lg mb-3 border border-[#BFDBFE]">
            {patientInitials || '--'}
          </div>
          <div className="text-sm font-bold text-[#0F0F0E]">{patientName}</div>
          <div className="text-xs font-medium text-[#4A4A47] mt-0.5">
            {patientAge ? `Age ${patientAge}` : 'Age —'} <span className="text-[#888786] px-1">•</span> {patient?.gender || '—'}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase', modeColor)}>{modeLabel}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-white border border-[#E3E2DF] text-[#4A4A47] uppercase">{typeIcon} {typeLabel}</span>
          </div>
        </div>

        {/* Step Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {STEPS.map((step, i) => {
            const isActive = step.key === state.consultStage;
            const isDone = i < currentStepIdx;
            return (
              <button
                key={step.key}
                onClick={() => state.setConsultStage(step.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold transition-all duration-200',
                  isActive && 'bg-[#EFF6FF] text-[#2563EB]',
                  isDone && 'text-[#16A34A]',
                  !isActive && !isDone && 'text-[#4A4A47] hover:bg-[#F4F3F1]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200',
                  isActive && 'bg-[#2563EB] text-white',
                  isDone && 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]',
                  !isActive && !isDone && 'bg-[#F4F3F1] text-[#888786] border border-[#E3E2DF]',
                )}>
                  {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                </div>
                {step.label}
              </button>
            );
          })}
        </nav>

        {/* Session Info */}
        <div className="px-4 py-3 border-t border-[#E3E2DF] bg-[#FAFAF8]">
          <div className="text-[10px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Session</div>
          <div className="text-[11px] text-[#4A4A47]">
            {visit.chiefComplaint ? visit.chiefComplaint.slice(0, 50) + (visit.chiefComplaint.length > 50 ? '...' : '') : 'No chief complaint'}
          </div>
          <button
            onClick={handleNextPatient}
            className="mt-2 w-full text-[11px] font-bold text-[#4A4A47] border border-[#E3E2DF] bg-white rounded-md py-1.5 hover:bg-[#F4F3F1] transition-colors"
          >
            ← Back to Queue
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1200px] mx-auto px-5 py-5 pb-24">
            {renderStageContent()}
          </div>
        </div>

        {/* Bottom bar */}
        <ConsultationBottomBar
          onComplete={() => {
            if (state.consultStage === 'PATIENT_INFO') handleStartConsultation();
            else if (state.consultStage === 'CONSULTATION') state.setConsultStage('TOTALITY');
            else if (state.consultStage === 'TOTALITY') handleRepertorize();
            else if (state.consultStage === 'REPERTORY') {
              const { rows, advice, followUp } = repertoryDataRef.current;
              if (rows.length > 0) {
                const rxItems = rows.map(r => ({
                  medicationName: r.remedyName,
                  genericName: '',
                  dosage: r.potency,
                  frequency: r.frequency,
                  duration: r.duration,
                  route: 'Globules',
                  instructions: r.instruction,
                }));
                state.handleCompleteWithData(rxItems, advice, followUp);
              } else {
                state.handleComplete();
              }
            }
          }}
          onBack={() => {
            if (state.consultStage === 'CONSULTATION') state.setConsultStage('PATIENT_INFO');
            else if (state.consultStage === 'TOTALITY') state.setConsultStage('CONSULTATION');
            else if (state.consultStage === 'REPERTORY') state.setConsultStage('TOTALITY');
          }}
          showBack={state.consultStage !== 'PATIENT_INFO'}
          backLabel="Previous"
          onSkipAction={() => {
            if (state.consultStage === 'TOTALITY') state.setConsultStage('PRESCRIPTION');
          }}
          onSaveDraft={state.handleSaveDraft}
          isCompleting={state.isCompleting}
          isSaving={state.isSaving}
          completeLabel={
            state.consultStage === 'PATIENT_INFO' ? 'Start Consultation →' :
            state.consultStage === 'CONSULTATION' ? 'Analyse Symptoms →' :
            state.consultStage === 'TOTALITY' ? 'Proceed to Prescribing →' :
            'Approve & Next'
          }
        />

      </div>{/* end main content column */}

      {/* Completion Overlay */}
      {state.showCompleted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 transition-all duration-300 pp-fade-in">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 text-center border border-[#E3E2DF]">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mb-6">
                 <CheckCircle2 className="h-8 w-8 text-[#16A34A]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">
                Consultation Complete
              </h2>
              <p className="text-sm text-[#4A4A47] leading-relaxed">
                The remedy plan, GNM analysis, and SOAP notes have been successfully archived.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <PrintPrescriptionButton
                visitId={visitId}
                variant="outline"
                size="md"
                label="Download Prescription"
                className="w-full pp-btn-secondary h-10 justify-center"
                inlineData={{
                  soapData: state.soapData,
                  rxItems: repertoryDataRef.current.rows.map(r => ({
                    medicationName: r.remedyName,
                    dosage: r.potency,
                    frequency: r.frequency,
                    duration: r.duration,
                    instructions: r.instruction,
                  })),
                  advice: repertoryDataRef.current.advice,
                  followUp: repertoryDataRef.current.followUp,
                  visit,
                  patient: patient || undefined,
                }}
              />
              <button
                onClick={handleNextPatient}
                className="w-full pp-btn-primary h-10 flex items-center justify-center"
              >
                Next Patient <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>

            <button
              onClick={() => state.setShowCompleted(false)}
              className="mt-4 text-[10px] font-bold text-[#888786] uppercase tracking-widest hover:text-[#4A4A47] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
