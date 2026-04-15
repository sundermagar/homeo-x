import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Mic2, Square, Sparkles, Paperclip, FileText, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { TranscriptPanel } from './transcript-panel';
import { useBinaryTranscriber } from '../../../hooks/use-binary-transcriber';
import { useCreateScribingSession, useAddSegments, useEndSession, useGenerateSoapFromTranscript, useScribingSession } from '../../../hooks/use-scribing';
import { useParseLabReport } from '../../../hooks/use-ai-suggest';
import { toast } from '../../../hooks/use-toast';
import type { SoapSuggestion } from '../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../types/scribing';

interface AmbientScribeProps {
  visitId: string;
  aiContext?: { chiefComplaint?: string; specialty?: string; patientAge?: number; patientGender?: string; allergies?: string[]; };
  onSoapGenerated: (suggestion: SoapSuggestion) => void;
  onTranscriptUpdate?: (text: string) => void;
  onWrapUp?: () => void;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const SPEAKER_STYLE: Record<SpeakerLabel, { active: React.CSSProperties; inactive: React.CSSProperties }> = {
  DOCTOR:  { active: { background: '#1D4ED8', color: 'white' }, inactive: { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' } },
  PATIENT: { active: { background: '#059669', color: 'white' }, inactive: { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' } },
  UNKNOWN: { active: { background: '#6B7280', color: 'white' }, inactive: { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' } },
};

export function AmbientScribe({ visitId, aiContext, onSoapGenerated, onTranscriptUpdate, onWrapUp }: AmbientScribeProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerLabel>('DOCTOR');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploadedLabs, setUploadedLabs] = useState<Record<string, string>>({});
  const timerRef = useRef<any>(null);
  const sessionStartRef = useRef(0);
  const nextSequenceRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const createSession = useCreateScribingSession();
  const addSegments = useAddSegments();
  const endSession = useEndSession();
  const generateSoap = useGenerateSoapFromTranscript();
  const parseLabReport = useParseLabReport();
  const { data: existingSession } = useScribingSession(visitId);

  useEffect(() => { if (existingSession?.id) setSessionId(existingSession.id); }, [existingSession?.id]);

  const onTranscriptResult = useCallback((result: any) => {
    if (result.isTranslationUpdate) {
      setSegments(prev => prev.map(seg => seg.text === result.text ? { ...seg, translatedText: result.translatedText } : seg));
      return;
    }
    if (result.isFinal) {
      const segment: TranscriptSegmentLocal = {
        sequenceNumber: nextSequenceRef.current++, text: result.text, translatedText: result.translatedText,
        speaker: currentSpeaker, confidence: 0.95, startTimeMs: 0, endTimeMs: 0, isFinal: true, timestamp: result.timestamp,
      };
      setSegments(prev => {
        const n = [...prev, segment];
        onTranscriptUpdate?.(n.map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.text}`).join('\n'));
        return n;
      });
      setInterimText('');
      if (sessionId) addSegments.mutate({ sessionId, data: { segments: [segment] } });
    } else {
      setInterimText(result.translatedText || result.text);
    }
  }, [currentSpeaker, sessionId, addSegments, onTranscriptUpdate]);

  const binaryTranscriber = useBinaryTranscriber({
    visitId, engine: 'GOOGLE', onTranscript: onTranscriptResult,
    onError: (err) => toast({ title: 'Transcription Error', description: err.message || 'Connection lost', variant: 'error' }),
  });
  const isRecording = binaryTranscriber.isRecording;

  useEffect(() => {
    if (isRecording) {
      sessionStartRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - sessionStartRef.current), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments.length, interimText]);

  const handleStart = async () => {
    try {
      if (!sessionId) {
        const session = await createSession.mutateAsync({ visitId });
        if (session) setSessionId(session.id);
      }
      binaryTranscriber.startRecording();
    } catch (err) {
      toast({ title: 'Failed to start scribing', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' });
    }
  };

  const handleStop = () => {
    binaryTranscriber.stopRecording();
    setInterimText('');
    if (sessionId) endSession.mutate(sessionId);
  };

  const handleGenerateSoap = () => {
    if (!sessionId) return;
    generateSoap.mutate({
      sessionId,
      data: { chiefComplaint: aiContext?.chiefComplaint, specialty: aiContext?.specialty, patientAge: aiContext?.patientAge, patientGender: aiContext?.patientGender, allergies: aiContext?.allergies }
    }, {
      onSuccess: (result) => { onSoapGenerated(result); toast({ title: 'SOAP note generated', variant: 'success' }); },
      onError: (err) => toast({ title: 'Failed to generate SOAP', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' }),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type !== 'application/pdf') { toast({ title: 'Unsupported format', description: 'Please select a PDF file.', variant: 'error' }); return; }
    parseLabReport.mutate(file, {
      onSuccess: text => { setUploadedLabs(prev => ({ ...prev, [file.name]: text })); toast({ title: 'Lab report processed', variant: 'success' }); },
      onError: err => toast({ title: 'Processing failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'error' }),
    });
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-light)', overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
    }}>

      {/* ── TOP: Record control ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem 1.5rem', background: 'var(--bg-surface-2)',
        borderBottom: '1px solid var(--border-light)', gap: '1rem',
      }}>
        {/* Mic pulse button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRecording && (
            <>
              <span style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
              <span style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.3s' }} />
            </>
          )}
          <button
            onClick={isRecording ? handleStop : handleStart}
            disabled={createSession.isPending || binaryTranscriber.isConnecting}
            style={{
              position: 'relative', width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              background: isRecording ? '#EF4444' : '#14B8A6',
              boxShadow: isRecording ? '0 0 0 0 rgba(239,68,68,0.4), var(--shadow-lg)' : '0 0 0 6px rgba(20,184,166,0.15), var(--shadow-lg)',
              transform: isRecording ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {isRecording
              ? <Square style={{ width: 20, height: 20, color: 'white' }} />
              : binaryTranscriber.isConnecting
                ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Mic style={{ width: 24, height: 24, color: 'white' }} />
            }
          </button>
        </div>

        {/* State label */}
        {!isRecording ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 0.5rem' }}>TAP TO BEGIN</p>
            <button
              onClick={handleStart}
              disabled={createSession.isPending || binaryTranscriber.isConnecting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.5rem',
                borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
                background: '#14B8A6', color: 'white', fontWeight: 700, fontSize: 'var(--font-size-sm)',
                boxShadow: 'var(--shadow-md)', transition: 'all 0.2s',
              }}
            >
              <Mic style={{ width: 16, height: 16 }} />
              {binaryTranscriber.isConnecting ? 'Connecting...' : 'Start Recording'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                LIVE · {formatElapsed(elapsedMs)}
              </span>
            </div>
            {/* Speaker toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-full)', padding: '0.25rem', border: '1px solid var(--border-light)' }}>
              {(['DOCTOR', 'PATIENT'] as SpeakerLabel[]).map(role => (
                <button key={role} onClick={() => setCurrentSpeaker(role)} style={{
                  padding: '0.25rem 0.875rem', fontSize: 11, fontWeight: 600,
                  borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  ...(currentSpeaker === role ? SPEAKER_STYLE[role].active : SPEAKER_STYLE[role].inactive),
                }}>
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MIDDLE: Transcript + Labs ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Transcript header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Mic2 style={{ width: 13, height: 13, color: 'var(--text-disabled)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-disabled)' }}>Transcript</span>
            {segments.length > 0 && <span style={{ fontSize: 9, padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-full)', background: 'var(--color-success-100)', color: 'var(--color-success-700)', fontWeight: 700 }}>{segments.length}</span>}
          </div>
          <div style={{ position: 'relative' }}>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={parseLabReport.isPending}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
            <button disabled={parseLabReport.isPending} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-default)', background: 'var(--bg-card)',
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all var(--transition-fast)', boxShadow: 'var(--shadow-xs)',
            }}>
              <Paperclip style={{ width: 12, height: 12 }} />
              {parseLabReport.isPending ? 'Processing...' : 'Attach Lab'}
            </button>
          </div>
        </div>

        {/* Transcript scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {/* Lab chips */}
          {Object.keys(uploadedLabs).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {Object.keys(uploadedLabs).map(fname => (
                <div key={fname} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#EEF2FF', color: '#3730A3', fontSize: 10, fontWeight: 600, border: '1px solid #C7D2FE' }}>
                  <FileText style={{ width: 11, height: 11 }} />
                  <span style={{ maxWidth: '6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</span>
                  <button onClick={() => setUploadedLabs(prev => { const n = { ...prev }; delete n[fname]; return n; })} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}>
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Transcript content */}
          <TranscriptPanel segments={segments} interimText={interimText} isRecording={isRecording} />

          {/* Empty state */}
          {!isRecording && segments.length === 0 && !interimText && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '8rem', textAlign: 'center', gap: '0.375rem', color: 'var(--text-disabled)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <path d="M4 6h16M4 10h16M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 12, margin: 0 }}>Listening for conversation...</p>
            </div>
          )}

          {isRecording && segments.length === 0 && !interimText && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '8rem', textAlign: 'center', gap: '0.375rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'baseline' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#14B8A6', display: 'inline-block', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', margin: 0 }}>Listening for conversation...</p>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Generate SOAP row */}
        {segments.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)' }}>
            <Button onClick={handleGenerateSoap} disabled={generateSoap.isPending || isRecording} size="sm"
              style={{ width: '100%', justifyContent: 'center', background: '#4F46E5', color: 'white', gap: '0.375rem', fontWeight: 700 }}>
              <Sparkles style={{ width: 14, height: 14 }} />
              {generateSoap.isPending ? 'Generating SOAP...' : 'Generate SOAP Report'}
            </Button>
          </div>
        )}
      </div>

      {/* ── BOTTOM: Wrap Up CTA ── */}
      <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <button
          onClick={onWrapUp}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-card)', border: 'none', cursor: 'pointer',
            background: '#14B8A6', color: 'white', fontWeight: 800, fontSize: 'var(--font-size-sm)',
            textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0F9488')}
          onMouseLeave={e => (e.currentTarget.style.background = '#14B8A6')}
        >
          WRAP UP
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
