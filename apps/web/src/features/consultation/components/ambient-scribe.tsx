import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Sparkles, Cloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { TranscriptPanel } from './transcript-panel';
import { useBinaryTranscriber } from '../../../hooks/use-binary-transcriber';
import {
  useCreateScribingSession,
  useAddSegments,
  useEndSession,
  useGenerateSoapFromTranscript,
  useScribingSession,
} from '../../../hooks/use-scribing';
import { toast } from '../../../hooks/use-toast';

import type { SoapSuggestion } from '../../../types/ai';
import type { TranscriptSegmentLocal, SpeakerLabel } from '../../../types/scribing';

interface AmbientScribeProps {
  visitId: string;
  aiContext?: {
    chiefComplaint?: string;
    specialty?: string;
    patientAge?: number;
    patientGender?: string;
    allergies?: string[];
  };
  onSoapGenerated: (suggestion: SoapSuggestion) => void;
  onTranscriptUpdate?: (text: string) => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function AmbientScribe({ visitId, aiContext, onSoapGenerated, onTranscriptUpdate }: AmbientScribeProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentLocal[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerLabel>('DOCTOR');
  const [elapsedMs, setElapsedMs] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const sessionStartRef = useRef(0);
  const nextSequenceRef = useRef(0);
  const segmentsRef = useRef<TranscriptSegmentLocal[]>([]);

  // Update ref whenever segments state changes
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Backend hooks
  const createSession = useCreateScribingSession();
  const addSegments = useAddSegments();
  const endSession = useEndSession();
  const generateSoap = useGenerateSoapFromTranscript();
  const { data: existingSession } = useScribingSession(visitId);

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
          .map((s) => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.text}`)
          .join('\n');
        onTranscriptUpdate?.(fullText);
        
        return newSegments;
      });
      
      setInterimText('');
      
      // Sync with backend
      if (sessionId) {
        addSegments.mutate({
          sessionId,
          data: { segments: [segment] },
        });
      }
    } else {
      setInterimText(result.translatedText || result.text);
    }
  }, [currentSpeaker, sessionId, addSegments, onTranscriptUpdate]);

  const binaryTranscriber = useBinaryTranscriber({
    visitId,
    engine: 'GOOGLE',
    onTranscript: onTranscriptResult,
    onError: (err) => {
      toast({ 
        title: 'Transcription Error', 
        description: err.message || 'Connection lost to high-power server', 
        variant: 'error' 
      });
    }
  });

  const isRecording = binaryTranscriber.isRecording;

  // Load existing session info if patient is revisited
  useEffect(() => {
    if (existingSession?.id) {
      setSessionId(existingSession.id);
    }
  }, [existingSession?.id]);

  // Timer for elapsed time tracking
  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording]);

  const handleStart = async () => {
    try {
      if (!sessionId) {
        const session = await createSession.mutateAsync({ visitId });
        if (session) {
          setSessionId(session.id);
        }
      }
      binaryTranscriber.startRecording();
    } catch (err) {
      toast({
        title: 'Failed to start scribing',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  };

  const handleStop = () => {
    binaryTranscriber.stopRecording();
    setInterimText('');
    if (sessionId) {
      endSession.mutate(sessionId);
    }
  };

  const handleGenerateSoap = () => {
    if (!sessionId) return;

    generateSoap.mutate(
      {
        sessionId,
        data: {
          chiefComplaint: aiContext?.chiefComplaint,
          specialty: aiContext?.specialty,
          patientAge: aiContext?.patientAge,
          patientGender: aiContext?.patientGender,
          allergies: aiContext?.allergies,
        },
      },
      {
        onSuccess: (result) => {
          onSoapGenerated(result);
          toast({ title: 'SOAP note generated', variant: 'success' });
        },
        onError: (err) => {
          toast({
            title: 'Failed to generate SOAP',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'error',
          });
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              Ambient Scribe (High-Power Server)
            </CardTitle>
            {isRecording && (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-[10px] text-red-600 font-bold font-mono tracking-tighter">
                  LIVE STREAMING
                </span>
              </span>
            )}
          </div>
          {isRecording && (
            <span className="text-sm font-mono text-gray-500 tabular-nums">
              {formatElapsed(elapsedMs)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isRecording ? (
            <Button
              onClick={handleStart}
              disabled={createSession.isPending || binaryTranscriber.isConnecting}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Mic className="h-4 w-4 mr-1.5" />
              {binaryTranscriber.isConnecting ? 'Initializing Server...' : 'Start Clinical Scribing'}
            </Button>
          ) : (
            <Button onClick={handleStop} size="sm" variant="outline" className="text-red-600 border-red-300">
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Stop and Save
            </Button>
          )}

          {isRecording && (
            <div className="flex items-center gap-1 ml-auto">
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
        </div>

        {/* Transcript Area */}
        <div className="border rounded-lg p-3 bg-slate-50 min-h-[200px] max-h-[400px] overflow-y-auto">
          <TranscriptPanel
            segments={segments}
            interimText={interimText}
            isRecording={isRecording}
          />
        </div>

        {/* Action Bar */}
        {segments.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex flex-col">
               <span className="text-[10px] text-gray-400 uppercase font-bold">Progress</span>
               <span className="text-xs font-medium text-slate-600">
                {segments.length} segment{segments.length !== 1 ? 's' : ''} captured
              </span>
            </div>
            
            <Button
              onClick={handleGenerateSoap}
              disabled={generateSoap.isPending || isRecording}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md active:scale-95"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {generateSoap.isPending ? 'Analyzing Transcript...' : 'Generate SOAP Report'}
            </Button>
          </div>
        )}

        {!isRecording && segments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg border-slate-200">
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Mic className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No active consultation audio</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Press start to stream audio to our high-power medical AI for real-time transcription.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
