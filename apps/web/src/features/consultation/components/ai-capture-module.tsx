import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Mic, Sparkles, Languages, Trash2, MessageSquare, Volume2, Loader2, X, Paperclip, FileText } from 'lucide-react';
import { useBinaryTranscriber } from '../../../hooks/use-binary-transcriber';
import { useCreateScribingSession, useAddSegments, useGenerateSoapFromTranscript, useHomeopathyConsult, useScribingSession } from '../../../hooks/use-scribing';
import { useParseLabReport, useAiTranslate } from '../../../hooks/use-ai-suggest';
import { toast } from '../../../hooks/use-toast';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import type { SoapSuggestion, HomeopathyConsultResult } from '../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../types/scribing';

export interface LiveExtraction { symptoms: string[]; duration: string; riskFactors: string[]; suggestedLabs: string[]; }

interface AICaptureModuleProps {
  visitId: string;
  aiContext?: { chiefComplaint?: string; specialty?: string; patientAge?: number; patientGender?: string; thermalReaction?: string; miasm?: string; allergies?: string[]; };
  onSoapGenerated: (suggestion: SoapSuggestion) => void;
  onHomeopathyConsultGenerated?: (result: HomeopathyConsultResult) => void;
  onVoiceUsed?: () => void; onLiveExtraction?: (extraction: LiveExtraction) => void; onTranscriptUpdate?: (text: string) => void;
  autoGenerateSoap?: boolean; autoGenerateThreshold?: number;
  externalSegments?: TranscriptSegmentLocal[]; isExternalRecording?: boolean;
  sttLanguage?: 'en-IN' | 'hi-IN';
  children?: (actions: { AttachLabButton: React.ReactNode; GenerateButton: React.ReactNode; uploadStatus: React.ReactNode; }) => React.ReactNode;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function performLiveExtraction(text: string): LiveExtraction {
  const lower = text.toLowerCase(); const symptoms: string[] = [];
  ['pain', 'fever', 'cough', 'cold', 'headache', 'weakness', 'nausea', 'vomiting', 'itching', 'swelling'].forEach(s => { if (lower.includes(s)) symptoms.push(s); });
  const durationMatch = text.match(/(\d+)\s*(days|weeks|months|years|hours)/i);
  const riskFactors: string[] = [], suggestedLabs: string[] = [];
  if (lower.includes('diabetes') || lower.includes('sugar')) riskFactors.push('Diabetes');
  if (lower.includes('bp') || lower.includes('hypertension')) riskFactors.push('Hypertension');
  if (lower.includes('heart') || lower.includes('cardiac')) riskFactors.push('Cardiac History');
  if (lower.includes('smoking') || lower.includes('smoke')) riskFactors.push('Smoker');
  if (lower.includes('fever') || lower.includes('infection')) suggestedLabs.push('CBC', 'CRP');
  if (lower.includes('sugar') || lower.includes('diabetes')) suggestedLabs.push('HbA1c', 'Blood Sugar');
  if (lower.includes('chest pain') || lower.includes('heart')) suggestedLabs.push('ECG');
  if (lower.includes('thyroid')) suggestedLabs.push('TFT');
  return { symptoms: [...new Set(symptoms)], duration: durationMatch ? durationMatch[0] : 'Not mentioned', riskFactors: [...new Set(riskFactors)], suggestedLabs: [...new Set(suggestedLabs)] };
}

export function AICaptureModule({ visitId, aiContext, onSoapGenerated: _onSoapGenerated, onHomeopathyConsultGenerated, onVoiceUsed, onLiveExtraction, onTranscriptUpdate, autoGenerateSoap = false, autoGenerateThreshold = 8, externalSegments, isExternalRecording, sttLanguage = 'hi-IN', children }: AICaptureModuleProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerLabel>('DOCTOR');
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploadedLabs, setUploadedLabs] = useState<Record<string, string>>({});

