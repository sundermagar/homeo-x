// ─── Transcription Gateway ────────────────────────────────────────────────────
// Socket.io namespace for real-time audio transcription.
// Supports Google STT with zero-gap stream rotation.
// Ported from: Ai-Counsultaion/apps/api/src/modules/video-call/transcription.gateway.ts

import type { Server, Socket } from 'socket.io';
import { createLogger } from '../../../shared/logger';
import { TranslatorEngine } from '../../../domains/consultation/engines/translator.engine';

const logger = createLogger('transcription-gateway');

// Stream rotation constants
const HARD_ROTATION_MS = 4 * 60 * 1000; // 4 minutes
const OPPORTUNISTIC_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface ActiveSession {
  visitId: string;
  role: 'DOCTOR' | 'PATIENT';
  engine: any;
  stop: () => void;
  rotationTimer?: ReturnType<typeof setTimeout>;
  resultWatchdog?: ReturnType<typeof setInterval>;
  generation: number;
  dead: boolean;
  rotating: boolean;
  audioBuffer: Buffer[];
  rollingAudioBuffer: Buffer[];
  createdAt: number;
  errorCount: number;
  lastErrorAt?: number;
  latestInterimText?: string;
  lastAudioAt: number;
  lastResultAt: number;
}

import speech from '@google-cloud/speech';
const GoogleSttAdapter = speech;

