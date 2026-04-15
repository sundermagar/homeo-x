// ─── Binary Transcriber Hook ──────────────────────────────────────────────────
// Sends PCM audio chunks to the backend via Socket.io for Google STT processing.
// Includes a heartbeat watchdog ("Defibrillator") to recover from browser throttling.

import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TranscriptionResult {
  visitId: string;
  role: 'DOCTOR' | 'PATIENT';
  text: string;
  translatedText: string | null;
  isFinal: boolean;
  engine: string;
  timestamp: number;
  /** True if this is an async translation update for an existing transcript line */
  isTranslationUpdate?: boolean;
}

interface UseBinaryTranscriberOptions {
  visitId: string;
  engine?: 'GOOGLE' | 'DEEPGRAM';
  languageCode?: string;
  role?: 'DOCTOR' | 'PATIENT';
  onTranscript?: (result: TranscriptionResult) => void;
  onError?: (error: any) => void;
}

export function useBinaryTranscriber({
  visitId,
  engine = 'GOOGLE',
  languageCode = 'hi-IN',
  role = 'DOCTOR',
  onTranscript,
  onError,
}: UseBinaryTranscriberOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stable callback refs to prevent closure staleness in socket listeners
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Watchdog timing refs
  const lastChunkTimeRef = useRef<number>(Date.now());
  const recordingStartRef = useRef<number>(0);

  const stopRecording = useCallback(() => {
    // Stop AudioWorklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    // Stop mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('stream:stop');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsConnecting(true);
      lastChunkTimeRef.current = Date.now();
      recordingStartRef.current = Date.now();

      // 1. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 2. Connect to Transcription Gateway
      const socket = io('/transcription', {
        withCredentials: true,
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        lastChunkTimeRef.current = Date.now();
        socket.emit('stream:start', { visitId, engine, languageCode, role });
      });

      socket.on('transcription:result', (result: TranscriptionResult) => {
        onTranscriptRef.current?.(result);
      });

      // Handle async translation updates
      socket.on('transcription:translation', (update: { originalText: string; translatedText: string; timestamp: number; role?: 'DOCTOR' | 'PATIENT' }) => {
        onTranscriptRef.current?.({
          visitId,
          role: update.role || role,
          text: update.originalText,
          translatedText: update.translatedText,
          isFinal: true,
          engine: 'GOOGLE',
          timestamp: update.timestamp,
          isTranslationUpdate: true,
        });
      });

      socket.on('transcription:error', (err: { message: string }) => {
        console.error('[Transcription] Fatal server error:', err);
        onErrorRef.current?.(new Error(err.message || 'Transcription service failed'));
        setTimeout(() => stopRecording(), 0);
      });

      // 3. Setup AudioContext + AudioWorklet
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/pcm-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        lastChunkTimeRef.current = Date.now();
        if (socketRef.current?.connected && event.data) {
          socketRef.current.emit('stream:audio', event.data);
        }
      };

      source.connect(workletNode);
      
      setIsRecording(true);
      setIsConnecting(false);
    } catch (err) {
      console.error('Failed to start binary transcription:', err);
      setIsConnecting(false);
      onErrorRef.current?.(err);
    }
  }, [visitId, engine, languageCode, role]);

  // Emergency Defibrillator Watchdog
  useEffect(() => {
    if (!isRecording) return;
    let isRebuilding = false;

    const watchdogInterval = setInterval(() => {
      if (isRebuilding || !streamRef.current) return;

      const timeSinceStart = Date.now() - recordingStartRef.current;
      if (timeSinceStart < 3000) return; // Startup grace period

      const timeSinceLastChunk = Date.now() - lastChunkTimeRef.current;
      if (timeSinceLastChunk > 3000) {
        console.warn(`[Audio Watchdog] Mic thread flatlined (${timeSinceLastChunk}ms). Rebuilding...`);
        isRebuilding = true;

        (async () => {
          try {
            if (workletNodeRef.current) workletNodeRef.current.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close().catch(() => {});
            }

            const newContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = newContext;
            await newContext.audioWorklet.addModule('/pcm-processor.js');

            let currentStream = streamRef.current;
            if (currentStream) {
              const track = currentStream.getAudioTracks()[0];
              if (!track || track.readyState === 'ended' || (track as any).muted) {
                currentStream = await navigator.mediaDevices.getUserMedia({
                  audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
                });
                streamRef.current = currentStream;
              }
            }

            if (!currentStream) return;

            const source = newContext.createMediaStreamSource(currentStream);
            const workletNode = new AudioWorkletNode(newContext, 'pcm-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
              lastChunkTimeRef.current = Date.now();
              if (socketRef.current?.connected && event.data) {
                socketRef.current.emit('stream:audio', event.data);
              }
            };

            source.connect(workletNode);
            lastChunkTimeRef.current = Date.now();
          } catch (err) {
            console.error('[Audio Watchdog] Defibrillation failed:', err);
          } finally {
            setTimeout(() => { isRebuilding = false; }, 2000);
          }
        })();
      }
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [isRecording]);

  useEffect(() => {
    return () => { stopRecording(); };
  }, [stopRecording]);

  return { isRecording, isConnecting, startRecording, stopRecording };
}