  const translateText = useAiTranslate();
  const parseLabReport = useParseLabReport();
  const nextSequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const sessionStartRef = useRef(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type !== 'application/pdf') { toast({ title: 'Unsupported format', description: 'Please select a PDF file.', variant: 'error' }); return; }
    parseLabReport.mutate(file, { onSuccess: text => { setUploadedLabs(prev => ({ ...prev, [file.name]: text })); toast({ title: 'Lab report processed', variant: 'success' }); }, onError: err => toast({ title: 'Processing failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' }) });
    e.target.value = '';
  };

  const createSession = useCreateScribingSession();
  const addSegments = useAddSegments();
  const generateSoap = useGenerateSoapFromTranscript();
  const homeopathyConsult = useHomeopathyConsult();
  const { data: existingSession } = useScribingSession(visitId);

  const onTranscriptResult = useCallback((result: any) => {
    if (result.isTranslationUpdate) { setSegments(prev => prev.map(seg => seg.text === result.text ? { ...seg, translatedText: result.translatedText } : seg)); return; }
    if (result.isFinal) {
      const segment: TranscriptSegmentLocal = { sequenceNumber: nextSequenceRef.current++, text: result.text, translatedText: result.translatedText, speaker: currentSpeaker, confidence: 0.95, startTimeMs: 0, endTimeMs: 0, isFinal: true, timestamp: result.timestamp };
      setSegments(prev => { const n = [...prev, segment]; onTranscriptUpdate?.(n.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n')); return n; });
      if (segment.text && sttLanguage !== 'en-IN') { translateText.mutate({ text: segment.text }, { onSuccess: res => { if (res.translated) setSegments(prev => prev.map(s => s.sequenceNumber === segment.sequenceNumber ? { ...s, translatedText: res.translated } : s)); } }); }
      setInterimText('');
      if (sessionId) addSegments.mutate({ sessionId, data: { segments: [segment] } });
    } else { setInterimText(result.text); }
  }, [currentSpeaker, sessionId, addSegments, onTranscriptUpdate]);

  const binaryTranscriber = useBinaryTranscriber({ visitId, engine: 'GOOGLE', languageCode: sttLanguage, onTranscript: onTranscriptResult, onError: err => toast({ title: 'Transcription Error', description: err.message || 'Connection lost', variant: 'error' }) });
  const effectiveSegments = externalSegments ?? segments;
  const isRecordingActive = isExternalRecording ?? binaryTranscriber.isRecording;

  useEffect(() => { if (existingSession?.id && existingSession.status === 'ACTIVE') setSessionId(existingSession.id); }, [existingSession?.id, existingSession?.status]);
  useEffect(() => { setSessionId(null); setSegments([]); setInterimText(''); setUploadedLabs({}); nextSequenceRef.current = 0; }, [visitId]);
  useEffect(() => {
    if (isRecordingActive) { sessionStartRef.current = Date.now(); timerRef.current = setInterval(() => setElapsedMs(Date.now() - sessionStartRef.current), 1000); }
    else { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined; } }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecordingActive]);
  useEffect(() => {
    if (segments.length > 0 && onLiveExtraction) {
      const fullText = segments.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n');
      onLiveExtraction(performLiveExtraction(fullText));
    }
  }, [segments, onLiveExtraction]);

  const startRecording = async () => {
    try {
      if (!sessionId) createSession.mutate({ visitId, language: sttLanguage }, { onSuccess: session => setSessionId(session.id) });
      binaryTranscriber.startRecording(); onVoiceUsed?.();
    } catch (err) { toast({ title: 'Failed to start recording', description: err instanceof Error ? err.message : 'Please check permissions', variant: 'error' }); }
  };
  const stopRecording = () => { binaryTranscriber.stopRecording(); setInterimText(''); if (autoGenerateSoap && effectiveSegments.length >= autoGenerateThreshold) setTimeout(() => handleGenerateSoap(), 1000); };
  const clearTranscript = () => { if (window.confirm('Clear current recording and transcript?')) { setSegments([]); setInterimText(''); nextSequenceRef.current = 0; } };
  const displaySegments = useMemo(() => effectiveSegments.map(seg => ({ ...seg, displayText: seg.translatedText || seg.text })), [effectiveSegments]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, [displaySegments.length]);

  const handleGenerateSoap = () => {
    const transcript = effectiveSegments.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`).join('\n');
    if (!transcript.trim()) { toast({ title: 'No conversation yet', description: 'Please wait for the transcript to build up.', variant: 'error' }); return; }
    if (onHomeopathyConsultGenerated) {
      homeopathyConsult.mutate({ transcript, visitId, patientAge: aiContext?.patientAge, patientGender: aiContext?.patientGender, thermalReaction: aiContext?.thermalReaction, miasm: aiContext?.miasm, labReports: uploadedLabs }, {
        onSuccess: result => { onHomeopathyConsultGenerated(result as HomeopathyConsultResult); toast({ title: 'Full Homeopathy Draft Generated', variant: 'success' }); },
        onError: err => toast({ title: 'Failed to generate homeopathy draft', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' }),
      });
    }
  };

  const labChipStyle = (filename: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#EEF2FF', color: '#3730A3', fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-card)', border: '1px solid #C7D2FE' });

  const attachLabNode = (
    <div style={{ position: 'relative' }}>
      <input type="file" accept="application/pdf" onChange={handleFileUpload} title="Upload Lab Report" disabled={parseLabReport.isPending} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
      <Button variant="outline" size="sm" disabled={parseLabReport.isPending} style={{ height: '2.25rem', gap: '0.375rem', borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
        {parseLabReport.isPending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)' }} /> : <Paperclip style={{ width: 14, height: 14, color: 'var(--color-primary-500)' }} />}
        <span style={{ fontSize: 'var(--font-size-xs)' }}>Attach Lab</span>
      </Button>
    </div>
  );

  const isPending = generateSoap.isPending || homeopathyConsult.isPending;
  const generateDraftNode = effectiveSegments.length > 0 ? (
    <Button onClick={handleGenerateSoap} disabled={isPending} style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white', boxShadow: '0 4px 14px rgba(79,70,229,0.35)', gap: '0.5rem', minHeight: '2.5rem', whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.3 }} size="sm">
      {isPending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', flexShrink: 0 }} /> : <Sparkles style={{ width: 14, height: 14, flexShrink: 0 }} />}
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isPending ? 'Analyzing transcript...' : 'Generate AI Draft'}</span>
    </Button>
  ) : null;

  const uploadStatusNode = Object.keys(uploadedLabs).length > 0 ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
      {Object.keys(uploadedLabs).map(filename => (
        <div key={filename} style={labChipStyle(filename)}>
          <FileText style={{ width: 14, height: 14 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '7.5rem' }}>{filename}</span>
          <button onClick={() => setUploadedLabs(prev => { const n = { ...prev }; delete n[filename]; return n; })} style={{ marginLeft: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, transition: 'color var(--transition-fast)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error-500)')} onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}>
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  if (children) return <>{children({ AttachLabButton: attachLabNode, GenerateButton: generateDraftNode, uploadStatus: uploadStatusNode })}</>;

  return (
    <Card style={{ overflow: 'hidden', border: '2px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', transition: 'box-shadow 0.2s' }}>
      <CardContent style={{ padding: '1rem', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={isRecordingActive ? stopRecording : startRecording} disabled={createSession.isPending || binaryTranscriber.isConnecting} variant={isRecordingActive ? 'destructive' : 'default'} size="lg"
                    style={{ height: '3rem', padding: '0 2rem', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-lg)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', ...(isRecordingActive ? { background: '#EF4444', outline: '4px solid rgba(254,202,202,0.5)' } : { background: 'var(--color-primary-600)' }) }}>
                    {isRecordingActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
                        <div style={{ position: 'relative', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'white', opacity: 0.75, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                          <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'inline-block' }} />
                        </div>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }}>Stop Recording</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
                        <Mic style={{ width: 20, height: 20, color: 'white' }} />
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white' }}>
                          {binaryTranscriber.isConnecting ? 'Connecting...' : 'Start Recording'}
                        </span>
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isRecordingActive ? 'Stop Recording' : 'Start Google STT Recording'}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isRecordingActive && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', display: 'inline-block' }} /> STREAMING
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatElapsed(elapsedMs)}</span>
              </div>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {isRecordingActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-disabled)', fontWeight: 600, marginRight: 4 }}>Speaker:</span>
                {(['DOCTOR', 'PATIENT'] as SpeakerLabel[]).map(role => (
                  <button key={role} onClick={() => setCurrentSpeaker(role)} style={{ padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)', transition: 'all var(--transition-fast)', border: 'none', cursor: 'pointer', ...(currentSpeaker === role ? (role === 'DOCTOR' ? { background: '#374151', color: 'white', boxShadow: 'var(--shadow-xs)' } : { background: 'var(--color-primary-600)', color: 'white', boxShadow: 'var(--shadow-xs)' }) : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }) }}>
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            {attachLabNode}
            <Button variant="ghost" size="sm" onClick={clearTranscript} disabled={segments.length === 0 || isRecordingActive} style={{ height: '2.25rem', gap: '0.375rem', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'inherit'; }}>
              <Trash2 style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 'var(--font-size-xs)' }}>Clear</span>
            </Button>
          </div>
        </div>

        {/* Transcript Viewer */}
        <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', background: 'var(--bg-surface-2)', padding: '0.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Volume2 style={{ width: 12, height: 12 }} /> Live Transcript (Google STT)
            </span>
            {segments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowTranscript(!showTranscript)} style={{ height: '1.5rem', fontSize: 10, color: 'var(--color-primary-600)', fontWeight: 700 }}>
                {showTranscript ? 'Hide Details' : 'View Full'}
              </Button>
            )}
          </div>
          <div ref={scrollContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '9.375rem', overflowY: 'auto', padding: '0 0.5rem 0.5rem' }}>
            {interimText && (
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, animation: 'pulse 2s infinite', color: '#4F46E5', background: 'rgba(238,242,255,0.5)', padding: '0.5rem', borderRadius: 'var(--radius-card)', border: '1px solid #C7D2FE', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                Listening: {interimText}
              </div>
            )}
            {displaySegments.length === 0 ? (
              <div style={{ height: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
                <MessageSquare style={{ width: 24, height: 24, color: 'var(--border-default)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)', fontStyle: 'italic', margin: 0 }}>Conversation will appear here once you start recording...</p>
              </div>
            ) : (
              displaySegments.map((seg) => (
                <div key={`${seg.speaker}-${seg.sequenceNumber}-${seg.timestamp}`}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '0.125rem 0.25rem', borderRadius: 4, flexShrink: 0, marginTop: 4, ...(seg.speaker === 'DOCTOR' ? { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' } : { background: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }) }}>
                      {seg.speaker === 'DOCTOR' ? 'DR' : 'PT'}
                    </span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.6, margin: 0, color: seg.isFinal ? 'var(--text-secondary)' : 'var(--text-disabled)', fontStyle: seg.isFinal ? 'normal' : 'italic' }}>{seg.displayText}</p>
                      {seg.translatedText && seg.translatedText !== seg.text && <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontStyle: 'italic', marginTop: 2 }}>Original: {seg.text}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attached Labs */}
        {uploadStatusNode}

        {/* Action Footer */}
        {segments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 500 }}>{segments.length} segments captured</span>
            <Button onClick={handleGenerateSoap} disabled={isPending} style={{ flex: 1, maxWidth: '20rem', justifyContent: 'center', background: 'linear-gradient(to right, #4F46E5, #7C3AED)', color: 'white', boxShadow: 'var(--shadow-md)', gap: '0.5rem' }} size="sm">
              {isPending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 14, height: 14 }} />}
              <span style={{ fontSize: 'var(--font-size-xs)' }}>{isPending ? 'Analyzing...' : 'Generate AI Consultation Draft'}</span>
            </Button>
          </div>
        )}
      </CardContent>

      {/* Full Transcript Overlay */}
      {showTranscript && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <Card style={{ width: '100%', maxWidth: '42rem', height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2xl)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Languages style={{ width: 16, height: 16, color: '#4F46E5' }} />
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', margin: 0 }}>Detailed Transcript</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTranscript(false)}><X style={{ width: 16, height: 16 }} /></Button>
            </div>
            <CardContent style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displaySegments.map(seg => (
                <div key={seg.sequenceNumber} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '85%', ...(seg.speaker === 'DOCTOR' ? { marginLeft: 'auto', alignItems: 'flex-end' } : { marginRight: 'auto', alignItems: 'flex-start' }) }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{seg.speaker}</span>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-2xl)', fontSize: 'var(--font-size-xs)', lineHeight: 1.6, boxShadow: 'var(--shadow-xs)', ...(seg.speaker === 'DOCTOR' ? { background: '#4F46E5', color: 'white', borderTopRightRadius: 4 } : { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTopLeftRadius: 4, color: 'var(--text-secondary)' }) }}>
                    {seg.displayText}
                  </div>
                  {seg.translatedText && seg.translatedText !== seg.text && <span style={{ fontSize: 9, color: 'var(--text-disabled)', fontStyle: 'italic' }}>Original: {seg.text}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
