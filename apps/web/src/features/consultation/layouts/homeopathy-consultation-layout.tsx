import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowRight, Stethoscope, FileText, FlaskConical, History, ChevronLeft, Save, Monitor, Phone, Video, Copy, MessageSquare, ScrollText, Check, Loader2 } from 'lucide-react';

import type { VideoCallState, CallMode } from '../components/consultation-header';
import { ConsultationStage } from '../components/stages/consultation-stage';
import { CaseSummaryStage } from '../components/stages/case-summary-stage';
import { PrescriptionStage } from '../components/stages/remedy-rx-stage';
import { FinalizeRxStage } from '../components/stages/finalize-rx-stage';
import { LabReportsStage } from '../components/stages/lab-reports-stage';
import type { RemedyRxRow } from '../components/stages/repertory-stage';
import { ClinicalDirectionSelector } from '../components/clinical-direction-selector';
import { Button } from '../../../components/ui/button';
import { PrintPrescriptionButton } from '../../../components/print/print-prescription-button';
import { useScribingSession, useHomeopathyConsult } from '../../../hooks/use-scribing';
import { useVideoCallToken } from '../../../hooks/use-video-call';
import { useExtractRubrics, useRepertorizeScore, useAnalyzeCase, useSuggestSoap } from '../../../hooks/use-repertorization';
import { toast } from '../../../hooks/use-toast';
import { ROUTES } from '../../../lib/constants';
import { calculateAge } from '../../../lib/format';
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
  // Gates the live chat behind a Start click so mic permission is requested in a user gesture.
  const [started, setStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
  const repertoryDataRef = useRef<{ rows: import('../components/stages/repertory-stage').RemedyRxRow[]; advice: string; followUp: string; disease?: string }>({ rows: [], advice: '', followUp: '' });
  // Reset local layout state when navigating to a new patient
  useEffect(() => {
    setCallMode('IN_PERSON');
    setStarted(false);
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
    setStarted(true);
    setIsVideoPaused(false);
  }, [callMode, visitId, videoCallToken, onStartVideoCall, state, setIsVideoPaused]);

  // ── Pick consultation modality from the sidebar (In-person / Audio / Video) ──
  const handleSelectModality = useCallback(async (mode: CallMode) => {
    setCallMode(mode);
    if (mode === 'IN_PERSON') {
      // End any active call when switching back to in-person
      if (videoCallState) {
        try { video?.leave?.(); } catch { /* ignore */ }
        onStartVideoCall(null as any);
      }
      return;
    }
    // Audio / Video: request mic permission (user gesture) then start the call
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast({ title: 'Microphone access denied', description: 'Allow microphone access to start the call.', variant: 'error' });
      return;
    }
    try {
      const result = await videoCallToken.mutateAsync({ visitId, role: 'host' });
      const rawLink = result.patientJoinLink;
      const dynamicLink = rawLink?.includes('?')
        ? `${rawLink}&mode=${mode.toLowerCase()}`
        : `${rawLink}?mode=${mode.toLowerCase()}`;
      const patientJoinLink = dynamicLink?.startsWith('http')
        ? dynamicLink
        : `${window.location.origin.includes('localhost')
          ? `https://${import.meta.env['VITE_FRONTEND_URL'] || 'frying-deviancy-rocklike.ngrok-free.dev'}`
          : window.location.origin}${dynamicLink || `/meet/${visitId}?mode=${mode.toLowerCase()}`}`;
      onStartVideoCall({
        appId: result.appId, channel: result.channel, token: result.token, uid: result.uid, visitId, patientJoinLink,
      });
      setIsVideoPaused(false);
      toast({ title: 'Call started', description: `Share the patient link to connect. Mode: ${mode}`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Failed to start call', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
    }
  }, [videoCallState, video, onStartVideoCall, videoCallToken, visitId]);

  const handleLeaveCall = useCallback(() => {
    try { video?.leave?.(); } catch { /* ignore */ }
    onStartVideoCall(null as any);
    setCallMode('IN_PERSON');
  }, [video, onStartVideoCall]);

  // ─── Backend repertorization hooks ───
  const extractRubrics = useExtractRubrics();
  const repertorizeScore = useRepertorizeScore();
  const analyzeCase = useAnalyzeCase();
  const suggestSoap = useSuggestSoap();
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
        thirstPattern: state.thirstPattern,
        sleepPosition: state.sleepPosition,
        perspiration: state.perspiration,
        doctorNotes: state.doctorNotes,
        consultationMode: 'followup',
      });

      // The follow-up handler in use-consultation-state will auto-populate
      // SOAP, advice, prescription based on the REPEAT/CHANGE/ADVICE_ONLY decision.
      state.handleHomeopathyConsultGenerated(result);
      state.setCaseSummary(result.caseSummary || (result as any)?.prescriptionDraft?.consultationSummary || '');

      // Navigate to the summary stage (follow-up assessment view)
      state.setConsultStage('SUMMARY');
    } catch (error) {
      console.error('Follow-up assessment failed:', error);
      toast({ title: 'Follow-up assessment failed', description: 'Please try again.', variant: 'error' });
    }
  }, [state, visit, patient, visitId, homeopathyConsult]);

  const handleAnalyzeConversation = useCallback(async () => {
    // For follow-up mode, use the dedicated follow-up pipeline
    if (state.consultationMode === 'followup') {
      return handleFollowUpAssessment();
    }

    if (!(state.ongoingTranscript || '').trim()) {
      toast({ title: 'No conversation detected', description: 'Please record patient symptoms first. For direct disease search, use Quick Rx.', variant: 'error' });
      return;
    }

    try {
      // Step 1: Extract Case (Symptoms, Constitution, etc)
      const extraction: any = await analyzeCase.mutateAsync({
        transcript: state.ongoingTranscript,
        visitId,
        patientAge: state.patientAge,
        patientGender: patient?.gender,
        chiefComplaint: visit.chiefComplaint,
        specialty: 'HOMEOPATHY'
      } as any); // cast to any because chiefComplaint and specialty are not in AnalyzeCaseInput but used by endpoint perhaps

      // Step 2: Suggest SOAP
      const soap = await suggestSoap.mutateAsync({
        transcript: state.ongoingTranscript,
        chiefComplaint: visit.chiefComplaint,
        patientAge: state.patientAge,
        patientGender: patient?.gender,
      });

      // Update UI State for Review
      if (extraction) {
        state.setCategorizedSymptoms({
          mental: extraction.mentalState || [],
          physical: extraction.generalSymptoms || [],
          particular: extraction.physicalSymptoms || [],
        });
        if (extraction.thermalReaction) state.setThermalReaction(String(extraction.thermalReaction).toLowerCase());
        if (extraction.miasm) state.setMiasm(String(extraction.miasm).toLowerCase());
        if (extraction.thirstPattern) state.setThirstPattern(String(extraction.thirstPattern).toLowerCase());
        if (extraction.causation) state.setCausation(Array.isArray(extraction.causation) ? extraction.causation.join(', ') : String(extraction.causation));
      }

      if (soap) {
        state.setSoapData({
          subjective: soap.subjective || '',
          objective: soap.objective || '',
          assessment: soap.assessment || '',
          plan: soap.plan || '',
          advice: soap.advice || '',
          clinicalSummary: '',
        });
        state.setCaseSummary(soap.subjective || '');
      }

      // Navigate to the summary page for doctor review
      state.setConsultStage('SUMMARY');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({ title: 'Analysis failed', description: 'Please try again.', variant: 'error' });
    }
  }, [state, visit, patient, visitId, analyzeCase, suggestSoap, handleFollowUpAssessment]);

  const handleExtractSummaryRubrics = useCallback(async (nextStage: 'LAB_REPORTS' | 'PRESCRIPTION' = 'PRESCRIPTION') => {
    try {
      const symptoms = state.categorizedSymptoms;
      // Extract Rubrics from reviewed symptoms
      const rubricsData = await extractRubrics.mutateAsync({
        chiefComplaint: visit.chiefComplaint,
        subjective: state.soapData.subjective,
        assessment: state.soapData.assessment,
        mentalSymptoms: symptoms.mental,
        generalSymptoms: symptoms.physical,
        particularSymptoms: symptoms.particular,
        thermalReaction: state.thermalReaction,
        consultationMode: state.consultationMode,
      });

      if (rubricsData?.suggestedRubrics?.length) {
        state.setSuggestedRubrics(prev => {
          // Merge avoiding duplicates by ID
          const existingIds = new Set((prev || []).map(r => r.rubricId));
          const newRubrics = rubricsData.suggestedRubrics.filter(r => !existingIds.has(r.rubricId));
          return [...(prev || []), ...newRubrics];
        });
      }

      const mergedRubrics = [...(state.suggestedRubrics || []), ...(rubricsData?.suggestedRubrics || [])];

      if (nextStage === 'LAB_REPORTS') {
        state.setConsultStage('LAB_REPORTS');
      } else {
        handleScoreRemedies(mergedRubrics);
      }
    } catch (error) {
      console.error('Rubric extraction failed:', error);
      toast({ title: 'Rubric extraction failed', description: 'Proceeding to next stage anyway.', variant: 'error' });
      if (nextStage === 'LAB_REPORTS') {
        state.setConsultStage('LAB_REPORTS');
      } else {
        handleScoreRemedies(state.suggestedRubrics);
      }
    }
  }, [state, visit, extractRubrics]);

  const handleScoreRemedies = useCallback(async (rubricsToUse?: any[]) => {
    try {
      const activeRubrics = rubricsToUse || state.suggestedRubrics;
      // Score Remedies from all collected rubrics (summary + lab reports)
      if (activeRubrics && activeRubrics.length > 0) {
        const scoreData = await repertorizeScore.mutateAsync({
          selectedRubrics: activeRubrics.map(r => ({
            rubricId: r.rubricId,
            description: r.description,
            category: r.category,
            importance: r.importance,
          })),
          thermalReaction: state.thermalReaction,
          miasm: state.miasm,
          thirstPattern: state.thirstPattern,
          sleepPosition: state.sleepPosition,
          perspiration: state.perspiration,
          doctorNotes: state.doctorNotes,
        } as any);

        if (scoreData?.scoredRemedies?.length) {
          state.setScoredRemedies(scoreData.scoredRemedies);
          state.setSoapData(prev => ({
            ...prev,
            plan: 'Prescription based on totality of symptoms, lab reports, and repertorization.',
          }));
        }
      }

      // Auto-fill advice and follow-up if empty
      if (!state.advice) {
        state.setAdvice(state.soapData?.advice || 'Drink plenty of plain water\n\nKeep 30 minutes gap before and after medicine\n\nDo not self-medicate or change potency yourself');
      }
      if (!state.followUp) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        state.setFollowUp(nextWeek.toISOString().split('T')[0] || ''); // YYYY-MM-DD
      }

      state.setConsultStage('PRESCRIPTION');
    } catch (error) {
      console.error('Prescribing failed:', error);
      toast({ title: 'Remedy generation failed', description: 'Please try again.', variant: 'error' });
    }
  }, [state, repertorizeScore]);


  // ─── Render current stage content ───
  const renderStageContent = () => {
    switch (state.consultStage) {
      case 'CONVERSATION':
        return (
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
          />
        );

      case 'SUMMARY':
        return (
          <CaseSummaryStage
            caseSummary={state.caseSummary || state.soapData.subjective || state.soapData.clinicalSummary}
            onCaseSummaryChange={state.setCaseSummary}
            categorizedSymptoms={state.categorizedSymptoms}
            thermalReaction={state.thermalReaction}
            miasm={state.miasm}
            thirstPattern={state.thirstPattern}
            causation={state.causation}
            isGenerating={extractRubrics.isPending}
            onRegenerate={() => { }}
          />
        );

      case 'LAB_REPORTS':
        return (
          <LabReportsStage
            visitId={visitId}
            onAnalysisComplete={(rubrics) => {
              state.setSuggestedRubrics(prev => {
                const existingIds = new Set((prev || []).map(r => r.rubricId));
                const newRubrics = rubrics.filter(r => !existingIds.has(r.rubricId));
                return [...(prev || []), ...newRubrics];
              });
            }}
            onNextStage={() => handleScoreRemedies()}
          />
        );

      case 'PRESCRIPTION':
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

              {/* Rx Items (only if CHANGE) */}
              {state.rxItems.length > 0 && (
                <div className="bg-white border border-[#E3E2DF] rounded-lg p-4">
                  <h3 className="text-xs font-bold text-[#888786] uppercase tracking-widest mb-3">New Prescription</h3>
                  {state.rxItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-[#F4F3F1] last:border-0">
                      <span className="text-sm font-bold text-[#2563EB]">{item.medicationName}</span>
                      <span className="text-xs text-[#4A4A47]">{item.dosage}</span>
                      {item.instructions && <span className="text-xs text-[#888786]">— {item.instructions}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Standard mode: remedy (from summary or by disease) + editable Rx
        return (
          <PrescriptionStage
            scoredRemedies={state.scoredRemedies}
            suggestedRubrics={state.suggestedRubrics}
            thermalReaction={state.thermalReaction}
            miasm={state.miasm}
            thirstPattern={state.thirstPattern}
            aiAdvice={state.advice}
            aiFollowUp={state.followUp}
            isGeneratingAdvice={homeopathyConsult.isPending}
            onScoredRemediesChange={state.setScoredRemedies}
            onDataChange={(rows, adv, fu, disease) => { repertoryDataRef.current = { rows, advice: adv, followUp: fu, disease }; }}
          />
        );

      case 'FINALIZE_RX':
        return (
          <FinalizeRxStage
            selectedRemedies={repertoryDataRef.current.rows}
            initialAdvice={repertoryDataRef.current.advice}
            initialFollowUp={repertoryDataRef.current.followUp}
            onDataChange={(rows, adv, fu) => {
              repertoryDataRef.current = { ...repertoryDataRef.current, rows, advice: adv, followUp: fu };
            }}
          />
        );

      default:
        return null;
    }
  };

  // ─── Sidebar step config ───
  const STEPS: { key: ConsultStage; label: string; icon: React.ReactNode }[] = [
    { key: 'CONVERSATION', label: 'Conversation', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'SUMMARY', label: 'Summary', icon: <ScrollText className="h-4 w-4" /> },
    { key: 'LAB_REPORTS', label: 'Lab Reports', icon: <FileText className="h-4 w-4" /> },
    { key: 'PRESCRIPTION', label: 'Remedy', icon: <FlaskConical className="h-4 w-4" /> },
    { key: 'FINALIZE_RX', label: 'Finalize', icon: <Check className="h-4 w-4" /> },
  ];

  const currentStepIdx = STEPS.findIndex(s => s.key === state.consultStage);

  // ── Robust patient data extraction ──
  // The @mmc/types Patient uses `surname` (not `lastName`), has a direct `age`
  // field, and gender is 'M'/'F'/'Other'. Handle all variants gracefully.
  const rawFirst = ((patient as any)?.firstName || '').trim();
  const rawLast = ((patient as any)?.lastName || (patient as any)?.surname || '').trim();
  const patientName = [rawFirst, rawLast].filter(Boolean).join(' ') || 'New Patient';
  const patientAge: number | undefined =
    (patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined)
    ?? (patient as any)?.age
    ?? state.patientAge
    ?? undefined;
  const patientInitials = patientName
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '--';
  const genderMap: Record<string, string> = { M: 'Male', F: 'Female', MALE: 'Male', FEMALE: 'Female', Other: '—', OTHER: '—' };
  const patientGender = genderMap[(patient?.gender || '')] || (patient?.gender || '—');
  const modeLabel = { acute: 'Acute', chronic: 'Chronic', followup: 'Follow-up' }[state.consultationMode] || 'Acute';
  const modeColor = { acute: 'bg-amber-100 text-amber-700', chronic: 'bg-blue-100 text-blue-700', followup: 'bg-emerald-100 text-emerald-700' }[state.consultationMode];
  const typeLabel = { IN_PERSON: 'In-Person', AUDIO: 'Audio Call', VIDEO: 'Video Call' }[callMode];
  const typeIcon = { IN_PERSON: '🏥', AUDIO: '📞', VIDEO: '📹' }[callMode];

  // ── Bottom-bar helpers ──
  const isBusy = state.isCompleting || homeopathyConsult.isPending || analyzeCase.isPending || suggestSoap.isPending || extractRubrics.isPending || repertorizeScore.isPending || isTransitioning;

  const completeLabel =
    state.consultStage === 'CONVERSATION'
      ? (state.consultationMode === 'followup' ? 'Run Follow-Up Assessment →' : 'End & Analyse →')
      : state.consultStage === 'SUMMARY'
        ? (state.consultationMode === 'followup' ? 'Complete' : 'Analyse Case Summary →')
        : state.consultStage === 'LAB_REPORTS'
          ? 'Proceed to Remedy →'
          : state.consultStage === 'PRESCRIPTION'
            ? 'Review Prescription →'
            : 'Approve & Complete';

  const doComplete = () => {
    if (state.consultStage === 'CONVERSATION') {
      handleAnalyzeConversation();
    } else if (state.consultStage === 'SUMMARY') {
      if (state.consultationMode === 'followup') state.handleComplete();
      else handleExtractSummaryRubrics(); // This extracts rubrics and moves to LAB_REPORTS
    } else if (state.consultStage === 'LAB_REPORTS') {
      handleScoreRemedies(state.suggestedRubrics); // This scores collected rubrics and moves to PRESCRIPTION
    } else if (state.consultStage === 'PRESCRIPTION') {
      setIsTransitioning(true);
      setTimeout(() => {
        state.setConsultStage('FINALIZE_RX');
        setIsTransitioning(false);
      }, 300);
    } else if (state.consultStage === 'FINALIZE_RX') {
      const { rows, advice, followUp } = repertoryDataRef.current;
      if (rows.length > 0) {
        const rxItems = rows.map((r) => ({
          medicationName: r.remedyName, genericName: '', dosage: r.potency,
          frequency: r.frequency, duration: r.duration, route: 'Globules', instructions: r.instruction,
        }));
        state.handleCompleteWithData(rxItems, advice, followUp);
      } else {
        state.handleComplete();
      }
    }
  };

  const doBack = () => {
    if (state.consultStage === 'SUMMARY') state.setConsultStage('CONVERSATION');
    else if (state.consultStage === 'LAB_REPORTS') state.setConsultStage('SUMMARY');
    else if (state.consultStage === 'PRESCRIPTION') state.setConsultStage('LAB_REPORTS');
    else if (state.consultStage === 'FINALIZE_RX') state.setConsultStage('PRESCRIPTION');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-[#FAFAF8]">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-full lg:w-[268px] lg:h-full bg-white border-b lg:border-b-0 lg:border-r border-[#E3E2DF] flex flex-col shrink-0 z-10">
        {/* Brand */}
        <div className="px-5 py-3.5 border-b border-[#E3E2DF] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-[13px]">H</div>
            <div className="font-extrabold text-[15px] tracking-tight text-[#0F0F0E]">Homeo<span className="text-[#2563EB]">X</span></div>
          </div>
          <button onClick={handleNextPatient} className="lg:hidden text-[12px] font-bold text-[#4A4A47] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm">
            <ChevronLeft className="h-3.5 w-3.5" /> Queue
          </button>
        </div>

        {/* Middle scrollable area */}
        <div className="flex-1 min-h-0 lg:overflow-y-auto flex flex-col">
          {/* Patient Card */}
          <div className="px-5 py-4 border-b border-[#E3E2DF] bg-[#FAFAF8] shrink-0 flex items-center lg:block gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold lg:mb-2.5 border border-[#BFDBFE] shrink-0">
              {patientInitials || '--'}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-[#0F0F0E] leading-tight truncate">{patientName}</div>
              <div className="text-[12px] text-[#4A4A47] mt-0.5 truncate">
                {patientAge ? `Age ${patientAge}` : 'Age —'} <span className="text-[#888786] px-1">·</span> {patientGender}
              </div>
            </div>
          </div>

          {/* Modality / call type */}
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-[#E3E2DF] shrink-0">
            <div className="text-[10px] font-bold text-[#888786] uppercase tracking-widest mb-2">Consultation</div>
            <div className="grid grid-cols-3 gap-1.5">
              {([['IN_PERSON', 'In-person'], ['AUDIO', 'Audio'], ['VIDEO', 'Video']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => handleSelectModality(m as CallMode)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-bold transition-colors',
                    callMode === m ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#4A4A47] border-[#E3E2DF] hover:border-[#BFDBFE] hover:text-[#2563EB]',
                  )}
                >
                  {m === 'IN_PERSON' ? <Monitor className="h-4 w-4" /> : m === 'AUDIO' ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow nav */}
          <nav className="px-3 py-3 flex flex-row lg:flex-col gap-1 border-b border-[#E3E2DF] shrink-0 overflow-x-auto">
            <div className="hidden lg:block text-[10px] font-bold text-[#888786] uppercase tracking-widest px-2 mb-1">Workflow</div>
            {STEPS.map((step, i) => {
              const isActive = step.key === state.consultStage;
              const isDone = i < currentStepIdx;
              return (
                <button
                  key={step.key}
                  onClick={() => state.setConsultStage(step.key)}
                  className={cn(
                    'flex-none lg:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 whitespace-nowrap text-left',
                    isActive && 'bg-[#EFF6FF] text-[#2563EB]',
                    isDone && 'text-[#16A34A]',
                    !isActive && !isDone && 'text-[#4A4A47] hover:bg-[#F4F3F1]',
                  )}
                >
                  <div className={cn(
                    'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200',
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

          {/* Chief complaint — flows naturally under workflow */}
          {visit.chiefComplaint && (
            <div className="hidden lg:block px-4 py-4 shrink-0">
              <div className="text-[10px] font-bold text-[#888786] uppercase tracking-widest mb-1.5 px-1">Chief complaint</div>
              <div className="text-[12px] text-[#4A4A47] leading-snug bg-[#FAFAF8] p-2.5 rounded-lg border border-[#E3E2DF]">
                {visit.chiefComplaint.slice(0, 80)}{visit.chiefComplaint.length > 80 ? '…' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Back to Queue — always pinned at sidebar bottom */}
        <div className="hidden lg:block px-5 py-4 border-t border-[#E3E2DF] shrink-0 mt-auto bg-white">
          <button
            onClick={handleNextPatient}
            className="w-full text-[12px] font-bold text-[#4A4A47] border border-[#E3E2DF] bg-white rounded-md py-2 hover:bg-[#F4F3F1] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Queue
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
          <div className={cn('w-full max-w-full px-4 lg:px-8 py-5 pb-8', state.consultStage === 'CONVERSATION' && 'min-h-full flex flex-col')}>
            {renderStageContent()}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 border-t border-[#E3E2DF] bg-white px-4 lg:px-8 py-3">
          <div className="w-full max-w-full flex flex-wrap-reverse sm:flex-nowrap items-center justify-between gap-3">
            {state.consultStage !== 'CONVERSATION' && (
              <button onClick={doBack} className="pp-btn-secondary w-full sm:w-auto justify-center h-10 px-4 text-[13px] inline-flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:ml-auto">
              {state.consultStage === 'SUMMARY' && state.consultationMode !== 'followup' ? (
                <>
                  <button
                    onClick={() => handleExtractSummaryRubrics('LAB_REPORTS')}
                    disabled={isBusy}
                    className="pp-btn-secondary w-full sm:w-auto justify-center h-10 px-6 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : 'Upload Lab Reports'}
                  </button>
                  <button
                    onClick={() => handleExtractSummaryRubrics('PRESCRIPTION')}
                    disabled={isBusy}
                    className="pp-btn-primary w-full sm:w-auto justify-center h-10 px-6 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : 'Skip to Remedy →'}
                  </button>
                </>
              ) : (
                <button
                  onClick={doComplete}
                  disabled={isBusy}
                  className="pp-btn-primary w-full sm:w-auto justify-center h-10 px-6 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : completeLabel}
                </button>
              )}
            </div>
          </div>
        </div>

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
