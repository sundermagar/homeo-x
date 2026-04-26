import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Mic,
  Languages,
  Trash2,
  MessageSquare,
  Volume2,
  Loader2,
  X,
  Paperclip,
  FileText
} from 'lucide-react';
import { useBinaryTranscriber } from '../../../hooks/use-binary-transcriber';
import {
  useCreateScribingSession,
  useAddSegments,
  useScribingSession,
} from '../../../hooks/use-scribing';
import { useParseLabReport } from '../../../hooks/use-ai-suggest';
import { toast } from '../../../hooks/use-toast';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent
} from '../../../components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';

import type { SoapSuggestion, HomeopathyConsultResult } from '../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../types/scribing';

// ─── Types ───

export interface LiveExtraction {
  symptoms: string[];
  duration: string;
  riskFactors: string[];
  suggestedLabs: string[];
}

interface AICaptureModuleProps {
  visitId: string;
  aiContext?: {
    chiefComplaint?: string;
    specialty?: string;
    patientAge?: number;
    patientGender?: string;
    thermalReaction?: string;
    miasm?: string;
    allergies?: string[];
    consultationMode?: 'acute' | 'chronic' | 'followup';
  };
  onSoapGenerated: (suggestion: SoapSuggestion) => void;
  onHomeopathyConsultGenerated?: (result: HomeopathyConsultResult) => void;
  /** Callback to track voice usage for metrics */
  onVoiceUsed?: () => void;
  /** Callback with live extraction data for parent AI insight cards */
  onLiveExtraction?: (extraction: LiveExtraction) => void;
  /** Callback for real-time transcript updates */
  onTranscriptUpdate?: (text: string) => void;

  /** Auto-generate SOAP when recording stops (AI-first mode) */
  autoGenerateSoap?: boolean;
  /** Minimum segments before auto-generating SOAP (default: 8) */
  autoGenerateThreshold?: number;

  /** External segments from parent (e.g. from useBinaryTranscriber lifted to parent level) */
  externalSegments?: TranscriptSegmentLocal[];
  /** Whether external recording is active */
  isExternalRecording?: boolean;

  /** Fired exactly once per lab upload, AFTER the PDF has been parsed.
   *  Use this to trigger downstream actions (e.g. symptom extraction). */
  onLabReportAttached?: (filename: string, parsedText: string) => void;

  sttLanguage?: 'en-IN' | 'hi-IN';
  children?: (actions: {
    AttachLabButton: React.ReactNode;
    uploadStatus: React.ReactNode;
    uploadedLabs: Record<string, string>;
  }) => React.ReactNode;
}

// ─── Helper Functions ───

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function performLiveExtraction(text: string): LiveExtraction {
  const lower = text.toLowerCase();

  const symptoms: string[] = [];
  const commonSymptoms = ['pain', 'fever', 'cough', 'cold', 'headache', 'weakness', 'nausea', 'vomiting', 'itching', 'swelling'];
  commonSymptoms.forEach(s => {
    if (lower.includes(s)) symptoms.push(s);
  });

  const durationMatch = text.match(/(\d+)\s*(days|weeks|months|years|hours)/i);
  const duration = durationMatch ? durationMatch[0] : 'Not mentioned';

  const riskFactors: string[] = [];
  if (lower.includes('diabetes') || lower.includes('sugar')) riskFactors.push('Diabetes');
  if (lower.includes('bp') || lower.includes('hypertension')) riskFactors.push('Hypertension');
  if (lower.includes('heart') || lower.includes('cardiac')) riskFactors.push('Cardiac History');
  if (lower.includes('smoking') || lower.includes('smoke')) riskFactors.push('Smoker');

  const suggestedLabs: string[] = [];
  if (lower.includes('fever') || lower.includes('infection')) suggestedLabs.push('CBC', 'CRP');
  if (lower.includes('sugar') || lower.includes('diabetes')) suggestedLabs.push('HbA1c', 'Blood Sugar');
  if (lower.includes('chest pain') || lower.includes('heart')) suggestedLabs.push('ECG');
  if (lower.includes('thyroid')) suggestedLabs.push('TFT');

  return {
    symptoms: [...new Set(symptoms)],
    duration,
    riskFactors: [...new Set(riskFactors)],
    suggestedLabs: [...new Set(suggestedLabs)],
  };
}

// ─── Component ───

