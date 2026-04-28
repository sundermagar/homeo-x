import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, MonitorSmartphone } from 'lucide-react';
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
    if (!roomId) return;
    setHasJoined(true);
    setIsLoading(true);

    try {
      const credentials = await fetchPatientToken(roomId);
      
      // Join video call
      await video.join(credentials.appId, credentials.channel, credentials.token, credentials.uid);
      
      // Connect to video-call socket for questions/sync
      const socket = io(`${window.location.origin}/video-call`, {
        extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
      });
      
      // Connect to transcription socket for live transcript
      const transSocket = io(`${window.location.origin}/transcription`, {
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

      socket.on('call:question', (data) => {
        toast({
          title: 'Doctor is asking...',
          description: data.question,
          duration: 10000,
        });
        // Add question to transcript as DOCTOR segment
        const qSeg: TranscriptSegmentLocal = {
          sequenceNumber: Date.now(),
          text: data.question,
          translatedText: data.question,
          speaker: 'DOCTOR',
          isFinal: true,
          timestamp: Date.now(),
        };
        setTranscript(prev => [...prev, qSeg]);
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

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
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

        <div className="flex-1 min-h-0">
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
      </div>
    </div>
  );
}