export function setupTranscriptionGateway(io: Server, translator: TranslatorEngine) {
  const transcriptionNs = io.of('/transcription');
  const activeSessions = new Map<string, ActiveSession>();

  transcriptionNs.on('connection', (client: Socket) => {
    logger.info(`Transcription socket connected: ${client.id}`);

    // ─── stream:start ───
    client.on('stream:start', (payload: {
      visitId: string;
      engine: 'DEEPGRAM' | 'GOOGLE';
      languageCode?: string;
      role?: 'DOCTOR' | 'PATIENT';
    }) => {
      logger.info(`[START] socket=${client.id} room=${payload.visitId} engine=${payload.engine} role=${payload.role || 'DOCTOR'}`);

      if (payload.visitId) client.join(payload.visitId);
      killSession(client.id);

      const { visitId, engine, languageCode, role = 'DOCTOR' } = payload;

      if (engine === 'GOOGLE' && !GoogleSttAdapter) {
        client.emit('transcription:error', { message: 'Google STT not available. Use Web Speech API.' });
        return;
      }

      let currentGeneration = 0;

      const createAndRegister = (preFillBuffer: Buffer[] = []) => {
        const myGeneration = ++currentGeneration;
        logger.info(`[CREATE] socket=${client.id} gen=${myGeneration} prefill=${preFillBuffer.length} chunks`);

        let session: any;

        if (engine === 'GOOGLE' && GoogleSttAdapter) {
          const speechClient = new GoogleSttAdapter.SpeechClient();
          const recognizeStream = speechClient.streamingRecognize({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: languageCode || 'hi-IN',
              enableAutomaticPunctuation: false, // Disabling this removes the severe 'pausing' delay Google adds to analyze sentences
              enableWordTimeOffsets: true, 
              useEnhanced: true, // Forces the premium model to suppress background hallucinations ("apne aap se aana")
            },
            interimResults: true,
          });

          recognizeStream.on('data', (data: any) => {
            const s = activeSessions.get(client.id);
            if (!s || s.dead) return;
            handleTranscriptionResult(client, visitId, data, 'GOOGLE', s, translator);

            const isFinal = data.results?.[0]?.isFinal;
            if (isFinal && (Date.now() - s.createdAt > OPPORTUNISTIC_THRESHOLD_MS) && !s.rotating) {
              logger.info(`[OPPORTUNISTIC ROTATE] socket=${client.id} gen=${myGeneration}`);
              rotate(client.id, myGeneration, createAndRegister);
            }
          });

          recognizeStream.on('error', (err: any) => {
            const s = activeSessions.get(client.id);
            if (!s || s.dead || s.generation !== myGeneration) return;
            logger.warn(`[STT ERROR] socket=${client.id} gen=${myGeneration}: ${err.message || err}`);

            s.errorCount = (s.errorCount || 0) + 1;
            if (s.errorCount > 5 && (Date.now() - s.createdAt) < 10000) {
              logger.error(`[STT FATAL] socket=${client.id} — rapid failures, killing session`);
              client.emit('transcription:error', { message: 'Transcription service failed. Check credentials.' });
              killSession(client.id);
              return;
            }
            rotate(client.id, myGeneration, createAndRegister);
          });

          recognizeStream.on('end', () => {
            const s = activeSessions.get(client.id);
            if (!s || s.dead || s.generation !== myGeneration) return;
            rotate(client.id, myGeneration, createAndRegister);
          });

          session = {
            send: (chunk: Buffer) => recognizeStream.write(chunk),
            stop: () => { try { recognizeStream.end(); } catch {} },
          };
        } else {
          // Fallback: no-op engine (client uses Web Speech API)
          session = {
            send: () => {},
            stop: () => {},
          };
        }

        const existingSession = activeSessions.get(client.id);
        const now = Date.now();
        const rotationTimer = (engine === 'GOOGLE') ? setTimeout(() => {
          rotate(client.id, myGeneration, createAndRegister);
        }, HARD_ROTATION_MS) : undefined;

        activeSessions.set(client.id, {
          visitId,
          role,
          engine: session,
          stop: () => { try { session.stop(); } catch {} },
          rotationTimer,
          resultWatchdog: undefined,
          generation: myGeneration,
          dead: false,
          rotating: false,
          audioBuffer: [],
          rollingAudioBuffer: [],
          createdAt: existingSession?.createdAt || now,
          errorCount: existingSession?.errorCount || 0,
          lastErrorAt: existingSession?.lastErrorAt,
          latestInterimText: existingSession?.latestInterimText,
          lastAudioAt: now,
          lastResultAt: now,
        });

        // Result watchdog
        const watchdog = setInterval(() => {
          const s = activeSessions.get(client.id);
          if (!s || s.dead || s.generation !== myGeneration) {
            clearInterval(watchdog);
            return;
          }
          if (s.rotating) return;
          const timeSinceAudio = Date.now() - s.lastAudioAt;
          const timeSinceResult = Date.now() - s.lastResultAt;
          if (timeSinceAudio < 3000 && timeSinceResult > 10000) {
            logger.warn(`[WATCHDOG] socket=${client.id} gen=${myGeneration}: STT hung, rotating`);
            clearInterval(watchdog);
            rotate(client.id, myGeneration, createAndRegister);
          }
        }, 5000);

        const reg = activeSessions.get(client.id);
        if (reg) reg.resultWatchdog = watchdog;

        // Flush pre-fill buffer
        for (const chunk of preFillBuffer) {
          try { session.send(chunk); } catch {}
        }
      };

      createAndRegister();
      client.emit('stream:started', { status: 'started', engine: payload.engine });
    });

    // ─── stream:audio ───
    client.on('stream:audio', (data: Buffer) => {
      const session = activeSessions.get(client.id);
      if (!session || session.dead || !data || data.length === 0) return;

      session.lastAudioAt = Date.now();

      if (!session.rollingAudioBuffer) session.rollingAudioBuffer = [];
      session.rollingAudioBuffer.push(data);
      // chunk size is 256ms now. Retain 5 chunks = ~1.28 seconds of overlap for zero-skip rotation
      if (session.rollingAudioBuffer.length > 5) session.rollingAudioBuffer.shift();

      if (session.rotating) {
        session.audioBuffer.push(data);
      } else {
        try { session.engine.send(data); } catch {}
      }
    });

    // ─── stream:stop ───
    client.on('stream:stop', () => {
      killSession(client.id);
      client.emit('stream:stopped', { status: 'stopped' });
    });

    client.on('disconnect', () => {
      killSession(client.id);
    });
  });

  function rotate(socketId: string, requestingGeneration: number, createFn: (preFill: Buffer[]) => void) {
    const session = activeSessions.get(socketId);
    if (!session || session.dead) return;
    if (session.generation !== requestingGeneration) return;

    if (session.rotationTimer) clearTimeout(session.rotationTimer);

    // Salvage orphaned interim text
    if (session.latestInterimText) {
      const mockClient = transcriptionNs.sockets.get(socketId);
      if (mockClient) {
        handleTranscriptionResult(
          mockClient,
          session.visitId,
          { results: [{ alternatives: [{ transcript: session.latestInterimText }], isFinal: true }] },
          'GOOGLE',
          session,
          translator
        );
      }
      session.latestInterimText = undefined;
    }

    session.rotating = true;
    session.audioBuffer = [];

    const oldStop = session.stop;
    const overlapBuffer = [...(session.rollingAudioBuffer || [])];
    createFn(overlapBuffer);

    const newSession = activeSessions.get(socketId);
    if (newSession && session.audioBuffer.length > 0) {
      for (const chunk of session.audioBuffer) {
        try { newSession.engine.send(chunk); } catch {}
      }
      session.audioBuffer = [];
    }

    setTimeout(() => { try { oldStop(); } catch {} }, 4000);
  }

  function killSession(socketId: string) {
    const session = activeSessions.get(socketId);
    if (session) {
      session.dead = true;
      if (session.rotationTimer) clearTimeout(session.rotationTimer);
      if (session.resultWatchdog) clearInterval(session.resultWatchdog);
      session.stop();
      activeSessions.delete(socketId);
      logger.info(`[KILLED] socket=${socketId}`);
    }
  }

  function handleTranscriptionResult(client: Socket, visitId: string, data: any, engine: string, session: ActiveSession, translator: TranslatorEngine) {
    const result = data.results?.[0];
    if (!result) return;
    const text = result.alternatives?.[0]?.transcript;
    const isFinal = result.isFinal;
    if (!text?.trim()) return;

    const resultTimestamp = Date.now();
    session.lastResultAt = resultTimestamp;

    if (!isFinal) {
      session.latestInterimText = text;
    } else {
      session.latestInterimText = undefined;
    }

    const role = session.role || 'DOCTOR';

    transcriptionNs.to(visitId).emit('transcription:result', {
      visitId,
      role,
      text,
      translatedText: null,
      isFinal,
      engine,
      timestamp: resultTimestamp,
    });

    // Translate only final sentences (no partial translation spam)
    if (isFinal) {
      translator.translateToEnglish('system', 'transcription-engine', text)
        .then(translated => {
          transcriptionNs.to(visitId).emit('transcription:translation', {
            visitId,
            role,
            originalText: text,
            translatedText: translated,
            isFinal: true,
            engine,
            timestamp: resultTimestamp,
          });
        })
        .catch(err => {
          logger.error({ err: err.message }, 'Translation failed for transcript');
        });
    }
  }

  logger.info('Transcription gateway initialized on /transcription namespace');
}