export function AICaptureModule({
  visitId,
  aiContext: _aiContext,
  onSoapGenerated: _onSoapGenerated,
  onHomeopathyConsultGenerated: _onHomeopathyConsultGenerated,
  onVoiceUsed,
  onLiveExtraction,
  onTranscriptUpdate,
  autoGenerateSoap: _autoGenerateSoap = false,
  autoGenerateThreshold: _autoGenerateThreshold = 8,
  externalSegments,
  isExternalRecording,
  onLabReportAttached,
  sttLanguage = 'hi-IN',
  children,
}: AICaptureModuleProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerLabel>('DOCTOR');
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [uploadedLabs, setUploadedLabs] = useState<Record<string, string>>({});

  const parseLabReport = useParseLabReport();
  const nextSequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const sessionStartRef = useRef(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast({ title: 'Unsupported format', description: 'Please select a PDF file.', variant: 'error' });
      return;
    }

    // The hook expects a File and converts to base64 internally before
    // POSTing { filename, mimeType, base64 } as JSON to /api/ai/parse-lab-report.
    // Don't wrap in FormData — that breaks FileReader.readAsDataURL.
    parseLabReport.mutate(file, {
      onSuccess: (text) => {
        const safeText = text || '';
        setUploadedLabs(prev => ({ ...prev, [file.name]: safeText }));
        toast({ title: 'Lab report processed', variant: 'success' });
        // Fire callback so the parent can trigger symptom extraction reliably
        // (instead of side-effecting during render via the children prop).
        if (safeText.trim()) {
          try { onLabReportAttached?.(file.name, safeText); } catch (e) { console.error('[AICaptureModule] onLabReportAttached failed', e); }
        } else {
          toast({ title: 'Empty lab parse', description: 'No text extracted from PDF — symptom extraction skipped.', variant: 'error' });
        }
      },
      onError: (err) => {
        toast({ title: 'Processing failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
      }
    });

    e.target.value = '';
  };

  // Backend hooks
  const createSession = useCreateScribingSession();
  const addSegments = useAddSegments();
  const { data: existingSession } = useScribingSession(visitId);

  // ─── Google STT Transcription via useBinaryTranscriber ───
  // Simple pipeline: Mic → AudioWorklet PCM → WebSocket → Google STT → text + translate → here

  const onTranscriptResult = useCallback((result: any) => {
    // Handle async translation updates: update existing segment, don't add new one
    if (result.isTranslationUpdate) {
      setSegments(prev =>
        prev.map(seg =>
          seg.text === result.text
            ? { ...seg, translatedText: result.translatedText }
            : seg
        )
      );
      return;
    }

    if (result.isFinal) {
      const segment: TranscriptSegmentLocal = {
        sequenceNumber: nextSequenceRef.current++,
        text: result.text,
        translatedText: result.translatedText,
        speaker: currentSpeaker,
        confidence: 0.95,
        startTimeMs: 0,
        endTimeMs: 0,
        isFinal: true,
        timestamp: result.timestamp,
      };

      setSegments(prev => {
        const newSegments = [...prev, segment];

        // Notify parent of transcript updates
        const fullText = newSegments
          .map((s) => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
          .join('\n');
        onTranscriptUpdate?.(fullText);

        return newSegments;
      });

      setInterimText('');

      // Sync with backend scribing session
      if (sessionId) {
        addSegments.mutate({
          sessionId,
          data: { segments: [segment] },
        });
      }
    } else {
      // Interim text — show as live typing indicator
      setInterimText(result.text);
    }
  }, [currentSpeaker, sessionId, addSegments, onTranscriptUpdate]);

  const binaryTranscriber = useBinaryTranscriber({
    visitId,
    engine: 'GOOGLE',
    languageCode: sttLanguage,
    onTranscript: onTranscriptResult,
    onError: (err) => {
      toast({
        title: 'Transcription Error',
        description: err.message || 'Connection lost to server',
        variant: 'error'
      });
    },
  });

  // Use external segments if provided (children mode), otherwise use internal segments
  const effectiveSegments = externalSegments ?? segments;
  const isRecordingActive = isExternalRecording ?? binaryTranscriber.isRecording;

  // Load existing session
  useEffect(() => {
    if (existingSession?.id && existingSession.status === 'ACTIVE') {
      setSessionId(existingSession.id);
    }
  }, [existingSession?.id, existingSession?.status]);

  // Reset everything when visitId changes (new patient)
  useEffect(() => {
    setSessionId(null);
    setSegments([]);
    setInterimText('');
    setUploadedLabs({});
    nextSequenceRef.current = 0;
  }, [visitId]);

  // Timer for elapsed time
  useEffect(() => {
    if (isRecordingActive) {
      sessionStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - sessionStartRef.current);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecordingActive]);

  // Live extraction from transcript
  useEffect(() => {
    if (segments.length > 0) {
      const fullText = segments
        .map((s) => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
        .join('\n');

      if (onLiveExtraction) {
        const extraction = performLiveExtraction(fullText);
        onLiveExtraction(extraction);
      }
    }
  }, [segments, onLiveExtraction]);

  const startRecording = async () => {
    try {
      // Create scribing session if none exists
      if (!sessionId) {
        createSession.mutate({ visitId, language: sttLanguage }, {
          onSuccess: (session) => {
            setSessionId(session.id);
          }
        });
      }
      binaryTranscriber.startRecording();
      onVoiceUsed?.();
    } catch (err) {
      toast({
        title: 'Failed to start recording',
        description: err instanceof Error ? err.message : 'Please check permissions',
        variant: 'error',
      });
    }
  };

  const stopRecording = () => {
    binaryTranscriber.stopRecording();
    setInterimText('');
  };

  const clearTranscript = () => {
    if (window.confirm('Clear current recording and transcript?')) {
      setSegments([]);
      setInterimText('');
      nextSequenceRef.current = 0;
    }
  };

  // Display segments — prefer translatedText if available
  const displaySegments = useMemo(() => {
    return effectiveSegments.map((seg) => ({
      ...seg,
      displayText: seg.translatedText || seg.text,
    }));
  }, [effectiveSegments]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displaySegments.length]);


  const attachLabNode = (
    <div className="relative">
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        title="Upload Lab Report"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={parseLabReport.isPending}
      />
      <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 border-gray-200 dark:border-gray-800 bg-white" disabled={parseLabReport.isPending}>
        {parseLabReport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <Paperclip className="h-3.5 w-3.5 text-indigo-500" />}
        <span className="text-[11px] sm:text-xs">Attach Lab</span>
      </Button>
    </div>
  );


  const uploadStatusNode = Object.keys(uploadedLabs).length > 0 ? (
    <div className="flex flex-wrap gap-2 py-1">
      {Object.keys(uploadedLabs).map(filename => (
        <div key={filename} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
          <FileText className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{filename}</span>
          <button onClick={() => setUploadedLabs(prev => { const n = {...prev}; delete n[filename]; return n; })} className="ml-1 hover:text-red-500"><X className="h-3 w-3"/></button>
        </div>
      ))}
    </div>
  ) : null;

  if (children) {
    return <>{children({ AttachLabButton: attachLabNode, uploadStatus: uploadStatusNode, uploadedLabs })}</>;
  }

  return (
    <Card className="overflow-hidden border-2 border-purple-100 dark:border-purple-900 shadow-lg transition-all hover:shadow-xl">


      <CardContent className="p-4 space-y-4 bg-white dark:bg-gray-950">
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* When recording is externally controlled by the consultation-stage
                    (auto-started on mount), suppress the manual button — show only a
                    status pill. This matches the Ai-Consultation UX where the doctor
                    never has to click a "Start Recording" button. */}
                {isExternalRecording !== undefined ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E3E2DF]">
                    {isRecordingActive ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                          Recording · {formatElapsed(elapsedMs)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#888786]">
                          Mic preparing…
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={isRecordingActive ? stopRecording : startRecording}
                          disabled={createSession.isPending || binaryTranscriber.isConnecting}
                          variant={isRecordingActive ? 'destructive' : 'default'}
                          size="lg"
                          className={`h-11 sm:h-12 flex-1 sm:flex-none px-6 sm:px-8 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                            isRecordingActive
                              ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-100 dark:ring-red-900/20'
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200 dark:shadow-none'
                            }`}
                        >
                          {isRecordingActive ? (
                            <div className="flex items-center gap-2 px-1">
                              <div className="relative flex h-3 w-3 items-center justify-center">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                              </div>
                              <span className="text-sm font-bold uppercase tracking-wider">
                                Stop Recording
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-1">
                              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                                {binaryTranscriber.isConnecting ? 'Connecting...' : 'Start Recording'}
                              </span>
                            </div>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRecordingActive ? 'Stop Recording' : 'Start Google STT Recording'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {isRecordingActive && isExternalRecording === undefined && (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      STREAMING
                    </span>
                    <span className="text-[10px] text-gray-500 tabular-nums font-medium">
                      {formatElapsed(elapsedMs)}
                    </span>
                  </div>
                )}
              </div>

            {/* Speaker toggle + actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
              {isRecordingActive && (
                <div className="flex items-center gap-1 mr-2">
                  <span className="text-[10px] uppercase text-gray-400 font-semibold mr-1">Speaker:</span>
                  {(['DOCTOR', 'PATIENT'] as SpeakerLabel[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => setCurrentSpeaker(role)}
                      className={`px-3 py-1 text-xs rounded-full transition-all ${
                        currentSpeaker === role
                          ? role === 'DOCTOR'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  title="Upload Lab Report"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={parseLabReport.isPending}
                />
                <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 border-gray-200 dark:border-gray-800" disabled={parseLabReport.isPending}>
                  {parseLabReport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <Paperclip className="h-3.5 w-3.5 text-indigo-500" />}
                  <span className="text-[11px] sm:text-xs">Attach Lab</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 sm:h-9 gap-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                onClick={clearTranscript}
                disabled={segments.length === 0 || isRecordingActive}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-[11px] sm:text-xs">Clear</span>
              </Button>
            </div>
          </div>

          {/* Transcript Viewer */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/30 p-2 overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3" />
                  Live Transcript (Google STT)
                </span>
                {segments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    {showTranscript ? 'Hide Details' : 'View Full'}
                  </Button>
                )}
              </div>

              <div ref={scrollContainerRef} className={`space-y-2 max-h-[150px] overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-900`}>
                {interimText && (
                  <div className="text-sm font-medium animate-pulse text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-2 italic">
                    Listening: {interimText}
                  </div>
                )}
                {displaySegments.length === 0 ? (
                  <div className="h-20 flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare className="h-6 w-6 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400 italic">Conversation will appear here once you start recording...</p>
                  </div>
                ) : (
                  displaySegments.map((seg) => (
                    <div key={`${seg.speaker}-${seg.sequenceNumber}-${seg.timestamp}`} className="group relative">
                      <div className="flex gap-2">
                        <span className={`text-[8px] font-bold px-1 rounded h-fit mt-1 shrink-0 ${seg.speaker === 'DOCTOR' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                          }`}>
                          {seg.speaker === 'DOCTOR' ? 'DR' : 'PT'}
                        </span>
                        <div className="flex-1 flex flex-col">
                          <p className={`text-xs leading-relaxed ${seg.isFinal ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic'}`}>
                            {seg.displayText}
                          </p>
                          {seg.translatedText && seg.translatedText !== seg.text && (
                            <span className="text-[10px] text-gray-400 italic mt-0.5">
                              Original: {seg.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          {/* Attached Labs Viewer */}
          {Object.keys(uploadedLabs).length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              {Object.keys(uploadedLabs).map(filename => (
                <div key={filename} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">{filename}</span>
                  <button onClick={() => setUploadedLabs(prev => { const n = {...prev}; delete n[filename]; return n; })} className="ml-1 hover:text-red-500"><X className="h-3 w-3"/></button>
                </div>
              ))}
            </div>
          )}

          {/* Segment count */}
          {segments.length > 0 && (
            <div className="flex items-center pt-2 border-t border-gray-100 dark:border-gray-900">
              <span className="text-[10px] text-gray-400 font-medium">
                {segments.length} segments captured
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Full Transcript Overlay */}
      {showTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase">Detailed Transcript</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTranscript(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {displaySegments.map((seg) => (
                <div key={seg.sequenceNumber} className={`flex flex-col gap-1 max-w-[85%] ${seg.speaker === 'DOCTOR' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    {seg.speaker}
                  </span>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${seg.speaker === 'DOCTOR'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-tl-none'
                    }`}>
                    {seg.displayText}
                  </div>
                  {seg.translatedText && seg.translatedText !== seg.text && (
                    <span className="text-[9px] text-gray-400 italic">
                      Original: {seg.text}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
