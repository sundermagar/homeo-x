import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Monitor, Phone, Video, Search, Loader2, Check, X, MessageSquare
} from 'lucide-react';

import type { VideoCallState, CallMode } from '../components/consultation-header';
import { ConsultationStage } from '../components/stages/consultation-stage';
import { ContextSidebar } from '../components/v2/context-sidebar';
import { CallRail } from '../components/v2/call-rail';
import { SearchableSelect } from '../../medical-case/components/searchable-select';
import { useRemedyLookups } from '../../medical-case/hooks/use-remedy-chart';
import { useDayCharges } from '../../billing/hooks/use-accounts';
import { VitalsModal } from '../components/v2/vitals-modal';
import { CompareVisitsModal } from '../components/v2/compare-visits-modal';
import { PrescribeWizardModal } from '../components/v2/prescribe-wizard-modal';
import { useScribingSession, useHomeopathyConsult } from '../../../hooks/use-scribing';
import { useVideoCallToken } from '../../../hooks/use-video-call';
import { useExtractRubrics, useRepertorizeScore, useAnalyzeCase, useSuggestSoap, useExtractDiseaseRubrics } from '../../../hooks/use-repertorization';
import { usePatientHistory, type PatientHistoryVisit } from '../../../hooks/use-patients';
import { toast } from '../../../hooks/use-toast';
import { ROUTES } from '../../../lib/constants';
import { calculateAge } from '../../../lib/format';
import { cn } from '../../../lib/cn';
import { LabReportDrawer, LabUploadDrawer } from '../components/v2/lab-report-drawer';
import type { UseConsultationStateReturn } from '../hooks/use-consultation-state';
import type { ScoredRemedy } from '../../../types/ai';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';
import type { UiHints } from '../../../types/consultation';
import type { Visit, Vitals } from '../../../types/visit';
import type { Patient } from '../../../types/patient';
import { useFrequencies } from '@/features/settings/hooks/use-settings';

