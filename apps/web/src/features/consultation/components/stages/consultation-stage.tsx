import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { AICaptureModule } from '../ai-capture-module';
import { CallInterfacePanel, type CallMode } from '../../../../components/video-call/call-interface-panel';
import { useBinaryTranscriber } from '../../../../hooks/use-binary-transcriber';
import type { VideoCallState } from '../consultation-header';
import type { SoapSuggestion, HomeopathyConsultResult, ConsultationMode, CategorizedSymptoms } from '../../../../types/ai';
import type { GnmAnalysis } from '../../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../../types/scribing';
import { useAiQuestionSuggestions } from '../../hooks/use-ai-question-suggestions';
import { useModeQuestions } from '../../hooks/use-mode-questions';
import { useSymptomExtraction } from '../../hooks/use-symptom-extraction';
import { Zap, RefreshCw, ClipboardList, Brain, Heart, Search, Star, Volume2, Mic, X, Trash2 } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { toast } from '../../../../hooks/use-toast';

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
  consultationMode: ConsultationMode;
  onConsultationModeChange: (mode: ConsultationMode) => void;
  categorizedSymptoms: CategorizedSymptoms;
  onSymptomsExtracted: (symptoms: CategorizedSymptoms) => void;
  onAnalyseSymptoms?: () => void; // used by bottom bar, kept in interface
}

