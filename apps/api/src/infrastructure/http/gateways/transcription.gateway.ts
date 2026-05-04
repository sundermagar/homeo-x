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
// Use the v2 API for Chirp model support and automatic language detection
const SpeechClientV2 = speech.v2.SpeechClient;

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

      if (engine === 'GOOGLE' && !SpeechClientV2) {
        client.emit('transcription:error', { message: 'Google STT v2 not available. Use Web Speech API.' });
        return;
      }

      let currentGeneration = 0;

      const createAndRegister = (preFillBuffer: Buffer[] = []) => {
        const myGeneration = ++currentGeneration;
        logger.info(`[CREATE] socket=${client.id} gen=${myGeneration} prefill=${preFillBuffer.length} chunks`);

        let session: any;

        if (engine === 'GOOGLE' && SpeechClientV2) {
          const credentialsStr = process.env.GOOGLE_CREDENTIALS_BASE64 
            ? Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8') 
            : null;
          const credentials = credentialsStr ? JSON.parse(credentialsStr) : undefined;
          const projectId = credentials?.project_id;
          
          if (!credentialsStr || !projectId) {
            logger.warn('[STT] No GOOGLE_CREDENTIALS_BASE64 environment variable found or missing project_id');
          } else {
            logger.info(`[STT v2] Loaded credentials for project: ${projectId}`);
          }

          // Location for Chirp model — configurable via env, defaults to us-central1
          const location = process.env.GOOGLE_STT_LOCATION || 'us-central1';
          
          let speechClient: any;
          try {
            speechClient = new SpeechClientV2(
              credentials
                ? { credentials, projectId, apiEndpoint: `${location}-speech.googleapis.com` }
                : {}
            );
            logger.info(`[STT v2] SpeechClient initialized (location=${location})`);
          } catch (err: any) {
            logger.error({ err: err?.message }, '[STT v2] Failed to initialize SpeechClient');
            client.emit('transcription:error', { 
              message: 'Failed to initialize speech client. Check GOOGLE_CREDENTIALS_BASE64.',
              details: err?.message 
            });
            return;
          }

          // ── v2 Streaming: open bidirectional stream ──────────────────────────
          const recognizeStream = speechClient._streamingRecognize();

          // v2 requires the config as the FIRST write to the stream
          const recognizer = `projects/${projectId}/locations/${location}/recognizers/_`;
          recognizeStream.write({
            recognizer,
            streamingConfig: {
              config: {
                // Auto-detect language using Chirp 2's native auto mode
                languageCodes: ['auto'],
                // Only chirp_2 supports streaming. The base 'chirp' model returns CANCELLED.
                model: 'chirp_2',
                // Raw PCM from browser has no WAV header, so autoDecodingConfig hangs forever.
                // We must explicitly specify the encoding.
                explicitDecodingConfig: {
                  encoding: 'LINEAR16',
                  sampleRateHertz: 16000,
                  audioChannelCount: 1,
                },
                features: {
                  enableAutomaticPunctuation: false,
                  enableWordTimeOffsets: false,
                },
              },
              streamingFeatures: {
                interimResults: true,
              },
            },
          });
          logger.info(`[STT v2] Config sent to stream (recognizer=${recognizer}, model=chirp)`);

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
            
            logger.warn(`[STT v2 ERROR] socket=${client.id} gen=${myGeneration} error=${err?.message || err?.code || err}`);
            if (err?.details) logger.debug(`[STT v2 ERROR DETAILS] ${JSON.stringify(err.details)}`);

            s.errorCount = (s.errorCount || 0) + 1;
            if (s.errorCount > 5 && (Date.now() - s.createdAt) < 10000) {
              logger.error(`[STT v2 FATAL] socket=${client.id} — rapid failures (${s.errorCount} errors), killing session`);
              logger.error(`[STT v2 FATAL] Last error: ${err?.message || err?.code || 'unknown'}`);
              client.emit('transcription:error', { 
                message: 'Transcription service failed. Verify Google credentials, API permissions, and STT v2 enablement.',
                details: err?.message || err?.code 
              });
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
            // v2 requires audio wrapped in { audio: chunk }
            send: (chunk: Buffer) => recognizeStream.write({ audio: chunk }),
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
    const alternative = result.alternatives?.[0];
    const text = alternative?.transcript;
    const isFinal = result.isFinal;
    if (!text?.trim()) return;

    // ── Confidence & Hallucination Filter ──────────────────────────────────────
    // Google STT (especially chirp_2) returns a confidence score only for final results.
    // It also frequently hallucinates during silence (e.g., counting, "thank you").
    const confidence: number = alternative?.confidence ?? 1.0;
    
    function isHallucination(tStr: string): boolean {
      const t = tStr.trim().toLowerCase();
      if (!t || t.length < 2) return true;

      // ── Fixed known phantom phrases ──
      const fixed = /^(thank you|bye bye|bye-bye|please subscribe|subscribe|hey guys|goodbye|thank you for watching|thanks for watching|amen|amend|testing 1 2 3|1 to 10|1 to 100|1 to 100 counting|counting|i'm going to|i'm gonna|i'm going to go to the bathroom|i'm going to go ahead|i'm going to go ahead and put this|let's go|okay so|so yeah|yeah so|yeah|so|you|hmm|hm|um|uh|oh|okay|ok|right|alright|well|anyway|hello|hi|hey)\\.?$/i;
      if (fixed.test(t)) return true;

      // ── Counting sequences ──
      const cleanStr = t.replace(/[,\.]/g, '');
      if (/1 to 100/i.test(cleanStr) || /1 2 3 4/i.test(cleanStr) || /one two three/i.test(cleanStr)) return true;
      const isOnlyNumbers = /^[\d\s]+$/.test(cleanStr);
      if (isOnlyNumbers && cleanStr.split(/\s+/).length >= 2) return true;

      // ── Very short non-medical filler ──
      // Single words under 4 chars that aren't Hindi/medical terms
      const words = t.split(/\s+/);
      if (words.length === 1 && t.length <= 4 && /^[a-z]+$/.test(t)) return true;

      // ── Repetition detector ──
      // "so so so" or "yeah yeah" — repeated single words
      if (words.length >= 2 && words.every(w => w === words[0])) return true;

      // ── Common chirp_2 hallucination patterns ──
      // These are English filler sentences the model generates during silence
      if (/^i'?m going to (go|put|do|make|get|take|try)/i.test(t) && words.length <= 12) return true;
      if (/^(let me|let's) (go|do|see|try|put|check)/i.test(t) && words.length <= 8) return true;
      if (/^(so|and|but|or|well) (i'?m|we|let|the|this|that)$/i.test(t)) return true;

      return false;
    }

    if (isHallucination(text)) {
      if (isFinal) session.latestInterimText = undefined;
      return;
    }

    if (isFinal && confidence < 0.70) {
      logger.warn({ confidence, text: text.slice(0, 60) }, '[STT] Dropped low-confidence result');
      session.latestInterimText = undefined;
      return;
    }

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