interface LayoutProps {
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

const POTENCIES = ['200C', '30C', '6C', '1M', '10M', 'Q (Mother Tincture)', '6X', '12X'];
const DOSAGES = ['OD × 5 days', 'BD × 7 days', 'TDS × 5 days', 'Single dose', 'HS × 10 days'];
const REPETITIONS = ['Single dose', 'Daily', 'Every 3 days', 'SOS', 'Weekly'];

// ── Multi-step "Building case" loader ──
function SavingOverlay({ open, title, sub, steps, activeStep }: { open: boolean; title: string; sub: string; steps: string[]; activeStep: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-gray-900/55 backdrop-blur-[3px]">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-7 text-center min-w-[300px]">
        <div className="w-9 h-9 border-[3px] border-[#DBEAFE] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
        <div className="text-[15px] font-semibold text-[#0F0F0E]">{title}</div>
        {sub && <div className="text-[12px] text-[#888786] mt-1">{sub}</div>}
        {steps.length > 0 && (
          <div className="mt-4 text-left flex flex-col gap-2">
            {steps.map((s, i) => (
              <div key={s} className={cn('flex items-center gap-2.5 text-[12.5px] font-medium transition-opacity', i <= activeStep ? 'opacity-100 text-[#0F0F0E]' : 'opacity-50 text-[#888786]')}>
                <span className={cn('w-4 h-4 rounded-full border-2 shrink-0', i <= activeStep ? 'bg-[#16A34A] border-[#16A34A]' : 'border-[#E3E2DF]')} />
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function scoreToDots(score: number): number {
  return Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
}

export function HomeopathyConsultationLayoutV2({
  visitId, visit, patient, state, refetch, videoCallState, onStartVideoCall, video,
}: LayoutProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // ── Local UI state ──
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [path, setPath] = useState<'summary' | 'disease'>('summary');
  const [callMode, setCallMode] = useState<CallMode>('IN_PERSON');
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [started, setStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  // Collapsed by default on phones/tablets (the left sidebar becomes a slide-over there).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [railOpen, setRailOpen] = useState(false); // mobile-only: slide-over conversation rail
  const [analysisReady, setAnalysisReady] = useState(false);
  const [stopRecordingSignal, setStopRecordingSignal] = useState(0);

  // Modals
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);
  const [compareVisit, setCompareVisit] = useState<PatientHistoryVisit | null>(null);

  // Saving overlay
  const [saving, setSaving] = useState<{ open: boolean; title: string; sub: string; steps: string[]; activeStep: number }>({
    open: false, title: '', sub: '', steps: [], activeStep: -1,
  });

  // Disease path local state
  const [diseaseQuery, setDiseaseQuery] = useState(visit.chiefComplaint || '');
  const [diseaseScored, setDiseaseScored] = useState<ScoredRemedy[] | null>(null);
  const [diseaseRubrics, setDiseaseRubrics] = useState<any[]>([]);
  // Text queued for injection into the live transcript panel (e.g. an attached lab summary).
  const [pendingTranscriptInjection, setPendingTranscriptInjection] = useState<string | null>(null);

  // ── Per-phase prescription draft isolation ──
  // Summary, Disease and Manual each keep their own remedy draft so a remedy picked in one
  // phase never bleeds into the others. The active phase's draft lives in state.rxItems; the
  // inactive drafts are parked here and swapped in/out whenever the active phase changes.
  const draftsRef = useRef<Record<'summary' | 'disease' | 'manual', CreatePrescriptionItemInput[]>>({ summary: [], disease: [], manual: [] });
  const prevSourceRef = useRef<'summary' | 'disease' | 'manual'>('summary');
  // Lab summaries attached in the Summary path — merged into the transcript at Analyse time so
  // they reliably feed the AI even if the live transcript hasn't flushed yet.
  const labNotesRef = useRef('');

  // ── Reset on patient change ──
  useEffect(() => {
    setCallMode('IN_PERSON');
    setStarted(false);
    setMode('ai');
    setPath('summary');
    setAnalysisReady(false);
    setDiseaseScored(null);
    setDiseaseRubrics([]);
    setPendingTranscriptInjection(null);
    labNotesRef.current = '';
    draftsRef.current = { summary: [], disease: [], manual: [] };
    prevSourceRef.current = 'summary';
  }, [visitId]);

  const historyId = String((patient as any)?.regid ?? visit.patientId ?? '');
  const { data: history, isLoading: historyLoading } = usePatientHistory(historyId || undefined);

  // ── Lab Modals ──
  const [selectedLabReport, setSelectedLabReport] = useState<any | null>(null);
  const [showUploadLab, setShowUploadLab] = useState(false);

  // ── Scribing session ──
  const { data: scribingSession } = useScribingSession(visitId);
  useEffect(() => { if (scribingSession) state.setSessionId(scribingSession.id); }, [scribingSession, state]);

  // ── Hooks ──
  const videoCallToken = useVideoCallToken();
  const extractRubrics = useExtractRubrics();
  const repertorizeScore = useRepertorizeScore();
  const analyzeCase = useAnalyzeCase();
  const suggestSoap = useSuggestSoap();
  const extractDisease = useExtractDiseaseRubrics();
  const homeopathyConsult = useHomeopathyConsult();

  // ── Next patient / back to queue ──
  const handleNextPatient = useCallback(() => {
    ['dashboard', 'queue', 'waitlist', 'appointments', 'visits'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ['visit', visitId] });
    qc.invalidateQueries({ queryKey: ['appointment-visit', visitId] });
    navigate(ROUTES.DOCTOR_QUEUE);
  }, [qc, visitId, navigate]);

  // ── Modality selection ──
  const startCall = useCallback(async (m: CallMode) => {
    const result = await videoCallToken.mutateAsync({ visitId, role: 'host' });
    const rawLink = result.patientJoinLink;
    const dynamicLink = rawLink?.includes('?') ? `${rawLink}&mode=${m.toLowerCase()}` : `${rawLink}?mode=${m.toLowerCase()}`;
    const patientJoinLink = dynamicLink?.startsWith('http')
      ? dynamicLink
      : `${window.location.origin.includes('localhost')
        ? `https://${import.meta.env['VITE_FRONTEND_URL'] || 'frying-deviancy-rocklike.ngrok-free.dev'}`
        : window.location.origin}${dynamicLink || `/meet/${visitId}?mode=${m.toLowerCase()}`}`;
    onStartVideoCall({ appId: result.appId, channel: result.channel, token: result.token, uid: result.uid, visitId, patientJoinLink });
    setIsVideoPaused(false);
  }, [videoCallToken, visitId, onStartVideoCall]);

  const handleSelectModality = useCallback(async (m: CallMode) => {
    setCallMode(m);
    if (m === 'IN_PERSON' && videoCallState) {
      try { video?.leave?.(); } catch { /* ignore */ }
      onStartVideoCall(null as any);
    }
  }, [videoCallState, video, onStartVideoCall]);

  // ── Start consultation (requests mic in the user gesture) ──
  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast({ title: 'Microphone access denied', description: 'Please allow microphone access to start.', variant: 'error' });
      setIsStarting(false);
      return;
    }
    if (callMode === 'AUDIO' || callMode === 'VIDEO') {
      try { await startCall(callMode); toast({ title: 'Call started', description: `Share the patient link. Mode: ${callMode}`, variant: 'success' }); }
      catch (err) { toast({ title: 'Failed to start call', description: err instanceof Error ? err.message : '', variant: 'error' }); }
    }
    setStarted(true);
    setIsVideoPaused(false);
    setIsStarting(false);
  }, [callMode, startCall]);

  // ── Step overlay helper ──
  const runSteps = async (title: string, sub: string, steps: string[], tasks: Array<() => Promise<void>>) => {
    setSaving({ open: true, title, sub, steps, activeStep: -1 });
    for (let i = 0; i < tasks.length; i++) {
      setSaving((s) => ({ ...s, activeStep: i }));
      const task = tasks[i];
      // eslint-disable-next-line no-await-in-loop
      if (task) await task();
    }
    setSaving((s) => ({ ...s, activeStep: steps.length }));
    setTimeout(() => setSaving((s) => ({ ...s, open: false })), 300);
  };

  // ── Full analysis pipeline (summary path) ──
  const runFullAnalysis = useCallback(async () => {
    setStopRecordingSignal((prev) => prev + 1);
    
    // Follow-up mode → dedicated assessment
    if (state.consultationMode === 'followup') {
      try {
        const symptoms = state.categorizedSymptoms;
        const symptomTranscript = [
          ...symptoms.mental.map((s) => `Doctor: Patient reports ${s}`),
          ...symptoms.physical.map((s) => `Doctor: Patient has ${s}`),
          ...symptoms.particular.map((s) => `Doctor: Patient complains of ${s}`),
        ].join('\n');
        await runSteps('Follow-up assessment', 'Evaluating response', ['Assessment', 'Plan'], [
          async () => {
            const result: any = await homeopathyConsult.mutateAsync({
              transcript: state.ongoingTranscript || symptomTranscript, visitId,
              patientAge: state.patientAge, patientGender: patient?.gender,
              thermalReaction: state.thermalReaction, miasm: state.miasm, thirstPattern: state.thirstPattern,
              sleepPosition: state.sleepPosition, perspiration: state.perspiration, doctorNotes: state.doctorNotes,
              consultationMode: 'followup',
            });
            state.handleHomeopathyConsultGenerated(result);
            state.setCaseSummary(result.caseSummary || (result as any)?.prescriptionDraft?.consultationSummary || '');
          },
          async () => { /* settle */ },
        ]);
        setAnalysisReady(true);
      } catch {
        toast({ title: 'Follow-up assessment failed', description: 'Please try again.', variant: 'error' });
      }
      return;
    }

    // Combine the live transcript with any attached lab summaries so Analyse always sees them.
    const analysisTranscript = [state.ongoingTranscript, labNotesRef.current]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('\n');

    if (!analysisTranscript.trim()) {
      toast({ title: 'No conversation detected', description: 'Record the consultation first, or use the Disease path.', variant: 'error' });
      return;
    }

    try {
      // Local accumulators avoid stale-closure reads of `state.*` between async steps.
      let lSymptoms = state.categorizedSymptoms;
      let lSubjective = state.soapData.subjective;
      let lAssessment = state.soapData.assessment;
      let lThermal = state.thermalReaction;
      let lRubrics = [...(state.suggestedRubrics || [])];
      let lScored: ScoredRemedy[] = [];

      await runSteps('Building case', 'Summary · symptoms · remedy', ['Case analysis', 'Summary', 'Rubrics', 'Remedy suggestions', 'Prescription draft'], [
        // 1. Case extraction
        async () => {
          // Summary path: base the case purely on the conversation — no chief complaint bias.
          const extraction: any = await analyzeCase.mutateAsync({
            transcript: analysisTranscript, visitId, patientAge: state.patientAge,
            patientGender: patient?.gender, chiefComplaint: '', specialty: 'HOMEOPATHY',
          } as any);
          if (extraction) {
            lSymptoms = { mental: extraction.mentalState || [], physical: extraction.generalSymptoms || [], particular: extraction.physicalSymptoms || [] };
            state.setCategorizedSymptoms(lSymptoms);
            if (extraction.thermalReaction) { lThermal = String(extraction.thermalReaction).toLowerCase(); state.setThermalReaction(lThermal); }
            if (extraction.miasm) state.setMiasm(String(extraction.miasm).toLowerCase());
            if (extraction.thirstPattern) state.setThirstPattern(String(extraction.thirstPattern).toLowerCase());
            if (extraction.causation) state.setCausation(Array.isArray(extraction.causation) ? extraction.causation.join(', ') : String(extraction.causation));
          }
        },
        // 2. SOAP / summary
        async () => {
          const soap = await suggestSoap.mutateAsync({
            transcript: analysisTranscript, chiefComplaint: '',
            patientAge: state.patientAge, patientGender: patient?.gender,
          });
          if (soap) {
            lSubjective = soap.subjective || '';
            lAssessment = soap.assessment || '';
            state.setSoapData({
              subjective: soap.subjective || '', objective: soap.objective || '', assessment: soap.assessment || '',
              plan: soap.plan || '', advice: soap.advice || '', clinicalSummary: '',
            });
            // Lab-heavy cases land in Objective (labs are objective findings), so fall back to it.
            state.setCaseSummary([soap.subjective, soap.objective].filter(Boolean).join('\n\n') || '');
            if (soap.advice) state.setAdvice(soap.advice);
          }
        },
        // 3. Rubrics
        async () => {
          const rubricsData = await extractRubrics.mutateAsync({
            chiefComplaint: '', subjective: lSubjective, assessment: lAssessment,
            mentalSymptoms: lSymptoms.mental, generalSymptoms: lSymptoms.physical, particularSymptoms: lSymptoms.particular,
            thermalReaction: lThermal, consultationMode: state.consultationMode,
          });
          if (rubricsData?.suggestedRubrics?.length) {
            const ids = new Set(lRubrics.map((r) => r.rubricId));
            lRubrics = [...lRubrics, ...rubricsData.suggestedRubrics.filter((r) => !ids.has(r.rubricId))];
            state.setSuggestedRubrics(lRubrics);
          }
        },
        // 4. Score remedies
        async () => {
          if (lRubrics.length) {
            const scoreData = await repertorizeScore.mutateAsync({
              selectedRubrics: lRubrics.map((r) => ({ rubricId: r.rubricId, description: r.description, category: r.category, importance: r.importance })),
              thermalReaction: lThermal, miasm: state.miasm, thirstPattern: state.thirstPattern,
              sleepPosition: state.sleepPosition, perspiration: state.perspiration, doctorNotes: state.doctorNotes,
            } as any);
            if (scoreData?.scoredRemedies?.length) { lScored = scoreData.scoredRemedies; state.setScoredRemedies(lScored); }
          }
        },
        // 5. Seed Rx draft + advice/follow-up
        async () => {
          // pickRemedy auto-sets the next review date from the remedy's days.
          if (lScored[0]) pickRemedy(lScored[0]);
          if (!state.advice) state.setAdvice('Drink plenty of plain water\nKeep 30 minutes gap before and after medicine\nDo not self-medicate or change potency yourself');
          // Only fall back to a 7-day review if no remedy was picked (and none set yet).
          if (!lScored[0] && !state.followUp) {
            const d = new Date(); d.setDate(d.getDate() + 7);
            state.setFollowUp(d.toISOString().split('T')[0] || '');
          }
        },
      ]);
      setAnalysisReady(true);
      toast({ title: 'Case generated — review on the left', variant: 'success' });
    } catch {
      toast({ title: 'Analysis failed', description: 'Please try again.', variant: 'error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, visit, patient, visitId, analyzeCase, suggestSoap, extractRubrics, repertorizeScore, homeopathyConsult]);

  // ── Disease path ──
  const runDisease = useCallback(async () => {
    const disease = diseaseQuery.trim();
    if (!disease) return;
    try {
      let rubrics: any[] = [];
      await runSteps('Repertorising ' + disease, 'Rubrics → remedies', ['Find rubrics', 'Score remedies'], [
        async () => {
          const res = await extractDisease.mutateAsync({ disease, consultationMode: state.consultationMode });
          rubrics = res.suggestedRubrics || [];
          setDiseaseRubrics(rubrics);
        },
        async () => {
          if (!rubrics.length) { setDiseaseScored([]); return; }
          const scoreData = await repertorizeScore.mutateAsync({
            selectedRubrics: rubrics.map((r: any) => ({ rubricId: r.rubricId, description: r.description, category: r.category, importance: r.importance })),
          } as any);
          setDiseaseScored(scoreData.scoredRemedies || []);
          if (scoreData.scoredRemedies?.[0]) pickRemedy(scoreData.scoredRemedies[0]);
        },
      ]);
      toast({ title: `Rubrics and remedies for ${disease}`, variant: 'success' });
    } catch {
      toast({ title: 'Disease lookup failed', variant: 'error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diseaseQuery, extractDisease, repertorizeScore, state.consultationMode]);

  // ── Pick / toggle a remedy → add or remove from Rx list ──
  const pickRemedy = useCallback((remedy: ScoredRemedy) => {
    const potency = remedy.commonPotencies?.[0] || '200C';
    const prev = state.rxItems;
    const exists = prev.some((r) => r.medicationName === remedy.remedyName);
    const next = exists
      ? prev.filter((r) => r.medicationName !== remedy.remedyName)
      : [...prev, { medicationName: remedy.remedyName, genericName: '', dosage: potency, frequency: 'TDS', duration: '5', instructions: '' }];
    state.setRxItems(next);
    // Auto-update the next review date from the longest remedy duration in the list.
    const maxDays = next.reduce((m, r) => Math.max(m, parseInt(String(r.duration), 10) || 0), 0);
    if (maxDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + maxDays);
      state.setFollowUp(d.toISOString().split('T')[0] || '');
    }
  }, [state]);

  // ── Rx draft field updates ──
  const updateRx = (index: number, field: keyof CreatePrescriptionItemInput, value: string) => {
    state.setRxItems((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], [field]: value } as CreatePrescriptionItemInput;
      return next;
    });
  };

  const removeRx = (index: number) => {
    state.setRxItems((prev) => prev.filter((_, i) => i !== index));
  };

  const setFollowUpDays = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    state.setFollowUp(d.toISOString().split('T')[0] || '');
  };

  // ── Prescribe ──
  const handleConfirmPrescribe = useCallback(() => {
    state.handleCompleteWithData(state.rxItems, state.advice, state.followUp);
  }, [state]);

  // ── Derived patient display ──
  const rawFirst = ((patient as any)?.firstName || '').trim();
  const rawLast = ((patient as any)?.lastName || (patient as any)?.surname || '').trim();
  const patientName = [rawFirst, rawLast].filter(Boolean).join(' ') || 'New Patient';
  const patientAge: number | undefined =
    (patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined) ?? (patient as any)?.age ?? state.patientAge ?? undefined;
  const patientInitials = patientName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '--';
  const genderMap: Record<string, string> = { M: 'Male', F: 'Female', MALE: 'Male', FEMALE: 'Female', Other: '—', OTHER: '—' };
  const patientGender = genderMap[(patient?.gender || '')] || (patient?.gender || '—');
  const mrn = `PT-${(patient as any)?.regid ?? visit.patientId ?? '—'}`;

  // Fallback vitals from patient history if visit.vitals is empty
  const hVitals = history?.visits?.find((v: any) => String(v.visitId) === String(visitId))?.vitals;
  const fallbackVitals = hVitals ? {
    heightCm: hVitals.heightCm,
    weightKg: hVitals.weightKg,
    bmi: hVitals.bmi,
    systolicBp: hVitals.systolicBp,
    diastolicBp: hVitals.diastolicBp,
    pulseRate: (hVitals as any).pulse ?? (hVitals as any).pulseRate,
    temperatureF: (hVitals as any).temperature ?? (hVitals as any).temperatureF,
    oxygenSaturation: hVitals.oxygenSaturation,
    respiratoryRate: hVitals.respiratoryRate,
    lmpDate: (hVitals as any).lmpDate,
  } : null;
  const hasVitals = visit.vitals && Object.keys(visit.vitals).length > 0;
  const currentVitals = (hasVitals ? visit.vitals : fallbackVitals) as Vitals | null;

  // ── Remedy list for center ──
  const remedies: ScoredRemedy[] = path === 'disease' ? (diseaseScored || []) : state.scoredRemedies;
  const selectedRemedyNames = state.rxItems.map((r) => r.medicationName);
  const rx = state.rxItems[0];

  const callModeLabel = { IN_PERSON: 'In-person', AUDIO: 'Audio', VIDEO: 'Video' }[callMode];
  const analyseLabel = state.consultationMode === 'followup' ? 'Run Follow-Up Assessment' : (analysisReady ? 'Re-analyse' : 'Analyse');
  const isBusy = analyzeCase.isPending || suggestSoap.isPending || extractRubrics.isPending || repertorizeScore.isPending || homeopathyConsult.isPending || saving.open;

  // The current phase: Manual mode, or one of the two AI paths.
  const activeSource: 'summary' | 'disease' | 'manual' = mode === 'manual' ? 'manual' : path;

  // Paste a lab-report summary into whichever phase is active:
  //  • Summary → Remedy: appended to the conversation transcript (Analyse picks it up)
  //  • Disease → Rubrics: shown in the disease lab-summary box
  //  • Manual: appended to the clinical notes
  const injectLabSummary = useCallback((summary: string) => {
    const text = (summary || '').trim();
    if (!text) return;
    if (activeSource === 'manual') {
      state.setSoapData((p) => {
        const next = (p.subjective ? p.subjective + '\n\n' : '') + 'Lab report summary:\n' + text;
        return { ...p, subjective: next, clinicalSummary: next };
      });
      toast({ title: 'Lab summary added to notes', variant: 'success' });
    } else if (activeSource === 'disease') {
      // Drop it into the disease search panel so it can drive the rubric lookup.
      setDiseaseQuery((prev) => (prev ? prev + ' ' + text : text));
      toast({ title: 'Lab summary added to disease search', variant: 'success' });
    } else {
      // Summary path: remember it for Analyse (merged into the transcript reliably)…
      labNotesRef.current = (labNotesRef.current ? labNotesRef.current + '\n' : '') + 'Doctor: Lab report summary — ' + text;
      // …and show it as a Doctor line in the live transcript panel when recording.
      if (started) setPendingTranscriptInjection(`Lab report summary — ${text}`);
      toast({ title: 'Lab summary added to conversation', variant: 'success' });
    }
  }, [activeSource, started, state]);

  // Whenever the active phase changes, park the draft that was on screen and restore this
  // phase's own draft. Runs for ALL phase changes (path toggle, mode toggle), so a remedy
  // chosen in one phase never appears in another.
  useEffect(() => {
    const prev = prevSourceRef.current;
    if (prev === activeSource) return;
    draftsRef.current[prev] = state.rxItems;                  // state.rxItems is still the previous phase's draft here
    state.setRxItems(draftsRef.current[activeSource] || []);  // swap in this phase's own draft
    prevSourceRef.current = activeSource;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource]);

  // Switching to the Disease → Rubrics path is a manual lookup, so end the live consultation
  // (stop transcription + leave any active call). The rail is hidden in this path.
  const stopConsultation = useCallback(() => {
    setStarted(false);
    setIsVideoPaused(true);
    if (videoCallState) {
      try { video?.leave?.(); } catch { /* ignore */ }
      onStartVideoCall(null as any);
    }
  }, [videoCallState, video, onStartVideoCall]);

  const handleSetPath = useCallback((p: 'summary' | 'disease') => {
    setPath(p);
    if (p === 'disease') stopConsultation();
  }, [stopConsultation]);

  const showRail = mode === 'ai' && path === 'summary';

  // Current-visit summary for the Compare modal
  const currentSummary = {
    dateLabel: new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    chiefComplaint: visit.chiefComplaint || '—',
    remedy: rx ? `${rx.medicationName}${rx.dosage ? ' ' + rx.dosage : ''} (draft)` : '—',
    symptoms: [...state.categorizedSymptoms.mental, ...state.categorizedSymptoms.physical, ...state.categorizedSymptoms.particular].slice(0, 6).join(' · ') || '—',
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#FAFAF8]">
      {/* Mobile backdrop for the left sidebar */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}
      {/* LEFT */}
      <ContextSidebar
        collapsed={sidebarCollapsed}
        patientName={patientName}
        patientInitials={patientInitials}
        patientAge={patientAge}
        patientGender={patientGender}
        mrn={mrn}
        chiefComplaint={visit.chiefComplaint}
        currentVitals={currentVitals}
        history={history}
        currentVisitId={visitId}
        isHistoryLoading={historyLoading}
        onUpdateVitals={() => setVitalsOpen(true)}
        onCompare={(v) => setCompareVisit(v)}
        onViewLab={(lab) => setSelectedLabReport(lab)}
        onUploadLab={() => setShowUploadLab(true)}
        onBackToQueue={handleNextPatient}
      />

      {/* CENTER */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mode bar */}
        <div className="shrink-0 min-h-[48px] bg-white border-b border-[#E3E2DF] px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <button onClick={() => setSidebarCollapsed((c) => !c)} title="Toggle patient panel"
            className="w-8 h-8 shrink-0 rounded-md border border-[#E3E2DF] text-[#4A4A47] flex items-center justify-center hover:bg-[#F4F3F1]">
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => setMode('manual')} className={cn('text-[13px] font-medium transition-colors', mode === 'manual' ? 'text-[#2563EB] font-semibold' : 'text-[#888786]')}>Manual</button>
            <button onClick={() => setMode((m) => (m === 'ai' ? 'manual' : 'ai'))}
              className={cn('w-11 h-6 rounded-full relative transition-colors', mode === 'ai' ? 'bg-[#2563EB]' : 'bg-[#E3E2DF]')}>
              <span className={cn('absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all', mode === 'ai' ? 'left-[23px]' : 'left-[3px]')} />
            </button>
            <button onClick={() => setMode('ai')} className={cn('text-[13px] font-medium transition-colors', mode === 'ai' ? 'text-[#2563EB] font-semibold' : 'text-[#888786]')}>AI Assisted</button>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {([['IN_PERSON', 'In-person', Monitor], ['VIDEO', 'Video', Video], ['AUDIO', 'Audio', Phone]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => handleSelectModality(m as CallMode)}
                className={cn('inline-flex items-center gap-1.5 border rounded-full px-2.5 sm:px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                  callMode === m ? 'bg-[#2563EB] text-white border-[#2563EB] font-semibold' : 'bg-white text-[#4A4A47] border-[#E3E2DF] hover:border-[#BFDBFE]')}>
                <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            {/* Mobile: open the conversation/transcript slide-over */}
            {showRail && (
              <button onClick={() => setRailOpen(true)} title="Conversation"
                className="lg:hidden inline-flex items-center gap-1.5 border border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scroll workspace */}
        <div className="flex-1 min-h-0 overflow-auto px-3 sm:px-[18px] py-3.5">
          <div className="max-w-[760px] mx-auto flex flex-col gap-2.5">
            {mode === 'ai' ? (
              <>
                {/* Path toggle */}
                <div className="pp-card p-3.5 flex items-center gap-3.5 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-[13px] font-semibold text-[#0F0F0E]">Reach the remedy</div>
                    <div className="text-[12px] text-[#888786] mt-0.5">
                      {path === 'summary' ? 'Conversation builds the summary and remedy.' : 'Type a disease for rubrics and remedy.'}
                    </div>
                  </div>
                  <div className="inline-flex gap-1 bg-[#F4F3F1] border border-[#E3E2DF] rounded-lg p-0.5">
                    <button onClick={() => handleSetPath('summary')} className={cn('rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors', path === 'summary' ? 'bg-white text-[#2563EB] font-semibold shadow-sm' : 'text-[#4A4A47]')}>Summary → Remedy</button>
                    <button onClick={() => handleSetPath('disease')} className={cn('rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors', path === 'disease' ? 'bg-white text-[#2563EB] font-semibold shadow-sm' : 'text-[#4A4A47]')}>Disease → Rubrics &amp; Remedy</button>
                  </div>
                </div>

                {/* Summary path */}
                {path === 'summary' && !analysisReady && (
                  <div className="pp-card p-7 text-center text-[#888786]">
                    <div className="text-[13px] font-semibold text-[#4A4A47]">Conversation in progress</div>
                    <div className="text-[12px] mt-1 leading-relaxed">Capture the consultation on the right, then press <b className="text-[#2563EB]">Analyse</b>. The summary, symptoms and remedy appear here.</div>
                  </div>
                )}

                {path === 'summary' && analysisReady && (
                  <AnalysisCard
                    caseSummary={state.caseSummary}
                    onCaseSummaryChange={state.setCaseSummary}
                    symptoms={state.categorizedSymptoms}
                    thermal={state.thermalReaction}
                    miasm={state.miasm}
                    thirst={state.thirstPattern}
                    causation={state.causation}
                    remedies={remedies}
                    selectedRemedies={selectedRemedyNames}
                    onPick={pickRemedy}
                  />
                )}

                {/* Disease path */}
                {path === 'disease' && (
                  <div className="pp-card p-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Disease / condition</div>
                    <div className="flex items-center gap-2 border border-[#E3E2DF] rounded-md p-1 pl-3 bg-white">
                      <Search className="h-4 w-4 text-[#888786] shrink-0" />
                      <input value={diseaseQuery} onChange={(e) => setDiseaseQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runDisease(); }}
                        placeholder="Type a disease (Migraine, Eczema, GERD)…"
                        className="flex-1 border-0 outline-none text-[13px] py-2 text-[#0F0F0E] bg-transparent" />
                      <button onClick={runDisease} className="pp-btn-primary h-8 px-3.5 text-[12px]">Find rubrics</button>
                    </div>

                    {diseaseRubrics.length > 0 && (
                      <>
                        <div className="h-px bg-[#E3E2DF] my-3.5" />
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Related rubrics</div>
                        <div className="space-y-0">
                          {diseaseRubrics.slice(0, 8).map((r: any) => (
                            <div key={r.rubricId} className="flex items-center gap-2.5 py-2 border-b border-[#F4F3F1] last:border-0 text-[12.5px] text-[#4A4A47]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                              {r.description}
                              {r.importance && <span className="ml-auto text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] rounded px-1.5 py-0.5">{r.importance}</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {remedies.length > 0 && (
                      <>
                        <div className="h-px bg-[#E3E2DF] my-3.5" />
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Remedy suggestions <span className="normal-case tracking-normal text-[#888786] font-medium">· from rubrics</span></div>
                        <RemedyList remedies={remedies} selectedRemedies={selectedRemedyNames} onPick={pickRemedy} />
                      </>
                    )}
                  </div>
                )}

                {/* Prescription draft */}
                {state.rxItems.length > 0 && (
                  <RxDraftCard
                    rxItems={state.rxItems}
                    advice={state.advice}
                    followUp={state.followUp}
                    onUpdate={updateRx}
                    onRemove={removeRx}
                    onAdvice={state.setAdvice}
                    onFollowUp={state.setFollowUp}
                    onFollowUpDays={setFollowUpDays}
                  />
                )}
              </>
            ) : (
              <ManualEntry state={state} />
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="shrink-0 min-h-[48px] border-t border-[#E3E2DF] bg-white px-3 sm:px-[18px] py-2 flex items-center gap-2.5">
          <span className="flex-1" />
          <button onClick={() => state.handleSaveDraft()} disabled={state.isSaving} className="pp-btn-secondary h-9 px-3 sm:px-4 text-[13px] disabled:opacity-60 flex-1 sm:flex-none justify-center">
            {state.isSaving ? 'Saving…' : 'Save draft'}
          </button>
          <button onClick={() => setPrescribeOpen(true)} disabled={state.rxItems.length === 0} className="h-9 px-3 sm:px-4 text-[13px] rounded-md font-semibold bg-[#2563EB] text-white border border-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
            <Check className="h-4 w-4" /> Prescribe now
          </button>
        </div>
      </main>

      {/* Mobile backdrop for the conversation rail */}
      {showRail && railOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setRailOpen(false)} />
      )}

      {/* RIGHT rail */}
      {showRail && (
        <CallRail
          analyseLabel={analyseLabel}
          isBusy={isBusy}
          onAnalyse={runFullAnalysis}
          started={started}
          isStarting={isStarting}
          onStart={handleStart}
          callModeLabel={callModeLabel}
          callMode={callMode}
          mobileOpen={railOpen}
          onMobileClose={() => setRailOpen(false)}
        >
          {started && (
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
              injectText={pendingTranscriptInjection}
              onInjectConsumed={() => setPendingTranscriptInjection(null)}
              stopRecordingSignal={stopRecordingSignal}
            />
          )}
        </CallRail>
      )}

      {/* Modals */}
      <VitalsModal open={vitalsOpen} visitId={visitId} regid={Number(historyId) || undefined} existingVitals={currentVitals} onClose={() => setVitalsOpen(false)} onSaved={refetch} />
      <CompareVisitsModal open={!!compareVisit} current={currentSummary} past={compareVisit} onClose={() => setCompareVisit(null)} />
      <PrescribeWizardModal
        open={prescribeOpen}
        visitId={visitId}
        rxItems={state.rxItems}
        advice={state.advice}
        followUp={state.followUp}
        soapAssessment={state.soapData.assessment}
        isCompleting={state.isCompleting}
        completed={state.showCompleted}
        visit={visit}
        patient={patient}
        onClose={() => setPrescribeOpen(false)}
        onConfirm={handleConfirmPrescribe}
        onNextPatient={handleNextPatient}
        onViewHistory={() => navigate(`/medical-cases/${(patient as any)?.regid || visit.patientId}`)}
      />

      <LabReportDrawer lab={selectedLabReport} onClose={() => setSelectedLabReport(null)} onUseSummary={injectLabSummary} />
      <LabUploadDrawer
        open={showUploadLab}
        regid={Number(historyId) || undefined}
        visitId={visitId}
        onClose={() => setShowUploadLab(false)}
        onUseSummary={injectLabSummary}
        onSaved={() => qc.invalidateQueries({ queryKey: ['patient'] })}
      />

      <SavingOverlay open={saving.open} title={saving.title} sub={saving.sub} steps={saving.steps} activeStep={saving.activeStep} />
    </div>
  );
}

// ───────────────────────── sub-renderers ─────────────────────────

function AutoSizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // useLayoutEffect prevents jitter when typing
  (typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect)(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight + 2}px`; // +2 for border
    }
  }, [props.value]);
  return <textarea ref={ref} {...props} style={{ ...props.style, overflow: 'hidden' }} />;
}

function RemedyList({ remedies, selectedRemedies, onPick }: { remedies: ScoredRemedy[]; selectedRemedies: string[]; onPick: (r: ScoredRemedy) => void }) {
  return (
    <div className="space-y-1.5">
      {remedies.slice(0, 4).map((r) => {
        const dots = scoreToDots(r.normalizedScore);
        const sel = selectedRemedies.includes(r.remedyName);
        return (
          <button key={r.remedyId} onClick={() => onPick(r)}
            className={cn('w-full text-left flex items-center justify-between gap-3 p-3 border rounded-md transition-all',
              sel ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]/10' : 'border-[#E3E2DF] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]')}>
            <div className="min-w-0 flex-1">
              <div className={cn('text-[13.5px] font-semibold', sel ? 'text-[#2563EB]' : 'text-[#0F0F0E]')}>{r.remedyName}</div>
              <div className="text-[11.5px] text-[#888786] mt-0.5 leading-snug line-clamp-2">
                {(r.keynotes?.slice(0, 3).join(', ')) || (r.matchExplanation?.[0]) || r.coverage?.map((c) => c.rubricDescription).slice(0, 2).join(', ') || `Score ${Math.round(r.normalizedScore)}%`}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i < dots ? 'bg-[#2563EB]' : 'bg-[#E3E2DF]')} />)}
              </div>
              {/* Checkbox */}
              <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                sel ? 'bg-[#2563EB] border-[#2563EB]' : 'border-[#D1D5DB] bg-white')}>
                {sel && <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            </div>
          </button>
        );
      })}
      {selectedRemedies.length > 0 && (
        <div className="text-[11px] text-[#2563EB] font-medium pt-1 pl-0.5">
          {selectedRemedies.length} {selectedRemedies.length === 1 ? 'remedy' : 'remedies'} added to prescription
        </div>
      )}
    </div>
  );
}

function Chip({ text, tone }: { text: string; tone: 'phy' | 'mind' | 'fu' }) {
  const cls = tone === 'phy' ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
    : tone === 'mind' ? 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]'
    : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
  return <span className={cn('inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full border mr-1 mb-1.5', cls)}>{text}</span>;
}

function AnalysisCard({
  caseSummary, onCaseSummaryChange, symptoms, thermal, miasm, thirst, causation, remedies, selectedRemedies, onPick,
}: {
  caseSummary: string; onCaseSummaryChange: (v: string) => void;
  symptoms: { mental: string[]; physical: string[]; particular: string[] };
  thermal?: string; miasm?: string; thirst?: string; causation?: string;
  remedies: ScoredRemedy[]; selectedRemedies: string[]; onPick: (r: ScoredRemedy) => void;
}) {
  return (
    <div className="pp-card overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#E3E2DF] bg-[#F4F3F1]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888786]">AI analysis</span>
        <span className="flex-1" />
        <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">Generated</span>
      </div>
      <div className="p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Case summary</div>
        <AutoSizeTextarea value={caseSummary} onChange={(e) => onCaseSummaryChange(e.target.value)} rows={4}
          className="w-full text-[12.5px] leading-relaxed text-[#4A4A47] bg-[#EFF6FF] border border-[#BFDBFE] border-l-2 border-l-[#2563EB] rounded-r-md p-3 outline-none focus:ring-2 focus:ring-[#2563EB]/15 resize-none" />

        <div className="h-px bg-[#E3E2DF] my-3.5" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Symptoms</div>
        <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
          <SymptomGroup label="Mental" items={symptoms.mental} tone="mind" />
          <SymptomGroup label="Physical / General" items={symptoms.physical} tone="phy" />
          <SymptomGroup label="Particular" items={symptoms.particular} tone="fu" />
        </div>

        {/* Always show constitutional factors (empty cells render a "—"). */}
        <div className="h-px bg-[#E3E2DF] my-3.5" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Constitutional factors</div>
        <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">
          <SymptomGroup label="Thermal" items={thermal ? [thermal] : []} tone="phy" />
          <SymptomGroup label="Miasm" items={miasm ? [miasm] : []} tone="mind" />
          <SymptomGroup label="Thirst" items={thirst ? [thirst] : []} tone="phy" />
          <SymptomGroup label="Causation" items={causation ? [causation] : []} tone="fu" />
        </div>

        {remedies.length > 0 && (
          <>
            <div className="h-px bg-[#E3E2DF] my-3.5" />
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-2">Remedy suggestions <span className="normal-case tracking-normal text-[#888786] font-medium">· from case summary</span></div>
            <RemedyList remedies={remedies} selectedRemedies={selectedRemedies} onPick={onPick} />
          </>
        )}
      </div>
    </div>
  );
}

function SymptomGroup({ label, items, tone }: { label: string; items: string[]; tone: 'phy' | 'mind' | 'fu' }) {
  return (
    <div className="bg-[#F4F3F1] border border-[#E3E2DF] rounded-md p-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-[#888786] mb-2">{label}</div>
      {items.length ? items.map((s, i) => <Chip key={i} text={s} tone={tone} />) : <span className="text-[11px] text-[#888786] italic">—</span>}
    </div>
  );
}

function RxField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-3 max-md:col-span-2' : ''}>
      <label className="block text-[9px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function RxDraftCard({
  rxItems, advice, followUp, onUpdate, onRemove, onAdvice, onFollowUp, onFollowUpDays,
}: {
  rxItems: CreatePrescriptionItemInput[]; advice: string; followUp: string;
  onUpdate: (index: number, field: keyof CreatePrescriptionItemInput, value: string) => void;
  onRemove: (index: number) => void;
  onAdvice: (v: string) => void; onFollowUp: (v: string) => void; onFollowUpDays: (days: number) => void;
}) {
  const { data: dbFrequencies = [] } = useFrequencies();
  const freqOptions = dbFrequencies.length > 0 ? dbFrequencies.map((f: any) => f.title) : ['OD', 'BD', 'TDS', 'QID', 'SOS', 'Stat'];
  // Days come from configured day charges (same source as case history / manual mode), with a sensible fallback.
  const { data: dayCharges = [] } = useDayCharges();
  const dayOptions = (dayCharges as any[]).map((dc) => String(dc.days)).filter(Boolean);
  const daysSelectOptions = dayOptions.length > 0 ? dayOptions : ['1', '2', '3', '4', '5', '7', '10', '14', '15', '21', '30', '45', '60'];

  const handleDaysChange = (idx: number, daysStr: string) => {
    onUpdate(idx, 'duration', daysStr);
    
    // Auto-compute next follow-up based on max days selected across all remedies
    let maxD = parseInt(daysStr, 10) || 0;
    rxItems.forEach((r, i) => {
      if (i !== idx) {
        const d = parseInt(r.duration, 10) || 0;
        if (d > maxD) maxD = d;
      }
    });
    if (maxD > 0) {
      onFollowUpDays(maxD);
    }
  };

  const inputCls = 'w-full px-2.5 py-2 rounded-md border border-[#E3E2DF] bg-white text-[13px] font-medium text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF]';
  return (
    // No overflow-hidden — it would clip the searchable dropdowns (Potency/Frequency/Days) and break their scrolling.
    <div className="pp-card">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#E3E2DF] bg-[#F4F3F1] rounded-t-[7px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888786]">Prescription draft</span>
        <span className="flex-1" />
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">{rxItems.length} {rxItems.length === 1 ? 'remedy' : 'remedies'}</span>
        <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">Draft · review required</span>
      </div>
      <div className="p-3.5 flex flex-col gap-3">
        {rxItems.map((rx, idx) => (
          <div key={`${rx.medicationName}-${idx}`} className="border border-[#BFDBFE] rounded-lg p-3.5 bg-[#EFF6FF]">
            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[#DBEAFE]">
              <input value={rx.medicationName} onChange={(e) => onUpdate(idx, 'medicationName', e.target.value)}
                className="text-[17px] font-semibold tracking-tight bg-transparent outline-none text-[#0F0F0E] min-w-0 flex-1" />
              <span className="text-[13px] font-semibold px-3 py-1 rounded-full bg-[#2563EB] text-white shrink-0">{rx.dosage}</span>
              {rxItems.length > 1 && (
                <button onClick={() => onRemove(idx)}
                  className="w-6 h-6 rounded-full bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
                  title="Remove remedy">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2">
              <RxField label="Potency">
                <SearchableSelect value={rx.dosage} onChange={(v) => onUpdate(idx, 'dosage', v)} options={POTENCIES} placeholder="Select potency" />
              </RxField>
              <RxField label="Frequency">
                <SearchableSelect value={rx.frequency} onChange={(v) => onUpdate(idx, 'frequency', v)} options={freqOptions} placeholder="Select frequency" />
              </RxField>
              <RxField label="Days">
                <SearchableSelect value={(rx.duration || '').replace(/\s*days?$/i, '')} onChange={(v) => handleDaysChange(idx, v)} options={daysSelectOptions} placeholder="Select days" />
              </RxField>
            </div>
          </div>
        ))}

        {/* Shared follow-up + advice */}
        <div className="border border-[#E3E2DF] rounded-lg p-3.5 bg-white">
          <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
            <RxField label="Next visit date">
              <input type="date" value={followUp} onChange={(e) => onFollowUp(e.target.value)} className={inputCls} />
            </RxField>
            <RxField label="Advice / doctor's notes" full>
              <AutoSizeTextarea value={advice} onChange={(e) => onAdvice(e.target.value)} rows={2} className={cn(inputCls, 'font-normal leading-relaxed resize-none')} />
            </RxField>
          </div>
        </div>

        <div className="text-[11.5px] font-medium text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-3 py-2">Draft. Review and edit before prescribing.</div>
      </div>
    </div>
  );
}

function ManualEntry({ state }: { state: UseConsultationStateReturn }) {
  const rx = state.rxItems[0];
  // Same option sources as the case-history remedy chart
  const { data: lookups } = useRemedyLookups();
  const { data: dayCharges = [] } = useDayCharges();
  const medicineOptions = (lookups?.medicines || []).map((m) => m.name);
  const potencyOptions = (lookups?.potencies || []).map((p) => p.name);
  const frequencyOptions = (lookups?.frequencies || []).map((f) => f.name);
  const dayOptions = (dayCharges as any[]).map((dc) => String(dc.days)).filter(Boolean);

  const inputCls = 'w-full px-3 py-2.5 rounded-md border border-[#E3E2DF] text-[13px] text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF]';
  const taCls = 'w-full px-3 py-2.5 rounded-md border border-[#E3E2DF] text-[13px] leading-relaxed text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] resize-y';
  const update = (field: keyof CreatePrescriptionItemInput, value: string) => {
    state.setRxItems((prev) => {
      const next = prev.length ? [...prev] : [{ medicationName: '', genericName: '', dosage: '', frequency: '', duration: '', route: 'Globules', instructions: '' }];
      next[0] = { ...next[0], [field]: value } as CreatePrescriptionItemInput;
      return next;
    });
  };
  // Days are stored on `duration` as e.g. "7 days"; the select works on the bare number (case-history parity).
  const daysValue = (rx?.duration || '').replace(/\s*days?$/i, '');
  // Selecting days auto-updates the next review date (today + N days).
  const onDaysChange = (v: string) => {
    update('duration', v ? `${v} days` : '');
    const n = parseInt(v, 10);
    if (!isNaN(n) && n > 0) {
      const d = new Date();
      d.setDate(d.getDate() + n);
      state.setFollowUp(d.toISOString().split('T')[0] || '');
    }
  };
  return (
    // No overflow-hidden here — it would clip the searchable dropdowns (e.g. Days) and break their scrolling.
    <div className="pp-card">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#E3E2DF] bg-[#F4F3F1] rounded-t-[7px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888786]">Manual consultation entry</span>
      </div>
      <div className="p-3.5 space-y-3.5">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Clinical notes / findings</label>
          <AutoSizeTextarea value={state.soapData.subjective} onChange={(e) => state.setSoapData((p) => ({ ...p, subjective: e.target.value, clinicalSummary: e.target.value }))} rows={5} className={taCls.replace('resize-y', 'resize-none')} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Diagnosis / assessment</label>
          <input value={state.soapData.assessment} onChange={(e) => state.setSoapData((p) => ({ ...p, assessment: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Remedy</label>
            <SearchableSelect value={rx?.medicationName || ''} onChange={(v) => update('medicationName', v)} options={medicineOptions} placeholder="Select remedy" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Potency</label>
            <SearchableSelect value={rx?.dosage || ''} onChange={(v) => update('dosage', v)} options={potencyOptions} placeholder="Select potency" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Frequency</label>
            <SearchableSelect value={rx?.frequency || ''} onChange={(v) => update('frequency', v)} options={frequencyOptions} placeholder="Select frequency" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Days</label>
            {dayOptions.length > 0 ? (
              <SearchableSelect value={daysValue} onChange={onDaysChange} options={dayOptions} placeholder="Select days" />
            ) : (
              <input type="number" value={daysValue} onChange={(e) => onDaysChange(e.target.value)} className={inputCls} placeholder="Days" />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Next visit date</label>
            <input type="date" value={state.followUp} onChange={(e) => state.setFollowUp(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#888786] mb-1.5">Advice</label>
          <AutoSizeTextarea value={state.advice} onChange={(e) => state.setAdvice(e.target.value)} rows={2} className={taCls.replace('resize-y', 'resize-none')} />
        </div>
      </div>
    </div>
  );
}