const MODE_CONFIG: Record<ConsultationMode, { icon: React.ReactNode; label: string; color: string; bg: string; border: string; desc: string }> = {
  acute: { icon: <Zap className="h-5 w-5" />, label: 'Acute', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', desc: 'Recent onset — focus on onset, modalities, sensation' },
  chronic: { icon: <RefreshCw className="h-5 w-5" />, label: 'Chronic', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300', desc: 'Long-standing — constitutional analysis, life events' },
  followup: { icon: <ClipboardList className="h-5 w-5" />, label: 'Follow-up', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', desc: 'Review response to previous prescription' },
};

const CALL_MODE_LABELS: Record<CallMode, string> = {
  IN_PERSON: 'In-Person',
  AUDIO: 'Audio',
  VIDEO: 'Video',
};

export function ConsultationStage({
  visitId,
  visit,
  patient,
  patientAge,
  sttLanguage,
  onSoapGenerated,
  onHomeopathyConsultGenerated,
  onVoiceUsed,
  onTranscriptUpdate,
  videoCallState,
  onStartVideoCall,
  callMode,
  video,
  isVideoPaused,
  onPauseToggle,
  gnmAnalysis,
  consultationMode,
  onConsultationModeChange: _onConsultationModeChange,
  categorizedSymptoms,
  onSymptomsExtracted,
  onAnalyseSymptoms: _onAnalyseSymptoms,
}: ConsultationStageProps) {

  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [remoteInterimText, setRemoteInterimText] = useState<string | null>(null);
  const nextSeqRef = useRef(0);
  const [customQuestion, setCustomQuestion] = useState('');
  const [_ongoingTranscript, _setOngoingTranscript] = useState('');
  const [patientAnswer, setPatientAnswer] = useState('');
  const [isListeningForAnswer, setIsListeningForAnswer] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lab report context — updated from AICaptureModule render prop
  const labContextRef = useRef<string>('');

  // Bumped each time the user clears symptoms. In-flight extraction mutations
  // capture the value at dispatch time and discard their result if the counter
  // moved — otherwise a slow mutation resolves after the clear and re-populates.
  const clearGenerationRef = useRef(0);

  // Buffer of patient-answer segments waiting for Submit.
  // Keyed by original text so translation updates can swap in the English version.
  const patientAnswerSegmentsRef = useRef<{ text: string; translatedText: string; timestamp: number }[]>([]);

  // ── Client-side interim text staleness watchdog ──────────────────────────────
  // If interim text hasn't resolved to a final result within 8 seconds, the STT
  // stream has likely silently rotated/hung. Auto-clear it so the UI doesn't freeze
  // showing stale partial text like "Den how Meni apps" indefinitely.
  const lastInterimTimeRef = useRef<number>(0);
  const interimClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!interimText && !remoteInterimText) return;

    // Restart the clear timer whenever new interim text arrives
    if (interimClearTimerRef.current) clearTimeout(interimClearTimerRef.current);
    lastInterimTimeRef.current = Date.now();

    interimClearTimerRef.current = setTimeout(() => {
      const staleMs = Date.now() - lastInterimTimeRef.current;
      if (staleMs >= 7500) {
        // No final result arrived — clear the frozen interim text
        setInterimText('');
        setRemoteInterimText(null);
      }
    }, 8000);

    return () => {
      if (interimClearTimerRef.current) clearTimeout(interimClearTimerRef.current);
    };
  }, [interimText, remoteInterimText]);

  // --- Patient presence (LiveKit) ---

  // --- Video-call socket for sending questions to patient screen ---
  const vcSocketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (callMode === 'IN_PERSON') return;
    const socket = io(`${window.location.origin}/video-call`, {
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
    });
    socket.on('connect', () => {
      socket.emit('call:join', { visitId, speaker: 'DOCTOR' });
    });
    vcSocketRef.current = socket;
    return () => {
      // Explicitly notify the patient before disconnecting so they get the leave event
      // even if the disconnect handler is delayed by network latency.
      try { socket.emit('call:leave'); } catch {}
      socket.disconnect();
      vcSocketRef.current = null;
    };
  }, [visitId, callMode]);

  const triggerEvents = gnmAnalysis?.coreConflict?.triggerEvents || [];
  const mentalTraits = gnmAnalysis?.homeopathicTotality?.mentalEmotional || [];
  const physicalGenerals = gnmAnalysis?.homeopathicTotality?.physicalGenerals || [];
  const phases = gnmAnalysis?.phases;
  const conflict = gnmAnalysis?.coreConflict;

  const sections = [
    { key: 'background', completed: triggerEvents.length > 0 },
    { key: 'mental', completed: mentalTraits.length > 0 },
    { key: 'physical', completed: physicalGenerals.length > 0 },
  ];
  const completedSections = sections.filter(s => s.completed).length;
  const totalSections = 6;

  // --- Google STT Transcription ---
  const onTranscriptResult = useCallback((result: any) => {
    if (result.isTranslationUpdate) {
      // Update main transcript segments
      setSegments(prev =>
        prev.map(seg => {
          // Match by timestamp (unique per segment). We don't check speaker here
          // because IN_PERSON re-maps speaker via isListeningForAnswer while the
          // gateway only sees the original role, which causes speaker mismatches.
          const timestampMatch = seg.timestamp === result.timestamp;
          const textMatch = seg.text === result.text;
          if (timestampMatch || textMatch) {
            return { ...seg, translatedText: result.translatedText };
          }
          return seg;
        })
      );

      // Also update the patient-answer buffer if we are in listen mode,
      // then recompute the textarea so it shows English instead of Hindi.
      if (isListeningForAnswer && patientAnswerSegmentsRef.current.length > 0) {
        const updated = patientAnswerSegmentsRef.current.map(s =>
          (s.timestamp === result.timestamp || s.text === result.text)
            ? { ...s, translatedText: result.translatedText }
            : s
        );
        patientAnswerSegmentsRef.current = updated;
        setPatientAnswer(updated.map(s => s.translatedText || s.text).join(' '));
      }
      return;
    }

    // In IN_PERSON mode, if the doctor is explicitly "Listening", the audio belongs to the PATIENT.
    // Otherwise, use the role provided by the transcriber gateway.
    const speaker: SpeakerLabel = 
      (callMode === 'IN_PERSON' && isListeningForAnswer) 
        ? 'PATIENT' 
        : (result.role === 'PATIENT' ? 'PATIENT' : 'DOCTOR');

    if (result.isFinal) {
      if (isListeningForAnswer && speaker === 'PATIENT') {
        // Buffer into the ref so translation updates can swap Hindi → English later.
        // Do NOT add to segments yet — committed on Submit to prevent duplicate saves.
        const answerSeg = {
          text: result.text,
          translatedText: result.translatedText || '',
          timestamp: result.timestamp,
        };
        patientAnswerSegmentsRef.current = [...patientAnswerSegmentsRef.current, answerSeg];
        // Show translated (English) text immediately if available; translation update will
        // replace as soon as it arrives via the isTranslationUpdate branch above.
        setPatientAnswer(
          patientAnswerSegmentsRef.current.map(s => s.translatedText || s.text).join(' ')
        );
        setRemoteInterimText(null); // clear interim once final arrives
        return;
      }

      const segment: TranscriptSegmentLocal = {
        sequenceNumber: nextSeqRef.current++,
        text: result.text,
        translatedText: result.translatedText,
        speaker,
        confidence: 0.95,
        startTimeMs: 0,
        endTimeMs: 0,
        isFinal: true,
        timestamp: result.timestamp,
      };

      setSegments(prev => {
        const updated = [...prev, segment];
        const fullText = updated
          .map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
          .join('\n');
        setTimeout(() => onTranscriptUpdate?.(fullText), 0);
        return updated;
      });

      if (speaker === 'DOCTOR') setInterimText('');
      else setRemoteInterimText(null);
    } else {
      if (speaker === 'DOCTOR') setInterimText(result.text);
      else {
        setRemoteInterimText(result.text);
        // Also show interim in patient answer if listening
        if (isListeningForAnswer) {
          // Note: we don't permanently set state here to avoid jitter, 
          // but we could show it in a preview
        }
      }
    }
  }, [onTranscriptUpdate, isListeningForAnswer, callMode]);

  const binaryTranscriber = useBinaryTranscriber({
    visitId,
    engine: 'GOOGLE',
    languageCode: sttLanguage,
    role: 'DOCTOR',
    onTranscript: onTranscriptResult,
    onError: (err: any) => {
      const msg = err?.message || String(err) || 'Transcription failed';
      console.error('[Transcription] Error:', err);
      // Surface the error to the user so they know why nothing is appearing
      toast({
        title: 'Transcription error',
        description: msg.length > 200 ? msg.slice(0, 200) + '…' : msg,
        variant: 'error',
      });
    },
  });

  // --- Auto-start transcription on mount for ALL modes ---
  // For IN_PERSON → our own getUserMedia (no LiveKit involved).
  // For AUDIO/VIDEO → reuse LiveKit's local audio track so we don't fight LiveKit
  // over the mic (the classic "silent stream in video mode" bug). We wait until
  // LiveKit has finished publishing the track before starting.
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    if (binaryTranscriber.isRecording || binaryTranscriber.isConnecting) return;

    const isLiveKitMode = callMode === 'AUDIO' || callMode === 'VIDEO';

    if (isLiveKitMode) {
      // Extract the underlying MediaStreamTrack from LiveKit's LocalAudioTrack.
      // LiveKit's client exposes it as `.mediaStreamTrack` on LocalAudioTrack.
      const liveKitTrack: MediaStreamTrack | undefined =
        video?.localAudioTrack?.mediaStreamTrack || video?.localAudioTrack;
      if (!liveKitTrack || !(liveKitTrack instanceof MediaStreamTrack)) {
        // Track not ready yet — wait for the next render when LiveKit finishes init
        return;
      }
      hasAutoStarted.current = true;
      console.log(`[ConsultationStage] Auto-starting transcription (${callMode}) via LiveKit track`);
      Promise.resolve(binaryTranscriber.startRecording({ audioTrack: liveKitTrack })).catch((err) => {
        console.error('[ConsultationStage] Auto-start failed:', err);
      });
      onVoiceUsed?.();
    } else {
      // IN_PERSON — no LiveKit, our own getUserMedia
      hasAutoStarted.current = true;
      console.log(`[ConsultationStage] Auto-starting transcription (${callMode}) via getUserMedia`);
      Promise.resolve(binaryTranscriber.startRecording()).catch((err) => {
        console.error('[ConsultationStage] Auto-start failed:', err);
      });
      onVoiceUsed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callMode, video?.localAudioTrack, binaryTranscriber.isRecording, binaryTranscriber.isConnecting]);

  // Manual start/stop handlers for IN_PERSON
  const handleStartRecording = useCallback(() => {
    binaryTranscriber.startRecording();
    onVoiceUsed?.();
  }, [binaryTranscriber, onVoiceUsed]);

  const handleStopRecording = useCallback(() => {
    binaryTranscriber.stopRecording();
    setInterimText('');
    setRemoteInterimText(null);
    setIsListeningForAnswer(false);
  }, [binaryTranscriber]);

  const aiQuestions = useAiQuestionSuggestions(segments, binaryTranscriber.isRecording);

  // --- Mode-specific question generation ---
  const modeQuestions = useModeQuestions();
  const symptomExtraction = useSymptomExtraction();
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const lastQuestionRef = useRef<string>('');

  // --- Auto-extract symptoms from live transcript during calls ---
  const lastExtractedSegCountRef = useRef(0);
  const extractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Auto-extract for ALL modes:
    // - AUDIO/VIDEO: dual-mic, segments are labeled DOCTOR vs PATIENT
    // - IN_PERSON: single mic, all segments labeled DOCTOR — extract from raw text
    if (!binaryTranscriber.isRecording) return;

    const finalSegs = segments.filter(s => s.isFinal);
    const newSegCount = finalSegs.length;

    // Need at least 2 new segments since last extraction
    if (newSegCount - lastExtractedSegCountRef.current < 2) return;

    // Debounce: wait 4 seconds of silence
    if (extractionTimerRef.current) {
      clearTimeout(extractionTimerRef.current);
    }

    extractionTimerRef.current = setTimeout(() => {
      const newSegs = finalSegs.slice(lastExtractedSegCountRef.current);
      const isInPerson = callMode === 'IN_PERSON';

      let questionText: string;
      let answerText: string;

      if (isInPerson) {
        // Single-mic mode: send all new transcript text as the answer.
        // The AI will extract symptoms regardless of who said what.
        const allText = newSegs.map(s => s.translatedText || s.text).join(' ');
        if (!allText.trim()) return;
        questionText = lastQuestionRef.current || 'Doctor-patient conversation';
        answerText = allText;
      } else {
        // Dual-mic mode: pair doctor question with patient answer
        const doctorSegs = newSegs.filter(s => s.speaker === 'DOCTOR');
        const patientSegs = newSegs.filter(s => s.speaker === 'PATIENT');
        if (patientSegs.length === 0) return;
        questionText = doctorSegs.length > 0
          ? doctorSegs.map(s => s.translatedText || s.text).join(' ')
          : 'General conversation';
        answerText = patientSegs.map(s => s.translatedText || s.text).join(' ');
      }

      lastExtractedSegCountRef.current = newSegCount;

      // Extract symptoms from this Q&A pair
      const genAtDispatch = clearGenerationRef.current;
      symptomExtraction.mutate(
        {
          consultationMode,
          question: questionText,
          answer: answerText,
          existingSymptoms: categorizedSymptoms,
          labContext: labContextRef.current || undefined,
        },
        {
          onSuccess: (result) => {
            if (clearGenerationRef.current !== genAtDispatch) return; // user cleared — discard stale result
            if (result && (result.mental?.length || result.physical?.length || result.particular?.length)) {
              onSymptomsExtracted(result);
            }
          },
        },
      );

      // Also regenerate mode-specific questions based on updated transcript
      modeQuestions.mutate({
        consultationMode,
        transcript: finalSegs.map(s => `${s.speaker}: ${s.translatedText || s.text}`).join('\n'),
        answeredQuestions,
        chiefComplaint: (visit.chiefComplaint || (visit as any).notes || '').trim(),
        patientAge,
        patientGender: patient?.gender,
      });
    }, 4000);

    return () => {
      if (extractionTimerRef.current) {
        clearTimeout(extractionTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length, callMode, binaryTranscriber.isRecording]);

  const handleLoadModeQuestions = useCallback(() => {
    modeQuestions.mutate({
      consultationMode,
      transcript: segments.map(s => `${s.speaker}: ${s.translatedText || s.text}`).join('\n'),
      answeredQuestions,
      chiefComplaint: visit.chiefComplaint,
      patientAge,
      patientGender: patient?.gender,
    });
  }, [consultationMode, segments, answeredQuestions, visit.chiefComplaint, patientAge, patient?.gender, modeQuestions]);

  // Auto-load questions when mode changes
  useEffect(() => {
    handleLoadModeQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationMode]);

  const totalSymptoms = categorizedSymptoms.mental.length + categorizedSymptoms.physical.length + categorizedSymptoms.particular.length;

  // Scroll chat to bottom on new segments
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText, remoteInterimText]);

  // Combine AI and mode questions
  const modeQList = (modeQuestions.data as any)?.questions || [];
  const allQuestions = [
    ...modeQList.map((q: any, i: number) => {
      const qText = typeof q === 'string' ? q : q.question;
      const isAnswered = answeredQuestions.includes(qText);
      return {
        id: `mode-${i}`,
        question: qText,
        options: (q as any).options,
        answered: isAnswered,
      };
    }),
  ];

  // Inject a question into the transcript
  const injectQuestion = useCallback((questionText: string, questionId?: string) => {
    if (questionId) aiQuestions.markAnswered(questionId);
    setAnsweredQuestions(prev => [...prev, questionText]);
    lastQuestionRef.current = questionText;
    const segment: TranscriptSegmentLocal = {
      sequenceNumber: nextSeqRef.current++,
      text: questionText,
      translatedText: questionText,
      speaker: 'DOCTOR',
      confidence: 1.0,
      startTimeMs: 0,
      endTimeMs: 0,
      isFinal: true,
      timestamp: Date.now(),
    };
    setSegments(prev => {
      const updated = [...prev, segment];
      const fullText = updated
        .map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
        .join('\n');
      setTimeout(() => onTranscriptUpdate?.(fullText), 0);
      return updated;
    });

    // Send question to patient's screen via WebSocket (AUDIO/VIDEO only)
    if (vcSocketRef.current?.connected) {
      vcSocketRef.current.emit('call:send-question', { visitId, question: questionText });
    }

    // In IN_PERSON mode, auto-enable "Listen for answer" so the next audio the
    // doctor's mic captures is labeled as the patient's response, not as more
    // doctor speech. Clear any previous answer buffer so we don't append.
    if (callMode === 'IN_PERSON') {
      // Clear the buffer so previous answer segments don't bleed into the next answer
      patientAnswerSegmentsRef.current = [];
      setPatientAnswer('');
      setIsListeningForAnswer(true);
    }
  }, [aiQuestions, onTranscriptUpdate, visitId, callMode]);

  // Submit patient answer — then extract symptoms from this Q&A pair
  const handleSubmitAnswer = useCallback(() => {
    if (!patientAnswer.trim()) return;
    const answerText = patientAnswer.trim();
    const questionText = lastQuestionRef.current || 'General question';

    // Add answer to transcript
    const segment: TranscriptSegmentLocal = {
      sequenceNumber: nextSeqRef.current++,
      text: answerText,
      translatedText: answerText,
      speaker: 'PATIENT',
      confidence: 1.0,
      startTimeMs: 0,
      endTimeMs: 0,
      isFinal: true,
      timestamp: Date.now(),
    };
    setSegments(prev => {
      const updated = [...prev, segment];
      const fullText = updated
        .map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
        .join('\n');
      setTimeout(() => onTranscriptUpdate?.(fullText), 0);
      return updated;
    });
    // Use the fully-translated version from the segment buffer (translation may
    // have arrived after the original final event, swapping Hindi → English).
    const translatedAnswer = patientAnswerSegmentsRef.current.length > 0
      ? patientAnswerSegmentsRef.current.map(s => s.translatedText || s.text).join(' ')
      : answerText;
    patientAnswerSegmentsRef.current = []; // clear buffer for next answer
    setPatientAnswer('');
    // Done listening for this answer — next audio belongs to the doctor again
    setIsListeningForAnswer(false);

    // Add answer to transcript using the English-translated text
    const finalAnswerText = translatedAnswer.trim() || answerText;

    // Extract symptoms from this Q&A pair (like demo does per answer)
    const genAtDispatch = clearGenerationRef.current;
    symptomExtraction.mutate(
      {
        consultationMode,
        question: questionText,
        answer: finalAnswerText,
        existingSymptoms: categorizedSymptoms,
        labContext: labContextRef.current || undefined,
      },
      {
        onSuccess: (result) => {
          if (clearGenerationRef.current !== genAtDispatch) return;
          if (result && (result.mental?.length || result.physical?.length || result.particular?.length)) {
            onSymptomsExtracted(result);
          }
        },
      },
    );

    // Regenerate next questions based on updated transcript (includes the new answer)
    setTimeout(() => {
      modeQuestions.mutate({
        consultationMode,
        transcript: [...segments, segment].map(s => `${s.speaker}: ${s.translatedText || s.text}`).join('\n'),
        answeredQuestions: [...answeredQuestions, questionText],
        chiefComplaint: (visit.chiefComplaint || (visit as any).notes || '').trim(),
        patientAge,
        patientGender: patient?.gender,
      });
    }, 500);
  }, [patientAnswer, onTranscriptUpdate, symptomExtraction, consultationMode, categorizedSymptoms, onSymptomsExtracted, segments, answeredQuestions, visit.chiefComplaint, patientAge, patient?.gender, modeQuestions]);

  // Remove a symptom from categorized symptoms
  const handleRemoveSymptom = useCallback((category: 'mental' | 'physical' | 'particular', index: number) => {
    const updated = { ...categorizedSymptoms };
    updated[category] = updated[category].filter((_, i) => i !== index);
    onSymptomsExtracted(updated);
  }, [categorizedSymptoms, onSymptomsExtracted]);

  const handleClearAllSymptoms = useCallback(() => {
    // Invalidate any in-flight extraction mutations.
    clearGenerationRef.current += 1;
    // Cancel any pending debounced extraction.
    if (extractionTimerRef.current) {
      clearTimeout(extractionTimerRef.current);
      extractionTimerRef.current = null;
    }
    // Mark all current final segments as already-processed so the next auto-extract
    // only considers NEW speech — not the conversation the user just cleared.
    lastExtractedSegCountRef.current = segments.filter(s => s.isFinal).length;
    onSymptomsExtracted({ mental: [], physical: [], particular: [] });
  }, [onSymptomsExtracted, segments]);

  // Progress percentage (50% for consultation stage)
  const progressPercent = 50;

  return (
    <div className="space-y-6 pp-fade-in relative container mx-auto">
      
      {/* 1. Progress bar at top */}
      <div className="w-full h-1.5 bg-[#E3E2DF] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2563EB]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Header row */}
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Clinical Consultation</h2>
          <p className="text-sm font-medium text-[#4A4A47]">Holistic Analysis & Symptom Extraction</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#2563EB] tracking-wider uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]"></span>
          </span>
          {MODE_CONFIG[consultationMode].label} <span className="opacity-50">|</span> {CALL_MODE_LABELS[callMode]}
        </span>
      </div>

      {/* GNM Progress Status (if available) */}
      {gnmAnalysis && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
          <Sparkles className="h-4 w-4 text-[#D97706] shrink-0" />
          <span className="text-[13px] text-[#92400E] font-bold flex-1">
            {conflict ? `Background complete — ${conflict.conflictType} confirmed` : 'AI analyzing conversation...'}
            {phases?.isRecurrentTrack && ` · ${phases.trackTriggers?.length || 0} rails found`}
            {mentalTraits?.length > 0 ? ` · Now extracting mental generals` : ''}
          </span>
          <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-md">
            {completedSections}/{totalSections}
          </span>
        </div>
      )}

      {/* 4. Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* LEFT COLUMN: chat-wrap */}
        <div className="space-y-4 min-w-0">

          {/* Call interface panel (AICaptureModule + CallInterfacePanel) */}
          <AICaptureModule
            visitId={visitId}
            aiContext={{
              specialty: visit.specialty,
              patientAge: patientAge,
              patientGender: patient?.gender,
              allergies: patient?.allergies,
            }}
            externalSegments={segments}
            isExternalRecording={binaryTranscriber.isRecording}
            onSoapGenerated={onSoapGenerated}
            onHomeopathyConsultGenerated={onHomeopathyConsultGenerated}
            onVoiceUsed={onVoiceUsed}
            onTranscriptUpdate={onTranscriptUpdate}
            onLabReportAttached={(filename, parsedText) => {
              // Reliable trigger — fires once per parsed PDF, post-render.
              labContextRef.current = labContextRef.current
                ? `${labContextRef.current}\n\n${parsedText}`
                : parsedText;
              const genAtDispatch = clearGenerationRef.current;
              symptomExtraction.mutate(
                {
                  consultationMode,
                  question: '__LAB_REPORT_ANALYSIS__',
                  answer: `Lab report "${filename}" attached — extract rubrics from abnormal findings only.`,
                  existingSymptoms: categorizedSymptoms,
                  labContext: labContextRef.current,
                },
                {
                  onSuccess: (result) => {
                    if (clearGenerationRef.current !== genAtDispatch) return;
                    if (result && (result.mental?.length || result.physical?.length || result.particular?.length)) {
                      onSymptomsExtracted(result);
                    } else {
                      toast({
                        title: 'No abnormal findings detected',
                        description: 'Lab parsed but no rubrics were extracted. Check that values are flagged as high/low or out of range.',
                        variant: 'default',
                      });
                    }
                  },
                  onError: (err) => {
                    toast({
                      title: 'Lab symptom extraction failed',
                      description: err instanceof Error ? err.message : 'Unknown error',
                      variant: 'error',
                    });
                  },
                },
              );
            }}
          >
            {({ AttachLabButton, uploadStatus, uploadedLabs: _uploadedLabs }) => {
              return (
              <CallInterfacePanel
                callMode={callMode}
                video={video}
                localSpeaker="DOCTOR"
                patientJoinLink={videoCallState?.patientJoinLink}
                transcript={segments}
                interimText={interimText}
                remoteInterimText={remoteInterimText}
                isTranscribing={binaryTranscriber.isRecording}
                isRemotePaused={false}
                error={null}
                onLeave={() => {
                  // Notify the patient that the doctor is ending the call
                  if (vcSocketRef.current?.connected) {
                    vcSocketRef.current.emit('call:leave');
                  }
                  // Also disconnect the video tracks
                  video?.leave?.();
                  onStartVideoCall?.(null as any);
                }}
                onPauseToggle={onPauseToggle}
                isPaused={isVideoPaused}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                aiQuestions={aiQuestions.questions}
                isGeneratingQuestions={aiQuestions.isGenerating}
                onQuestionAnswered={aiQuestions.markAnswered}
                transcriptHeaderActions={AttachLabButton}
                transcriptBottomActions={uploadStatus}
              />
            ); }}
          </AICaptureModule>

          {/* Patient's Answer area — pinned directly under the transcript (IN_PERSON only).
              For Audio/Video calls, patient answers via their own link in a separate tab
              and answers are captured automatically through live transcription. */}
          {callMode === 'IN_PERSON' && (
          <div className="pp-card overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#0F0F0E] tracking-tight flex items-center gap-2">
                <span className="text-[#2563EB]">
                  <Mic className="h-4 w-4" />
                </span>
                Patient's Input
              </span>
              <button
                onClick={() => {
                  setIsListeningForAnswer(prev => !prev);
                }}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-all uppercase tracking-wider",
                  isListeningForAnswer
                    ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] animate-pulse"
                    : "text-[#4A4A47] hover:text-[#2563EB] hover:bg-[#EFF6FF] border border-transparent"
                )}
              >
                {isListeningForAnswer ? <Mic className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isListeningForAnswer ? 'Stop Listening' : 'Listen'}
              </button>
            </div>
            <div className="p-4 space-y-3 bg-white">
              <textarea
                value={patientAnswer}
                onChange={(e) => setPatientAnswer(e.target.value)}
                placeholder={isListeningForAnswer ? "Listening to patient... speak clearly." : "Type patient's response here..."}
                rows={2}
                className={cn(
                  "w-full text-[13px] px-3 py-2 rounded-md border transition-all duration-200 resize-none outline-none font-medium text-[#0F0F0E]",
                  isListeningForAnswer
                    ? "bg-[#EFF6FF] border-[#BFDBFE] focus:ring-2 focus:ring-[#BFDBFE]/50 placeholder:text-[#3B82F6]"
                    : "bg-[#FAFAF8] border-[#E3E2DF] focus:bg-white focus:ring-2 focus:ring-[#EFF6FF] focus:border-[#2563EB] placeholder:text-[#888786]"
                )}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!patientAnswer.trim()}
                  className="pp-btn-primary h-8 px-4 text-[11px] uppercase tracking-wider"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
          )}

          {/* AI Suggested Questions panel */}
          <div className="pp-card overflow-hidden">
            <div className="px-5 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2563EB]" />
                <span className="text-[14px] font-bold text-[#0F0F0E] tracking-tight">AI Suggested Inquiries</span>
              </div>
              <button
                onClick={handleLoadModeQuestions}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A4A47] hover:text-[#2563EB] px-2 py-1 rounded-md hover:bg-[#EFF6FF] transition-colors uppercase"
              >
                <RefreshCw className={cn('h-3 w-3', modeQuestions.isPending && 'animate-spin')} />
                Regenerate
              </button>
            </div>

            <div className="p-4 space-y-2 bg-white">
              {/* Question items as clickable cards */}
              {allQuestions.filter(q => !q.answered).length === 0 && !modeQuestions.isPending && (
                <p className="text-[13px] text-[#888786] italic text-center py-4">
                  No questions available. Click Regenerate or start recording.
                </p>
              )}
              <div className="grid grid-cols-1 gap-2">
                {allQuestions.filter(q => !q.answered).map((q: any) => (
                  <div key={q.id} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => injectQuestion(q.question, q.id)}
                      className="group flex items-start gap-3 p-3 rounded-md bg-white border border-[#E3E2DF] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition-colors text-left"
                    >
                      <Star className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      <span className="text-[13px] text-[#0F0F0E] font-medium leading-snug">
                        {q.question}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#888786] group-hover:text-[#2563EB] mt-0.5 shrink-0 ml-auto transition-transform group-hover:translate-x-1" />
                    </button>
                    
                    {/* Render choice options if available */}
                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-6 mb-2">
                        {q.options.map((opt: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              injectQuestion(q.question, q.id);
                              setPatientAnswer(prev => prev ? `${prev}. ${opt}` : opt);
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-[#FAFAF8] border border-[#E3E2DF] rounded-[4px] text-[#4A4A47] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Custom question input row */}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#E3E2DF]">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQuestion.trim()) {
                      injectQuestion(customQuestion.trim());
                      setCustomQuestion('');
                    }
                  }}
                  placeholder="Type a custom question..."
                  className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-md border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] text-[#0F0F0E]"
                />
                <button
                  onClick={() => {
                    if (customQuestion.trim()) {
                      injectQuestion(customQuestion.trim());
                      setCustomQuestion('');
                    }
                  }}
                  className="pp-btn-secondary h-8 px-3 text-[11px] uppercase tracking-wider"
                >
                  Add
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Symptom Extraction panel */}
        <div className="space-y-0">
          <div className="pp-card sticky top-8">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E3E2DF] bg-[#FAFAF8] flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0F0F0E] tracking-tight flex items-center gap-2">
                <Search className="h-4 w-4 text-[#2563EB]" />
                Live Extraction
              </span>
              <button
                onClick={handleClearAllSymptoms}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] px-2 py-1 rounded-[4px] transition-colors uppercase tracking-wider"
              >
                <Trash2 className="h-3 w-3" />
                Clear All
              </button>
            </div>

            <div className="divide-y divide-[#E3E2DF] bg-white">
              {/* Mental Generals */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-[10px] font-bold text-[#4A4A47] uppercase tracking-widest">Mental Generals</span>
                  <span className="ml-auto text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                    {categorizedSymptoms.mental.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categorizedSymptoms.mental.length === 0 && (
                    <p className="text-[12px] text-[#888786] italic">None extracted yet</p>
                  )}
                  {categorizedSymptoms.mental.map((s, i) => (
                    <span
                      key={i}
                      className="group flex flex-1 w-full items-center gap-2 text-[12px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] px-3 py-2 rounded-md hover:border-[#BFDBFE] transition-colors cursor-default"
                    >
                      {s}
                      <button
                        onClick={() => handleRemoveSymptom('mental', i)}
                        className="ml-auto text-[#888786] hover:text-[#DC2626] p-1 rounded-sm shrink-0 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Physical Generals */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-[10px] font-bold text-[#4A4A47] uppercase tracking-widest">Physical Generals</span>
                  <span className="ml-auto text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                    {categorizedSymptoms.physical.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categorizedSymptoms.physical.length === 0 && (
                    <p className="text-[12px] text-[#888786] italic">None extracted yet</p>
                  )}
                  {categorizedSymptoms.physical.map((s, i) => (
                    <span
                      key={i}
                      className="group flex flex-1 w-full items-center gap-2 text-[12px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] px-3 py-2 rounded-md hover:border-[#BFDBFE] transition-colors cursor-default"
                    >
                      {s}
                      <button
                        onClick={() => handleRemoveSymptom('physical', i)}
                        className="ml-auto text-[#888786] hover:text-[#DC2626] p-1 rounded-sm shrink-0 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Particulars */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-[#2563EB]" />
                  <span className="text-[10px] font-bold text-[#4A4A47] uppercase tracking-widest">Particulars</span>
                  <span className="ml-auto text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                    {categorizedSymptoms.particular.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categorizedSymptoms.particular.length === 0 && (
                    <p className="text-[12px] text-[#888786] italic">None extracted yet</p>
                  )}
                  {categorizedSymptoms.particular.map((s, i) => (
                    <span
                      key={i}
                      className="group flex flex-1 w-full items-center gap-2 text-[12px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] px-3 py-2 rounded-md hover:border-[#BFDBFE] transition-colors cursor-default"
                    >
                      {s}
                      <button
                        onClick={() => handleRemoveSymptom('particular', i)}
                        className="ml-auto text-[#888786] hover:text-[#DC2626] p-1 rounded-sm shrink-0 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Symptom total */}
            <div className="px-4 py-2 bg-[#FAFAF8] border-t border-[#E3E2DF] text-center">
              <span className="text-[11px] font-bold text-[#888786] uppercase tracking-widest">{totalSymptoms} symptom{totalSymptoms !== 1 ? 's' : ''} extracted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons are in the bottom bar — no duplicate here */}

    </div>
  );
}
