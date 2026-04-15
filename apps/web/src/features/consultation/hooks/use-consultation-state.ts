// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';
import { useCompleteConsultation } from '../../../hooks/use-consultations';
import { toast } from '../../../hooks/use-toast';
import { calculateAge } from '../../../lib/format';
import { SoapSuggestion, HomeopathyConsultResult, SuggestedRubric, GnmAnalysis } from '../../../types/ai';
import type { ScoredRemedy } from '../../../types/ai';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';
import type { UiHints } from '../../../types/consultation';
import type { Visit } from '../../../types/visit';
import type { Patient } from '../../../types/patient';

// ─── Stage Type ───
export type ConsultStage = 'CONSULTATION' | 'TOTALITY' | 'REPERTORY' | 'PRESCRIPTION';

// ─── Types ───

export interface ConsultationMetrics {
  consultationStartTime: number;
  navigationEvents: number;
  textInputEvents: number;
  voiceUsed: boolean;
  templateUsageCount: number;
  voiceSegmentCount: number;
}

export interface SoapState {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  clinicalSummary: string;
}

export interface AiContext {
  visitId: string;
  chiefComplaint: string;
  specialty?: string;
  vitals?: Record<string, unknown>;
  patientAge?: number;
  patientGender?: string;
  thermalReaction?: string;
  miasm?: string;
  allergies?: string[];
  transcript?: string;
}

export interface UseConsultationStateInput {
  visitId: string;
  visit: Visit;
  patient?: Patient | null;
  uiHints?: UiHints;
}

export interface UseConsultationStateReturn {
  // SOAP
  soapData: SoapState;
  setSoapData: React.Dispatch<React.SetStateAction<SoapState>>;
  icdCodes: string;
  setIcdCodes: (codes: string) => void;

  // Prescription
  rxItems: CreatePrescriptionItemInput[];
  setRxItems: React.Dispatch<React.SetStateAction<CreatePrescriptionItemInput[]>>;
  rxNotes: string;
  setRxNotes: (notes: string) => void;

  // Labs
  labTests: string[];
  setLabTests: (tests: string[]) => void;
  aiSuggestedLabs: string[];

  // Follow-up & advice
  followUp: string;
  setFollowUp: (val: string) => void;
  advice: string;
  setAdvice: (val: string) => void;

  // AI suggestion from voice
  scribeSuggestion: SoapSuggestion | null;
  setScribeSuggestion: (s: SoapSuggestion | null) => void;
  ongoingTranscript: string;
  setOngoingTranscript: (t: string) => void;

  // Case Summary
  // caseSummary: string; // Removed as it was unused and we are using clinicalSummary
  // setCaseSummary: (s: string) => void;


  // Diagnosis
  selectedDiagnoses: string[];
  suggestedRubrics: SuggestedRubric[];
  setSuggestedRubrics: React.Dispatch<React.SetStateAction<SuggestedRubric[]>>;
  gnmAnalysis: GnmAnalysis | null;

  // Completion
  isSaving: boolean;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  isCompleting: boolean;

  // Telemetry
  metricsRef: React.MutableRefObject<ConsultationMetrics>;

  // Computed
  aiContext: AiContext | undefined;
  patientAge: number | undefined;

  // Handlers
  handleSoapGenerated: (suggestion: SoapSuggestion) => void;
  handleHomeopathyConsultGenerated: (result: HomeopathyConsultResult) => void;
  pendingConsultResult: HomeopathyConsultResult | null;
  handleSelectDirection: (name: string, icdCode: string) => void;
  handleReopenDirectionSelector: () => void;
  isSelectingDirection: boolean;
  handleDiagnosisSelected: (diagnoses: string[]) => void;
  handleApplyDiagnosis: (name: string, code: string) => void;

