import { useState, useRef, useEffect, useCallback } from 'react';
import { MessagesSquare, Copy, CornerDownLeft, Stethoscope } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { CallInterfacePanel, type CallMode } from '../../../../components/video-call/call-interface-panel';
import type { TranscriptSegmentLocal } from '../../../../types/scribing';
import type { ConsultationMode } from '../../../../types/ai';
import type { VideoCallState } from '../consultation-header';

interface Turn {
  speaker: 'DOCTOR' | 'PATIENT';
  text: string;
  ts: string;
}

interface ConversationStageProps {
  visit: any;
  patient: any;
  patientAge?: number;
  consultationMode: ConsultationMode;
  onConsultationModeChange: (mode: ConsultationMode) => void;
  onTranscriptUpdate: (transcript: string) => void;
  // Call support (Audio/Video)
  callMode?: CallMode;
  video?: any;
  videoCallState?: VideoCallState | null;
  onLeaveCall?: () => void;
}

/**
 * Stage 1 — Conversation (matches design/consultation-redesign/c1-consult.html).
 * In-person: typed doctor/patient transcript + AI-suggested questions.
 * Audio/Video: live call panel (video + shareable patient link) above the transcript.
 * The whole transcript is analysed at the end ("End & Analyse").
 */
export function ConversationStage({
  visit,
  patient,
  patientAge,
  consultationMode,
  onConsultationModeChange,
  onTranscriptUpdate,
  callMode = 'IN_PERSON',
  video,
  videoCallState,
  onLeaveCall,
}: ConversationStageProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaker, setSpeaker] = useState<'DOCTOR' | 'PATIENT'>('DOCTOR');
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const inCall = callMode !== 'IN_PERSON' && !!videoCallState;

  const patientName = patient ? `${patient.firstName || 'Patient'}`.trim() : 'Patient';
  const patientInitials = `${(patient?.firstName?.[0] || 'P')}${(patient?.lastName?.[0] || '')}`.toUpperCase();

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const pushTurn = useCallback((sp: 'DOCTOR' | 'PATIENT', text: string) => {
    const t = text.trim();
    if (!t) return;
    setTurns((prev) => {
      const next = [...prev, { speaker: sp, text: t, ts: now() }];
      const transcript = next.map((x) => `${x.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${x.text}`).join('\n');
      setTimeout(() => onTranscriptUpdate(transcript), 0);
      return next;
    });
  }, [onTranscriptUpdate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleAdd = () => {
    if (!draft.trim()) return;
    pushTurn(speaker, draft);
    setDraft('');
    setSpeaker((s) => (s === 'DOCTOR' ? 'PATIENT' : 'DOCTOR'));
  };

  // For the call panel transcript display
  const turnsAsSegments: TranscriptSegmentLocal[] = turns.map((t, i) => ({
    sequenceNumber: i,
    text: t.text,
    translatedText: t.text,
    speaker: t.speaker,
    confidence: 1,
    startTimeMs: 0,
    endTimeMs: 0,
    isFinal: true,
    timestamp: Date.now() + i,
  }));

  // ── Shared: composer ──
  const composer = (
    <div className="px-4 py-3 border-t border-[#E3E2DF] bg-white flex items-center gap-2.5 shrink-0">
      <div className="inline-flex bg-[#FAFAF8] border border-[#E3E2DF] rounded-lg p-0.5 shrink-0">
        {(['DOCTOR', 'PATIENT'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSpeaker(s)}
            className={cn('text-[11px] font-bold px-2.5 py-1.5 rounded-md transition-colors', speaker === s ? 'bg-[#2563EB] text-white' : 'text-[#4A4A47] hover:text-[#2563EB]')}
          >
            {s === 'DOCTOR' ? 'Dr' : 'Patient'}
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        placeholder={`Type what the ${speaker === 'DOCTOR' ? 'doctor' : 'patient'} said…`}
        className="flex-1 h-10 px-3.5 text-[13px] rounded-lg border border-[#E3E2DF] bg-[#FAFAF8] text-[#0F0F0E] outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] transition-all"
      />
      <button onClick={handleAdd} disabled={!draft.trim()} className="pp-btn-primary h-10 px-4 text-[12px] shrink-0 disabled:opacity-50">
        <CornerDownLeft className="h-4 w-4 mr-1" /> Add
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pp-fade-in flex-1 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Conversation</h2>
          <p className="text-[13px] font-medium text-[#4A4A47] mt-1">
            {inCall ? 'Live call — share the patient link to connect.' : 'Capture the conversation — it is summarised & analysed next.'}
          </p>
        </div>
      </div>

      {inCall ? (
        <>
          {/* Live call (video + shareable patient link + transcript) */}
          <CallInterfacePanel
            callMode={callMode}
            video={video}
            localSpeaker="DOCTOR"
            patientJoinLink={videoCallState?.patientJoinLink}
            transcript={turnsAsSegments}
            onLeave={onLeaveCall}
          />
          {/* Add-to-transcript controls */}
          <div className="pp-card overflow-hidden">
            {composer}
          </div>
        </>
      ) : (
        <div className="pp-card overflow-hidden flex flex-col flex-1 min-h-0">
          {/* header */}
          <div className="px-4 py-2.5 border-b border-[#E3E2DF] bg-[#FAFAF8] flex items-center gap-2.5 shrink-0">
            <span className="text-[13px] font-bold text-[#0F0F0E] flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-[#2563EB]" /> Transcript
            </span>
            <span className="text-[10px] font-bold text-[#4A4A47] bg-white border border-[#E3E2DF] px-2 py-0.5 rounded-[4px]">
              {turns.length} {turns.length === 1 ? 'turn' : 'turns'}
            </span>
            <button
              onClick={() => navigator.clipboard?.writeText(turns.map((t) => `${t.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${t.text}`).join('\n'))}
              className="ml-auto w-7 h-7 rounded-md border border-[#E3E2DF] bg-white flex items-center justify-center text-[#4A4A47] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-colors"
              title="Copy transcript"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* turns */}
          <div className="px-5 py-4 space-y-4 bg-white flex-1 min-h-0 overflow-auto">
            {turns.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-10 text-[#888786]">
                <MessagesSquare className="h-8 w-8 mb-3 text-[#D6D5D2]" />
                <p className="text-[13px] font-medium">Start the conversation — type a Doctor or Patient turn below.</p>
              </div>
            )}

            {turns.map((t, i) =>
              t.speaker === 'DOCTOR' ? (
                <div key={i} className="flex justify-end items-start gap-2.5">
                  <div className="flex flex-col items-end max-w-[78%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-[#888786] tabular-nums">{t.ts}</span>
                      <span className="text-[11px] font-bold text-[#4A4A47]">Doctor</span>
                    </div>
                    <div className="bg-[#2563EB] text-white text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-sm">{t.text}</div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-5">
                    <Stethoscope className="h-3.5 w-3.5" />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#F4F3F1] text-[#4A4A47] border border-[#E3E2DF] flex items-center justify-center shrink-0 mt-5 text-[10px] font-bold">
                    {patientInitials}
                  </div>
                  <div className="flex flex-col items-start max-w-[78%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#4A4A47]">{patientName}</span>
                      <span className="text-[11px] text-[#888786] tabular-nums">{t.ts}</span>
                    </div>
                    <div className="bg-white border border-[#E3E2DF] text-[#0F0F0E] text-[13px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm">{t.text}</div>
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>

          {composer}
        </div>
      )}
    </div>
  );
}
