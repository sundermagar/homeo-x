import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowRight, Stethoscope, Brain, FlaskConical, UserCircle, History } from 'lucide-react';

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
          : `${window.location.origin.includes('localhost') 
              ? `https://${import.meta.env['VITE_FRONTEND_URL'] || 'frying-deviancy-rocklike.ngrok-free.dev'}` 
              : window.location.origin}${dynamicLink || `/meet/${visitId}?mode=${callMode.toLowerCase()}`}`;
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

  // ── Follow-up AI Assessment (skips totality + repertory) ──
  const handleFollowUpAssessment = useCallback(async () => {
    try {
      const symptoms = state.categorizedSymptoms;
      const symptomTranscript = [
        ...symptoms.mental.map(s => `Doctor: Patient reports ${s}`),
        ...symptoms.physical.map(s => `Doctor: Patient has ${s}`),
        ...symptoms.particular.map(s => `Doctor: Patient complains of ${s}`),
      ].join('\n');

      const result: any = await homeopathyConsult.mutateAsync({
        transcript: state.ongoingTranscript || symptomTranscript,
        visitId,
        patientAge: state.patientAge,
        patientGender: patient?.gender,
        thermalReaction: state.thermalReaction,
        miasm: state.miasm,
        consultationMode: 'followup',
      });

      // The follow-up handler in use-consultation-state will auto-populate
      // SOAP, advice, prescription based on the REPEAT/CHANGE/ADVICE_ONLY decision.
      state.handleHomeopathyConsultGenerated(result);

      // Navigate to REPERTORY stage to show the populated prescription
      state.setConsultStage('REPERTORY');
    } catch (error) {
      console.error('Follow-up assessment failed:', error);
      toast({ title: 'Follow-up assessment failed', description: 'Please try again.', variant: 'error' });
    }
  }, [state, visit, patient, visitId, homeopathyConsult]);

  const handleRepertorize = useCallback(async () => {
    // For follow-up mode, use the dedicated follow-up pipeline
    if (state.consultationMode === 'followup') {
      return handleFollowUpAssessment();
    }

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
  }, [state, visit, patient, visitId, extractRubrics, repertorizeScore, homeopathyConsult, handleFollowUpAssessment]);


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
        // Follow-up mode: show assessment summary instead of remedy cards
        if (state.consultationMode === 'followup') {
          const decisionStyles = {
            REPEAT: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: '🔄', label: 'Repeat Remedy' },
            CHANGE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '🔀', label: 'Change Remedy' },
            ADVICE_ONLY: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '💡', label: 'Advice Only' },
          };
          const assessment = state.soapData; // Follow-up data is already in SOAP from handleHomeopathyConsultGenerated
          const decisionMatch = assessment.assessment?.match(/(REPEAT|CHANGE|ADVICE_ONLY|Repeat Remedy|Change Remedy|Advice Only)/i);
          const decisionKey = decisionMatch?.[0]?.toUpperCase().replace(/ /g, '_').replace('REMEDY', '').replace('_REPEAT', 'REPEAT').replace('_CHANGE', 'CHANGE') as 'REPEAT' | 'CHANGE' | 'ADVICE_ONLY' || 'REPEAT';
          const style = decisionStyles[decisionKey] || decisionStyles.REPEAT;
          
          return (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Follow-Up Assessment</h2>
                <p className="text-sm text-[#4A4A47] mt-1">AI evaluation of patient response to previous treatment.</p>
              </div>

              {/* Decision Badge */}
              <div className={`${style.bg} ${style.border} border rounded-xl px-6 py-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{style.icon}</span>
                  <span className={`text-lg font-bold ${style.text}`}>{style.label}</span>
                </div>
                <p className="text-sm text-[#4A4A47] font-medium">{assessment.assessment}</p>
              </div>

              {/* Clinical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subjective / Summary */}
                {assessment.subjective && (
                  <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                    <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest mb-2">Clinical Summary</h3>
                    <p className="text-sm text-[#0F0F0E] whitespace-pre-line">{assessment.subjective}</p>
                  </div>
                )}

                {/* Objective / Improvement */}
                {assessment.objective && (
                  <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                    <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest mb-2">Assessment Details</h3>
                    <p className="text-sm text-[#0F0F0E] whitespace-pre-line">{assessment.objective}</p>
                  </div>
                )}

                {/* Plan */}
                {assessment.plan && (
                  <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                    <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest mb-2">Suggested Action</h3>
                    <p className="text-sm text-[#0F0F0E] whitespace-pre-line">{assessment.plan}</p>
                  </div>
                )}

                {/* Advice */}
                {state.advice && (
                  <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                    <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest mb-2">Diet & Lifestyle Advice</h3>
                    <p className="text-sm text-[#0F0F0E] whitespace-pre-line">{state.advice}</p>
                  </div>
                )}
              </div>

              {/* Follow-up Date */}
              {state.followUp && (
                <div className="bg-[#FAFAF8] border border-[#E3E2DF] rounded-lg px-5 py-3 flex items-center gap-3">
                  <span className="text-sm">📅</span>
                  <span className="text-sm font-medium text-[#4A4A47]">Next Follow-up: <strong className="text-[#0F0F0E]">{state.followUp}</strong></span>
                </div>
              )}

              {/* Rx Items — editable so the doctor can adjust the AI's suggested
                  remedy before approving. buildPayload's filter requires every
                  field; making them visible inputs ensures nothing silently
                  drops out at submit time. */}
              <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest">New Prescription</h3>
                  <button
                    type="button"
                    onClick={() =>
                      state.setRxItems(prev => [
                        ...prev,
                        {
                          medicationName: '',
                          genericName: '',
                          dosage: '30C',
                          frequency: 'Stat',
                          duration: '1 day',
                          route: 'Globules',
                          instructions: '',
                        },
                      ])
                    }
                    className="text-[10px] font-bold text-[#2563EB] hover:underline uppercase tracking-wider"
                  >
                    + Add Remedy
                  </button>
                </div>

                {state.rxItems.length === 0 && (
                  <p className="text-[12px] text-[#888786] italic">No remedy suggested. Use "+ Add Remedy" if you want to prescribe.</p>
                )}

                <div className="space-y-3">
                  {state.rxItems.map((item, i) => {
                    const updateItem = (patch: Partial<typeof item>) => {
                      state.setRxItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
                    };
                    const removeItem = () => {
                      state.setRxItems(prev => prev.filter((_, idx) => idx !== i));
                    };
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-start">
                        <input
                          type="text"
                          value={item.medicationName || ''}
                          onChange={(e) => updateItem({ medicationName: e.target.value })}
                          placeholder="Remedy name"
                          className="col-span-4 text-sm font-bold text-[#2563EB] px-2 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                        />
                        <input
                          type="text"
                          value={item.dosage || ''}
                          onChange={(e) => updateItem({ dosage: e.target.value })}
                          placeholder="Potency (30C)"
                          className="col-span-2 text-xs text-[#0F0F0E] px-2 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                        />
                        <input
                          type="text"
                          value={item.frequency || ''}
                          onChange={(e) => updateItem({ frequency: e.target.value })}
                          placeholder="Frequency"
                          className="col-span-2 text-xs text-[#0F0F0E] px-2 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                        />
                        <input
                          type="text"
                          value={item.duration || ''}
                          onChange={(e) => updateItem({ duration: e.target.value })}
                          placeholder="Duration"
                          className="col-span-2 text-xs text-[#0F0F0E] px-2 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                        />
                        <button
                          type="button"
                          onClick={removeItem}
                          title="Remove remedy"
                          className="col-span-2 text-[10px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] border border-[#FECACA] rounded-md py-1.5 px-2 transition-colors uppercase tracking-wider"
                        >
                          Remove
                        </button>
                        <input
                          type="text"
                          value={item.instructions || ''}
                          onChange={(e) => updateItem({ instructions: e.target.value })}
                          placeholder="Instructions (e.g. 2 pills 3 times/day)"
                          className="col-span-12 text-xs text-[#4A4A47] px-2 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // Standard mode: show repertory grid
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
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-[#FAFAF8]">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#E3E2DF] flex flex-col shrink-0 z-10">
        {/* Patient Card */}
        <div className="px-4 py-3 lg:px-5 lg:py-4 border-b border-[#E3E2DF] bg-[#FAFAF8] flex items-center lg:items-start lg:flex-col gap-3 lg:gap-0">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold text-lg lg:mb-3 border border-[#BFDBFE] shrink-0">
            {patientInitials || '--'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[#0F0F0E] truncate">{patientName}</div>
            <div className="text-xs font-medium text-[#4A4A47] mt-0.5 truncate">
              {patientAge ? `Age ${patientAge}` : 'Age —'} <span className="text-[#888786] px-1">•</span> {patient?.gender || '—'}
            </div>
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-1 lg:gap-2 lg:mt-3 items-end lg:items-center shrink-0">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase', modeColor)}>{modeLabel}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-white border border-[#E3E2DF] text-[#4A4A47] uppercase whitespace-nowrap">{typeIcon} {typeLabel}</span>
          </div>
        </div>

        {/* Step Navigation */}
        <nav className="flex-none lg:flex-1 px-4 py-3 lg:py-4 flex flex-wrap lg:flex-col gap-2 lg:gap-0 lg:space-y-1 border-b lg:border-b-0 border-[#E3E2DF]">
          {STEPS.map((step, i) => {
            const isActive = step.key === state.consultStage;
            const isDone = i < currentStepIdx;
            return (
              <button
                key={step.key}
                onClick={() => state.setConsultStage(step.key)}
                className={cn(
                  'flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-md text-[12px] lg:text-[13px] font-semibold transition-all duration-200 whitespace-nowrap',
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
        <div className="hidden lg:block px-4 py-3 border-t border-[#E3E2DF] bg-[#FAFAF8]">
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-5 py-5 pb-8">
            {renderStageContent()}
          </div>
        </div>

        {/* Bottom bar */}
        <ConsultationBottomBar
          onComplete={() => {
            if (state.consultStage === 'PATIENT_INFO') handleStartConsultation();
            else if (state.consultStage === 'CONSULTATION') {
              // Follow-up: skip totality, run assessment directly
              if (state.consultationMode === 'followup') {
                handleFollowUpAssessment();
              } else {
                state.setConsultStage('TOTALITY');
              }
            }
            else if (state.consultStage === 'TOTALITY') handleRepertorize();
            else if (state.consultStage === 'REPERTORY') {
              const { rows, advice, followUp } = repertoryDataRef.current;
              if (rows.length > 0) {
                // Standard new-case flow: RepertoryStage feeds rxItems via repertoryDataRef.
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
              } else if (state.rxItems.length > 0) {
                // Follow-up flow: rxItems was populated by handleHomeopathyConsultGenerated
                // (CHANGE decision sets the alternative remedy). repertoryDataRef stays empty
                // because RepertoryStage doesn't render in follow-up mode — pass rxItems
                // explicitly so the prescription is never lost to a state-flush race.
                state.handleCompleteWithData(state.rxItems, state.advice, state.followUp);
              } else {
                state.handleComplete();
              }
            }
          }}
          onBack={() => {
            if (state.consultStage === 'CONSULTATION') state.setConsultStage('PATIENT_INFO');
            else if (state.consultStage === 'TOTALITY') state.setConsultStage('CONSULTATION');
            else if (state.consultStage === 'REPERTORY') {
              // Follow-up: go back to CONSULTATION (skip totality)
              state.setConsultStage(state.consultationMode === 'followup' ? 'CONSULTATION' : 'TOTALITY');
            }
          }}
          showBack={state.consultStage !== 'PATIENT_INFO'}
          backLabel="Previous"
          onSkipAction={() => {
            if (state.consultStage === 'TOTALITY') state.setConsultStage('PRESCRIPTION');
          }}
          onSaveDraft={state.handleSaveDraft}
          isCompleting={state.isCompleting || homeopathyConsult.isPending}
          isSaving={state.isSaving}
          completeLabel={
            state.consultStage === 'PATIENT_INFO' ? 'Start Consultation →' :
            state.consultStage === 'CONSULTATION' ? (
              state.consultationMode === 'followup' ? 'Run Follow-Up Assessment →' : 'Analyse Symptoms →'
            ) :
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
                  // Standard new-case flow feeds repertoryDataRef from RepertoryStage.
                  // Follow-up flow doesn't render RepertoryStage, so that ref stays
                  // empty — fall back to state.rxItems which is populated by the
                  // follow-up CHANGE handler (and editable on the assessment screen).
                  rxItems: repertoryDataRef.current.rows.length > 0
                    ? repertoryDataRef.current.rows.map(r => ({
                        medicationName: r.remedyName,
                        dosage: r.potency,
                        frequency: r.frequency,
                        duration: r.duration,
                        instructions: r.instruction,
                      }))
                    : state.rxItems.map(item => ({
                        medicationName: item.medicationName,
                        dosage: item.dosage,
                        frequency: item.frequency,
                        duration: item.duration,
                        instructions: item.instructions,
                      })),
                  advice: repertoryDataRef.current.advice || state.advice,
                  followUp: repertoryDataRef.current.followUp || state.followUp,
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

              <button
                onClick={() => navigate(`/medical-cases/${(patient as any)?.regid || visit.patientId}`)}
                className="w-full h-10 flex items-center justify-center text-sm font-bold text-[#4A4A47] border border-[#E3E2DF] bg-white rounded-md hover:bg-[#F4F3F1] transition-colors"
              >
                <History className="h-4 w-4 mr-2" /> View Patient History
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
