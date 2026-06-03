import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mic, MicOff, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api-client';
import { API } from '../../../lib/constants';
import { useBinaryTranscriber, type TranscriptionResult } from '../../../hooks/use-binary-transcriber';
import { toast } from '../../../hooks/use-toast';

interface Turn {
  speaker: 'DOCTOR' | 'PATIENT';
  text: string;
  ts: string;
}

interface AiFollowupTranscriptPanelProps {
  visitId: string;
  patientAge?: number;
  patientGender?: string;
  chiefComplaint?: string;
  initialSummary?: string;
  onSummaryChange: (summary: string) => void;
  onTranscriptChange?: (transcript: string) => void;
}

export function AiFollowupTranscriptPanel({
  visitId,
  patientAge,
  patientGender,
  chiefComplaint,
  initialSummary,
  onSummaryChange,
  onTranscriptChange,
}: AiFollowupTranscriptPanelProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'DOCTOR' | 'PATIENT'>('DOCTOR');
  const [summary, setSummary] = useState(initialSummary || '');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const now = () =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleTranscript = useCallback((result: TranscriptionResult) => {
    // ── Async English translation arrives as a separate update ──
    // Backend emits 'transcription:translation' AFTER the final result, with
    // isTranslationUpdate=true. Replace the existing turn (matched by original
    // text) with the English version so the transcript always reads in English.
    if (result.isTranslationUpdate) {
      const en = (result.translatedText || '').trim();
      const orig = (result.text || '').trim();
      if (!en || !orig) return;
      setTurns((prev) => prev.map((t) => (t.text === orig ? { ...t, text: en } : t)));
      return;
    }

    // Always prefer English; fall back to original spoken text only until the
    // async translation update lands.
    const text = (result.translatedText || result.text || '').trim();
    if (!text) return;

    if (result.isFinal) {
      setTurns((prev) => [...prev, { speaker: activeSpeaker, text, ts: now() }]);
      setInterim('');
    } else {
      setInterim(text);
    }
  }, [activeSpeaker]);

  const transcriber = useBinaryTranscriber({
    visitId: visitId || 'followup',
    languageCode: 'hi-IN',
    role: 'DOCTOR',
    onTranscript: handleTranscript,
    onError: (err) => {
      console.error('STT error:', err);
      toast({ title: 'Recording error', description: String(err?.message || err), variant: 'error' });
    },
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, interim]);

  // Surface transcript string upward whenever it changes
  useEffect(() => {
    const transcript = turns
      .map((t) => `${t.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${t.text}`)
      .join('\n');
    onTranscriptChange?.(transcript);
  }, [turns, onTranscriptChange]);

  const handleToggleRecording = async () => {
    if (transcriber.isRecording) {
      transcriber.stopRecording();
      return;
    }
    try {
      await transcriber.startRecording();
    } catch (err: any) {
      toast({
        title: 'Could not start recording',
        description: err?.message || 'Microphone permission denied?',
        variant: 'error',
      });
    }
  };

  const handleClearTranscript = () => {
    setTurns([]);
    setInterim('');
  };

  const summarizeMutation = useMutation({
    mutationFn: (transcript: string) =>
      api.post<{ summary: string }>(API.AI.FOLLOWUP_SUMMARIZE, {
        transcript,
        patientAge,
        patientGender,
        chiefComplaint,
      }),
    onSuccess: (data) => {
      const next = (data?.summary || '').trim();
      if (!next) {
        toast({ title: 'No summary generated', description: 'Try recording more of the conversation.', variant: 'error' });
        return;
      }
      setSummary(next);
      onSummaryChange(next);
    },
    onError: (err: any) => {
      toast({ title: 'Analysis failed', description: err?.message || 'Try again.', variant: 'error' });
    },
  });

  const handleAnalyse = () => {
    const transcript = turns
      .map((t) => `${t.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${t.text}`)
      .join('\n');
    if (transcript.trim().length < 20) {
      toast({ title: 'Not enough transcript', description: 'Record more of the conversation first.', variant: 'error' });
      return;
    }
    summarizeMutation.mutate(transcript);
  };

  const canAnalyse = turns.length > 0 && !transcriber.isRecording && !summarizeMutation.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Recording controls */}
      <div
        style={{
          padding: '14px 16px',
          background: transcriber.isRecording ? '#FEF2F2' : '#F8FAFC',
          border: `1px solid ${transcriber.isRecording ? '#FCA5A5' : '#E2E8F0'}`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={handleToggleRecording}
          disabled={transcriber.isConnecting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '20px',
            border: 'none',
            background: transcriber.isRecording ? '#DC2626' : '#2563EB',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: transcriber.isConnecting ? 'wait' : 'pointer',
            boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)',
            transition: 'all 0.2s ease',
          }}
          title={transcriber.isRecording ? 'Stop recording' : 'Start recording'}
        >
          {transcriber.isConnecting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Connecting...</span>
            </>
          ) : transcriber.isRecording ? (
            <>
              <MicOff size={16} />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic size={16} />
              <span>Start Recording</span>
            </>
          )}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
            {transcriber.isRecording ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Recording…
              </span>
            ) : (
              'Live transcription'
            )}
          </div>
        </div>
      </div>

      {/* Transcript card */}
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          background: 'white',
          minHeight: '180px',
          maxHeight: '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Transcript
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', background: 'white', border: '1px solid #E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
            {turns.length} {turns.length === 1 ? 'turn' : 'turns'}
          </span>
          <button
            onClick={handleClearTranscript}
            disabled={turns.length === 0}
            style={{
              marginLeft: 'auto',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: turns.length === 0 ? '#CBD5E1' : '#DC2626',
              background: 'transparent',
              border: 'none',
              cursor: turns.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderRadius: '4px',
            }}
            title="Clear transcript"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>

        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {turns.length === 0 && !interim && (
            <div style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              Press "Start Recording" to start transcribing the conversation.
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: t.speaker === 'DOCTOR' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B' }}>
                {t.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'} · {t.ts}
              </div>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  background: t.speaker === 'DOCTOR' ? '#2563EB' : '#F1F5F9',
                  color: t.speaker === 'DOCTOR' ? 'white' : '#0F172A',
                }}
              >
                {t.text}
              </div>
            </div>
          ))}
          {interim && (
            <div style={{ alignSelf: activeSpeaker === 'DOCTOR' ? 'flex-end' : 'flex-start', fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic', padding: '4px 12px' }}>
              {interim}…
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Analyse button */}
      <button
        onClick={handleAnalyse}
        disabled={!canAnalyse}
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          border: 'none',
          background: canAnalyse ? '#2563EB' : '#CBD5E1',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: canAnalyse ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: canAnalyse ? '0 4px 6px -1px rgba(37,99,235,0.2)' : 'none',
        }}
      >
        {summarizeMutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Analysing…
          </>
        ) : (
          <>
            <Sparkles size={16} /> Analyse & Summarise
          </>
        )}
      </button>

      {/* AI Summary field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} style={{ color: '#2563EB' }} /> AI Summary
        </label>
        <textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            onSummaryChange(e.target.value);
          }}
          placeholder="The AI-generated summary will appear here. You can edit it before saving."
          className="pp-textarea"
          style={{ minHeight: '140px', fontSize: '0.9rem', lineHeight: 1.6, padding: '10px 12px' }}
        />
      </div>
    </div>
  );
}