  handleSaveDraft: () => Promise<void>;
  handleComplete: () => Promise<void>;
  handleVoiceUsed: () => void;
  sttLanguage: 'en-IN' | 'hi-IN';
  handleTemplateUsed: () => void;
  handleRemedySelect: (remedyName: string, potencies: string[]) => void;
  handleAutoSuggestRemedy: (remedyName: string, potencies: string[]) => void;
  handleApplyGnmRemedy: (remedyName: string, potency: string) => void;

  // Homeopathy Specific
  thermalReaction: string;
  setThermalReaction: (val: string) => void;
  miasm: string;
  setMiasm: (val: string) => void;

  // Google Meet
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // Stage Navigation
  consultStage: ConsultStage;
  setConsultStage: (stage: ConsultStage) => void;
  handleNextStage: () => void;
  handlePrevStage: () => void;

  // Scored Remedies (for matrix grid)
  scoredRemedies: ScoredRemedy[];
  setScoredRemedies: React.Dispatch<React.SetStateAction<ScoredRemedy[]>>;
}

// ─── Hook ───

export function useConsultationState({
  visitId,
  visit,
  patient,
}: UseConsultationStateInput): UseConsultationStateReturn {
  const completeConsultation = useCompleteConsultation();

  // ─── Telemetry ───
  const metricsRef = useRef<ConsultationMetrics>({
    consultationStartTime: Date.now(),
    navigationEvents: 0,
    textInputEvents: 0,
    voiceUsed: false,
    templateUsageCount: 0,
    voiceSegmentCount: 0,
  });

  useEffect(() => {
    const handlePopState = () => {
      metricsRef.current.navigationEvents++;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
          metricsRef.current.textInputEvents++;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── SOAP state ───
  const [soapData, setSoapData] = useState<SoapState>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    clinicalSummary: '',
  });
  const [icdCodes, setIcdCodes] = useState('');
  const [specialtyData] = useState<Record<string, unknown>>({});

  // AI suggestion from voice
  const [scribeSuggestion, setScribeSuggestion] = useState<SoapSuggestion | null>(null);
  const [ongoingTranscript, setOngoingTranscript] = useState('');


  // ─── Prescription ───
  const [rxItems, setRxItems] = useState<CreatePrescriptionItemInput[]>([]);
  const [rxNotes, setRxNotes] = useState('');

  // ─── Labs ───
  const [labTests, setLabTests] = useState<string[]>([]);
  const [aiSuggestedLabs, setAiSuggestedLabs] = useState<string[]>([]);

  // ─── Language ───
  const sttLanguage = 'en-IN';

  // ─── Follow-up & advice ───
  const [followUp, setFollowUp] = useState('');
  const [advice, setAdvice] = useState('');
  const [thermalReaction, setThermalReaction] = useState('');
  const [miasm, setMiasm] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ─── Stage Navigation ───
  const STAGE_ORDER: ConsultStage[] = ['CONSULTATION', 'TOTALITY', 'REPERTORY', 'PRESCRIPTION'];
  const [consultStage, setConsultStage] = useState<ConsultStage>('CONSULTATION');
  const [scoredRemedies, setScoredRemedies] = useState<ScoredRemedy[]>([]);

  const handleNextStage = useCallback(() => {
    setConsultStage((prev) => {
      const idx = STAGE_ORDER.indexOf(prev);
      return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : prev;
    });
  }, []);

  const handlePrevStage = useCallback(() => {
    setConsultStage((prev) => {
      const idx = STAGE_ORDER.indexOf(prev);
      return idx > 0 ? STAGE_ORDER[idx - 1] : prev;
    });
  }, []);

  // ─── Saving ───
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // ─── Diagnosis tracking ───
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [suggestedRubrics, setSuggestedRubrics] = useState<SuggestedRubric[]>([]);
  const [gnmAnalysis, setGnmAnalysis] = useState<GnmAnalysis | null>(null);
  const [pendingConsultResult, setPendingConsultResult] = useState<HomeopathyConsultResult | null>(null);
  const [isSelectingDirection, setIsSelectingDirection] = useState(false);
  const lastAutoRemedyRef = useRef<string | null>(null);

  // ─── Reset state on visitId change ───
  useEffect(() => {
    setSoapData({ subjective: '', objective: '', assessment: '', plan: '', clinicalSummary: '' });
    setScribeSuggestion(null);
    setOngoingTranscript('');
    setRxItems([]);
    setRxNotes('');
    setLabTests([]);
    setAiSuggestedLabs([]);
    setFollowUp('');
    setAdvice('');
    setSelectedDiagnoses([]);
    setPendingConsultResult(null);
    setIsSelectingDirection(false);
    lastAutoRemedyRef.current = null;
    setIcdCodes('');
    setThermalReaction('');
    setMiasm('');
    setSessionId(null);
    setSuggestedRubrics([]);
    setGnmAnalysis(null);
  }, [visitId]);

  // ─── Computed ───
  const patientAge = patient?.dateOfBirth
    ? calculateAge(patient.dateOfBirth)
    : undefined;

  const aiContext: AiContext | undefined =
    visitId && visit.chiefComplaint
      ? {
        visitId,
        chiefComplaint: visit.chiefComplaint,
        specialty: visit.specialty,
        vitals: visit.vitals
          ? {
            heightCm: visit.vitals.heightCm,
            weightKg: visit.vitals.weightKg,
            temperatureF: visit.vitals.temperatureF,
            pulseRate: visit.vitals.pulseRate,
            systolicBp: visit.vitals.systolicBp,
            diastolicBp: visit.vitals.diastolicBp,
            // heightCm: visit.vitals.heightCm,
          }
          : undefined,
        patientAge,
        patientGender: patient?.gender,
        thermalReaction,
        miasm,
        allergies: patient?.allergies,
        transcript: ongoingTranscript,
      }
      : undefined;

  // ─── Payload builder ───
  const buildPayload = useCallback(() => {
    let basePlan = soapData.plan;
    if (Array.isArray(basePlan)) basePlan = basePlan.join('\n');
    let planText = basePlan || '';

    if (labTests.length > 0) {
      planText += `\n\nLab Orders: ${labTests.join(', ')}`;
    }
    const parsedIcdCodes = icdCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    return {
      soap: {
        subjective: soapData.subjective || undefined,
        objective: soapData.objective || undefined,
        assessment: soapData.assessment || undefined,
        plan: planText || undefined,
        advice: advice.trim() || undefined,
        followUp: followUp.trim() || undefined,
        clinicalSummary: soapData.clinicalSummary || undefined,
        icdCodes: parsedIcdCodes.length > 0 ? parsedIcdCodes : undefined,
        specialtyData:
          Object.keys(specialtyData).length > 0 ? specialtyData : undefined,
      },
      prescription: (() => {
        const filledItems = rxItems.filter(
          (item) =>
            item.medicationName &&
            item.dosage &&
            item.frequency &&
            item.duration,
        );
        return filledItems.length > 0
          ? { notes: rxNotes || undefined, items: filledItems }
          : undefined;
      })(),
      labOrders:
        labTests.length > 0
          ? labTests.map((test) => ({
            testName: test,
            aiSuggested: aiSuggestedLabs.includes(test),
          }))
          : undefined,
    };
  }, [soapData, icdCodes, specialtyData, labTests, followUp, advice, rxItems, rxNotes, aiSuggestedLabs]);

  // ─── Metrics logger ───
  const logMetrics = useCallback(() => {
    const m = metricsRef.current;
    const durationMs = Date.now() - m.consultationStartTime;
    const durationMin = Math.round(durationMs / 60000);
    const voicePct = m.voiceUsed
      ? Math.min(100, Math.round((m.voiceSegmentCount / Math.max(1, m.textInputEvents + m.voiceSegmentCount)) * 100))
      : 0;
    const templatePct = m.templateUsageCount > 0
      ? Math.round((m.templateUsageCount / Math.max(1, m.templateUsageCount + m.textInputEvents)) * 100)
      : 0;

    console.info('[Clinical Focus Metrics]', {
      visitId,
      durationMin,
      navigationEvents: m.navigationEvents,
      textInputEvents: m.textInputEvents,
      voiceUsed: m.voiceUsed,
      voiceUsagePct: voicePct,
      templateUsagePct: templatePct,
      completedAt: new Date().toISOString(),
    });
  }, [visitId]);

  // ─── Handlers ───

  const handleSoapGenerated = useCallback((suggestion: SoapSuggestion) => {
    setScribeSuggestion(suggestion);
    metricsRef.current.voiceSegmentCount++;
  }, []);

  const handleDiagnosisSelected = useCallback((diagnoses: string[]) => {
    setSelectedDiagnoses(diagnoses);
    const labSuggestions: string[] = [];
    const diagText = diagnoses.join(' ').toLowerCase();
    if (diagText.includes('diabetes') || diagText.includes('hyperglycemia')) {
      labSuggestions.push('HbA1c', 'Blood Sugar (F)', 'Blood Sugar (PP)', 'KFT');
    }
    if (diagText.includes('hypertension') || diagText.includes('cardiac')) {
      labSuggestions.push('ECG', 'Lipid Panel', 'KFT');
    }
    if (diagText.includes('anemia') || diagText.includes('infection') || diagText.includes('fever')) {
      labSuggestions.push('CBC', 'CRP', 'ESR');
    }
    if (diagText.includes('thyroid')) {
      labSuggestions.push('TFT');
    }
    if (diagText.includes('liver') || diagText.includes('hepat')) {
      labSuggestions.push('LFT');
    }
    if (diagText.includes('renal') || diagText.includes('kidney')) {
      labSuggestions.push('KFT', 'Urine R/M');
    }
    setAiSuggestedLabs([...new Set(labSuggestions)]);
  }, []);

  const handleApplyDiagnosis = useCallback((name: string, code: string) => {
    setIcdCodes((prev) => {
      const existing = prev.split(',').map(c => c.trim()).filter(Boolean);
      if (existing.includes(code)) return prev;
      return [...existing, code].join(', ');
    });
    setSelectedDiagnoses((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  }, []);


  const handleSaveDraft = useCallback(async () => {
    if (!visitId) return;
    setIsSaving(true);
    try {
      const payload = buildPayload();
      await completeConsultation.mutateAsync({
        visitId,
        ...payload,
        autoApprove: false,
      });
      toast({ title: 'Draft saved', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Failed to save draft',
        description: err instanceof Error ? err.message : '',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [visitId, buildPayload, completeConsultation]);

  const handleComplete = useCallback(async () => {
    if (!visitId) return;
    const payload = buildPayload();
    try {
      await completeConsultation.mutateAsync({
        visitId,
        ...payload,
        autoApprove: true,
      });
      logMetrics();
      toast({ title: 'Consultation completed', variant: 'success' });
      setShowCompleted(true);
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : '';
      if (err && typeof (err as any).details === 'object' && Array.isArray((err as any).details)) {
        errorMsg += ': ' + (err as any).details.map((d: any) => `${d.field} - ${d.message}`).join(', ');
      }
      toast({
        title: 'Failed to complete consultation',
        description: errorMsg,
        variant: 'error',
      });
    }
  }, [visitId, buildPayload, completeConsultation, logMetrics]);

  const handleVoiceUsed = useCallback(() => {
    metricsRef.current.voiceUsed = true;
  }, []);

  const handleTemplateUsed = useCallback(() => {
    metricsRef.current.templateUsageCount++;
  }, []);

  const handleRemedySelect = useCallback((remedyName: string, potencies: string[]) => {
    setRxItems((prev) => [
      ...prev,
      {
        medicationName: remedyName,
        genericName: '',
        dosage: potencies[0] || '30C',
        frequency: '',
        duration: '',
        route: 'Globules',
        instructions: '',
      },
    ]);
  }, []);

  // Track the name of the last remedy we automatically injected

  const handleAutoSuggestRemedy = useCallback((remedyName: string, potencies: string[]) => {
    setRxItems((prev) => {
      // If the top remedy hasn't changed, do nothing
      if (lastAutoRemedyRef.current === remedyName) return prev;

      // If the user already added it manually, don't duplicate
      if (prev.some((item) => item.medicationName === remedyName)) {
        lastAutoRemedyRef.current = remedyName;
        return prev;
      }

      const next = [...prev];

      // If we previously auto-injected a remedy, let's swap it out so we don't spam the list
      if (lastAutoRemedyRef.current) {
        const oldIdx = next.findIndex((item) => item.medicationName === lastAutoRemedyRef.current);
        // We only remove it if the user hasn't explicitly changed its name
        if (oldIdx !== -1) {
          next.splice(oldIdx, 1);
        }
      }

      // Add the new top remedy
      next.push({
        medicationName: remedyName,
        genericName: '',
        dosage: potencies[0] || '30C',
        frequency: 'Stat',
        duration: '1 day',
        route: 'Globules',
        instructions: '',
      });

      lastAutoRemedyRef.current = remedyName;
      return next;
    });
  }, []);

  const handleApplyGnmRemedy = useCallback((remedyName: string, potency: string) => {
    setRxItems([
      {
        medicationName: remedyName,
        genericName: '',
        dosage: potency || '200C',
        frequency: 'Single dose',
        duration: 'As directed',
        route: 'Globules',
        instructions: '',
      },
    ]);
  }, []);

  const handleHomeopathyConsultGenerated = useCallback((result: HomeopathyConsultResult) => {
    console.log('[useConsultationState] Homeopathy consult generated:', result);

    const hasDirections = result.diagnosisData?.primaryDiagnosis || (result.diagnosisData?.differentials?.length || 0) > 0;

    if (!hasDirections) {
      console.warn('[useConsultationState] No clinical directions found in AI response. Skipping selection step.');
      // Auto-select a fallback or General Consultation
      setPendingConsultResult(result);
      handleSelectDirection(result.diagnosisData?.primaryDiagnosis?.name || 'General Consultation', result.diagnosisData?.primaryDiagnosis?.icdCode || '');
      return;
    }

    // Instead of applying everything, we show the clinical direction selector first
    setPendingConsultResult(result);
    setIsSelectingDirection(true);
    metricsRef.current.voiceSegmentCount++;
    toast({ title: 'AI Analysis complete. Please select a clinical direction.', variant: 'default' });
  }, []);

  const handleSelectDirection = useCallback((name: string, icdCode: string) => {
    if (!pendingConsultResult) return;

    const result = pendingConsultResult;

    // 1. Update SOAP
    const clinicalFindings = result.clinicalData.clinicalFindings || [];
    const labKeywords = ['count', 'level', 'mg/dl', 'mmo/l', 'u/l', 'positive', 'negative', 'reactive', 'report', 'lab', 'blood', 'serum', 'urine', 'test'];
    const hasLabFindings = clinicalFindings.some(f =>
      labKeywords.some(kw => f.toLowerCase().includes(kw))
    );

    const objectiveText = clinicalFindings.length > 0
      ? `${hasLabFindings ? 'Clinical/Lab Findings' : 'Clinical Observations'}:\n- ${clinicalFindings.join('\n- ')}`
      : '';

    const planData = (result.prescriptionDraft as any).caseAnalysis || result.prescriptionDraft.materiaMedicaValidation;
    const planText = Array.isArray(planData) ? planData.join('\n') : (planData || '');

    setSoapData({
      subjective: result.prescriptionDraft.consultationSummary,
      objective: objectiveText,
      assessment: name, // Use the selected direction name
      plan: planText,
      clinicalSummary: result.caseSummary || '',
    });

    // 2. Update Diagnosis (Overwrite array to ensure only selected one stays)
    console.log('[handleSelectDirection] Overwriting diagnoses with:', name);
    setSelectedDiagnoses([name]);
    setIcdCodes(icdCode || '');

    // 3. Update Remedy/Prescription
    const suggestedRemedies = result.prescriptionDraft.suggestedRemedies || [];

    if (suggestedRemedies.length > 0) {
      setRxItems(suggestedRemedies.map((r: { remedyName: string; potency?: string }) => ({
        medicationName: r.remedyName,
        genericName: '',
        dosage: r.potency || '30C',
        frequency: 'Stat',
        duration: '1 day',
        route: 'Globules',
        instructions: '',
      })));
    } else {
      const draftRemedy = result.prescriptionDraft.suggestedRemedy;
      const fallbackRemedy = result.remedyScores.scoredRemedies?.[0]?.remedyName;

      if (draftRemedy || fallbackRemedy) {
        handleAutoSuggestRemedy(
          draftRemedy || fallbackRemedy!,
          [result.prescriptionDraft.potency || '30C'],
        );
      }
    }

    // 4. Update Advice & Follow-up
    setAdvice(result.prescriptionDraft.advice?.join('\n') || '');
    setFollowUp(result.prescriptionDraft.followUp || '');

    // 5. Update Rubrics
    if (result.rubricsResult?.suggestedRubrics) {
      setSuggestedRubrics(result.rubricsResult.suggestedRubrics);
    }

    // 6. Update GNM Analysis
    if (result.gnmAnalysis) {
      setGnmAnalysis(result.gnmAnalysis);
    }

    // 7. Update Scored Remedies
    if (result.remedyScores?.scoredRemedies) {
      setScoredRemedies(result.remedyScores.scoredRemedies);
    }

    // Clear pending state
    setIsSelectingDirection(false);
    toast({ title: 'Clinical path locked. Draft updated.', variant: 'success' });
  }, [pendingConsultResult, handleApplyDiagnosis, handleAutoSuggestRemedy]);

  const handleReopenDirectionSelector = useCallback(() => {
    if (pendingConsultResult) {
      setIsSelectingDirection(true);
    }
  }, [pendingConsultResult]);

  return {
    soapData,
    setSoapData,
    icdCodes,
    setIcdCodes,
    rxItems,
    setRxItems,
    rxNotes,
    setRxNotes,
    labTests,
    setLabTests,
    aiSuggestedLabs,
    followUp,
    setFollowUp,
    advice,
    setAdvice,
    thermalReaction,
    setThermalReaction,
    miasm,
    setMiasm,
    scribeSuggestion,
    setScribeSuggestion,
    sttLanguage,
    ongoingTranscript,
    setOngoingTranscript,
    selectedDiagnoses,
    suggestedRubrics,
    setSuggestedRubrics,
    gnmAnalysis,

    isSaving,
    showCompleted,
    setShowCompleted,
    isCompleting: completeConsultation.isPending,
    metricsRef,
    aiContext,
    patientAge,
    handleSoapGenerated,
    handleHomeopathyConsultGenerated,
    handleSelectDirection,
    handleReopenDirectionSelector,
    pendingConsultResult,
    isSelectingDirection,
    handleDiagnosisSelected,
    handleApplyDiagnosis,
    handleSaveDraft,

    handleComplete,
    handleVoiceUsed,
    handleTemplateUsed,
    handleRemedySelect,
    handleAutoSuggestRemedy,
    handleApplyGnmRemedy,
    sessionId,
    setSessionId,
    consultStage,
    setConsultStage,
    handleNextStage,
    handlePrevStage,
    scoredRemedies,
    setScoredRemedies,
  };
}
