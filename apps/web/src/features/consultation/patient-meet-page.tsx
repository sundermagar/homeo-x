import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, MonitorSmartphone, Sparkles, Send, X, MessageSquare, ChevronRight } from 'lucide-react';
import { CallInterfacePanel, type CallMode } from '../../components/video-call/call-interface-panel';
import { useVideoService } from '../../hooks/use-video-service';
import { fetchPatientToken } from '../../hooks/use-video-call';
import { LoadingState } from '../../components/shared/loading-state';
import { io, type Socket } from 'socket.io-client';
import { toast } from '../../hooks/use-toast';
import type { TranscriptSegmentLocal } from '../../types/scribing';

export default function PatientMeetPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const callMode = (searchParams.get('mode')?.toUpperCase() || 'VIDEO') as CallMode;
  
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegmentLocal[]>([]);
  const [drInterimText, setDrInterimText] = useState('');
  const [ptInterimText, setPtInterimText] = useState('');
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<Array<{ id: string; question: string; options?: string[] }>>([]); 
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const questionIdCounter = useRef(0);
  
  const video = useVideoService();
  const socketRef = useRef<Socket | null>(null);
  const transSocketRef = useRef<Socket | null>(null);

  // Auto-exit if doctor leaves
  useEffect(() => {
    if (!isLoading && video.isConnected && video.remoteUsers.length === 0 && !isCallEnded) {
      // If we were connected and now no one is there, the doctor likely ended the session
      // We give it a small grace period to avoid flicker on reconnects
      const timer = setTimeout(() => {
        if (video.remoteUsers.length === 0) {
          setIsCallEnded(true);
          video.leave();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [video.remoteUsers.length, video.isConnected, isLoading, isCallEnded]);

  useEffect(() => {
    return () => {
      video.leave();
      socketRef.current?.disconnect();
      transSocketRef.current?.disconnect();
    };
  }, []); // Cleanup on unmount

  const handleJoinSession = async () => {
    if (!roomId || isLoading || hasJoined) return;
    setHasJoined(true);
    setIsLoading(true);

    try {
      const credentials = await fetchPatientToken(roomId);
      
      // Join video call
      await video.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
      
      const baseUrl = import.meta.env['VITE_API_URL'] || window.location.origin;

      // Connect to video-call socket for questions/sync
      const socket = io(`${baseUrl}/video-call`, {
        extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      });
      
      // Connect to transcription socket for live transcript
      const transSocket = io(`${baseUrl}/transcription`, {
        extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      });

      socket.on('connect', () => {
        socket.emit('call:join', { visitId: roomId, speaker: 'PATIENT' });
      });

      transSocket.on('connect', () => {
        // Join the room to receive broadcasted transcript segments
        transSocket.emit('stream:start', { visitId: roomId, role: 'PATIENT', engine: 'GOOGLE', isReadOnly: true });
      });

      transSocket.on('transcription:result', (result: any) => {
        const role = result.role || 'DOCTOR';
        if (result.isFinal) {
          setTranscript(prev => {
            if (prev.some(s => s.timestamp === result.timestamp)) return prev;
            const newSeg: TranscriptSegmentLocal = {
              sequenceNumber: result.sequenceNumber || Date.now(),
              text: result.text,
              translatedText: result.translatedText,
              speaker: role,
              isFinal: true,
              timestamp: result.timestamp,
              confidence: 1.0,
              startTimeMs: Date.now(),
              endTimeMs: Date.now(),
            };
            return [...prev, newSeg];
          });
          if (role === 'DOCTOR') setDrInterimText('');
          else setPtInterimText('');
        } else {
          if (role === 'DOCTOR') setDrInterimText(result.text);
          else setPtInterimText(result.text);
        }
      });
      transSocket.on('transcription:translation', (result: any) => {
        setTranscript(prev =>
          prev.map(seg => {
            if (seg.timestamp === result.timestamp || seg.text === result.originalText) {
              return { ...seg, translatedText: result.translatedText };
            }
            return seg;
          })
        );
      });

      socket.on('call:question', (data: { question: string; options?: string[] }) => {
        // Deduplicate: check if question is already in the queue
        setActiveQuestions(prev => {
          if (prev.some(q => q.question === data.question)) {
            return prev;
          }
          toast({
            title: 'Doctor is asking...',
            description: data.question,
          });
          questionIdCounter.current += 1;
          const qId = `q-${Date.now()}-${questionIdCounter.current}`;
          return [...prev, { id: qId, question: data.question, options: data.options }];
        });
      });

      socketRef.current = socket;
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to join meeting:', err);
      setError(err.message || 'Failed to join meeting');
      setIsLoading(false);
    }
  };

  if (!hasJoined && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900">
        <div className="max-w-md w-full bg-white p-10 rounded-[1.5rem] shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <MonitorSmartphone className="w-10 h-10" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-slate-900">Teleconsultation</h1>
            <p className="text-slate-500">Your doctor is ready. Click below to join the consultation.</p>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] p-4 rounded-xl text-sm text-left">
            <strong>Before joining:</strong> Please allow microphone access when prompted. Use <strong>Chrome</strong> or <strong>Edge</strong> for best experience.
          </div>

          <button 
            onClick={handleJoinSession}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/30"
          >
            <MonitorSmartphone className="w-5 h-5" />
            Join Session
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Joining secure consultation room..." />;
  }

  if (isCallEnded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Consultation Ended</h1>
            <p className="text-slate-500">Thank you for using our remote consultation service. You can now safely close this window.</p>
          </div>
          <button 
            onClick={() => window.close()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Unable to Join</h1>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Toggle an option for a specific question
  const toggleOption = (qId: string, opt: string) => {
    setSelectedOptionsMap(prev => {
      const current = prev[qId] || [];
      const next = current.includes(opt)
        ? current.filter(o => o !== opt)
        : [...current, opt];
      return { ...prev, [qId]: next };
    });
  };

  // Submit a single question's answer
  const handleSubmitSingle = (q: { id: string; question: string; options?: string[] }) => {
    const selected = selectedOptionsMap[q.id] || [];
    const custom = (customTextMap[q.id] || '').trim();
    const parts = [...selected];
    if (custom) parts.push(custom);
    const answerText = parts.join(', ');
    if (!answerText) return;

    // Add both question and answer to transcript locally
    const qSeg: TranscriptSegmentLocal = {
      sequenceNumber: Date.now() - 1,
      text: q.question,
      translatedText: q.question,
      speaker: 'DOCTOR',
      isFinal: true,
      timestamp: Date.now() - 1,
      confidence: 1.0,
      startTimeMs: Date.now() - 1,
      endTimeMs: Date.now() - 1,
    };

    const aSeg: TranscriptSegmentLocal = {
      sequenceNumber: Date.now(),
      text: answerText,
      translatedText: answerText,
      speaker: 'PATIENT',
      isFinal: true,
      timestamp: Date.now(),
      confidence: 1.0,
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
    };
    setTranscript(prev => [...prev, qSeg, aSeg]);

    // Send the answer via socket
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:submit-answer', {
        visitId: roomId,
        question: q.question,
        answer: answerText,
      });
    }

    // Remove this question from the queue and clean up state
    setActiveQuestions(prev => prev.filter(item => item.id !== q.id));
    setSelectedOptionsMap(prev => { const n = { ...prev }; delete n[q.id]; return n; });
    setCustomTextMap(prev => { const n = { ...prev }; delete n[q.id]; return n; });

    toast({
      title: 'Answer submitted',
      description: 'Your response was shared with the doctor.',
    });
  };

  // Submit all pending questions at once
  const handleSubmitAll = () => {
    if (activeQuestions.length === 0) return;
    setIsSubmittingAnswer(true);
    activeQuestions.forEach(q => handleSubmitSingle(q));
    setIsSubmittingAnswer(false);
  };

  // Dismiss a single question
  const handleDismiss = (qId: string) => {
    setActiveQuestions(prev => prev.filter(q => q.id !== qId));
    setSelectedOptionsMap(prev => { const n = { ...prev }; delete n[qId]; return n; });
    setCustomTextMap(prev => { const n = { ...prev }; delete n[qId]; return n; });
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 min-h-0 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Portal</h1>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Secure Consultation Room</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live Connection</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 overflow-y-auto lg:overflow-hidden pr-1 lg:pr-0">
          <div className="flex flex-col min-h-0 h-[480px] lg:h-full shrink-0">
            <CallInterfacePanel
              callMode={callMode}
              video={video}
              localSpeaker="PATIENT"
              transcript={transcript}
              drInterimText={drInterimText}
              ptInterimText={ptInterimText}
              isTranscribing={false}
              onLeave={() => {
                video.leave();
                setIsCallEnded(true);
              }}
            />
          </div>

          {activeQuestions.length > 0 ? (
            <div className="bg-white border border-[#E3E2DF] rounded-2xl shadow-lg flex flex-col lg:h-full lg:min-h-0 overflow-hidden shrink-0">
              {/* Header */}
              <div className="px-5 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563EB] animate-pulse" />
                  <span className="text-[13px] font-bold text-[#0F0F0E] tracking-tight">Doctor Inquiries</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold min-w-[20px] text-center">
                    {activeQuestions.length}
                  </span>
                </div>
                {activeQuestions.length > 1 && (
                  <button
                    onClick={handleSubmitAll}
                    disabled={isSubmittingAnswer}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2563EB] hover:bg-[#EFF6FF] px-2 py-1 rounded-md transition-colors uppercase tracking-wider"
                  >
                    <Send className="w-3 h-3" />
                    Submit All
                  </button>
                )}
              </div>

              {/* Scrollable question cards */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeQuestions.map((q, qIdx) => {
                  const selected = selectedOptionsMap[q.id] || [];
                  const custom = customTextMap[q.id] || '';
                  const hasAnswer = selected.length > 0 || custom.trim().length > 0;

                  return (
                    <div
                      key={q.id}
                      className="border border-[#E3E2DF] rounded-xl p-4 space-y-3 bg-white hover:border-[#BFDBFE] transition-colors"
                    >
                      {/* Question number + dismiss */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[10px] font-bold text-[#2563EB] shrink-0 mt-0.5">
                            {qIdx + 1}
                          </span>
                          <p className="text-[14px] font-bold text-[#0F0F0E] leading-snug tracking-tight">
                            {q.question}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDismiss(q.id)}
                          className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Multi-select options */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select options</span>
                          <div className="flex flex-wrap gap-1.5">
                            {q.options.map((opt, idx) => {
                              const isSelected = selected.includes(opt);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => toggleOption(q.id, opt)}
                                  className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition-all active:scale-95 text-left ${
                                    isSelected
                                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm shadow-blue-500/20"
                                      : "bg-slate-50 border-[#E3E2DF] text-[#4A4A47] hover:border-[#2563EB] hover:text-[#2563EB]"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom text input */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={custom}
                          onChange={(e) => setCustomTextMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Add details..."
                          className="w-full text-[12px] font-medium px-3 py-2 rounded-lg border border-[#E3E2DF] bg-[#FAFAF8] focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] text-[#0F0F0E] transition-colors"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasAnswer) {
                              handleSubmitSingle(q);
                            }
                          }}
                        />
                      </div>

                      {/* Per-question submit */}
                      <button
                        onClick={() => handleSubmitSingle(q)}
                        disabled={!hasAnswer}
                        className="w-full py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-100 disabled:text-slate-400 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] uppercase tracking-wider"
                      >
                        <Send className="w-3 h-3" />
                        Submit Answer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center border-2 border-dashed border-[#E3E2DF] bg-slate-50/50 rounded-2xl p-6 text-center text-[#888786]">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-[#0F0F0E]">Doctor Inquiries</p>
              <p className="text-xs text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                Questions from the doctor will appear here in real-time. Select multiple options or type custom responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
