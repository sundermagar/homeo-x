import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../lib/api-client';
import { API } from '../../../lib/constants';
import type { TranscriptSegmentLocal } from '../../../types/scribing';

export interface AiSuggestedQuestion {
  id: string;
  question: string;
  category: 'symptom' | 'modality' | 'mental' | 'general' | 'history' | 'followup';
  answered: boolean;
  options?: string[];
}

/**
 * Hook that generates AI follow-up questions from live transcript.
 * Token-efficient: only triggers after sufficient new content and uses debouncing.
 * Runs on the EXISTING /ai/suggest/soap endpoint to avoid needing a new backend route.
 */
export function useAiQuestionSuggestions(
  segments: TranscriptSegmentLocal[],
  isTranscribing: boolean,
  mode: 'acute' | 'chronic' | 'followup' = 'acute'
) {
  const [questions, setQuestions] = useState<AiSuggestedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastTriggerLengthRef = useRef(0);
  const lastTriggerTimeRef = useRef(0);

  // Build transcript text from segments
  const buildTranscriptText = useCallback((segs: TranscriptSegmentLocal[]) => {
    return segs
      .filter(s => s.isFinal)
      .map(s => `${s.speaker}: ${s.translatedText || s.text}`)
      .join('\n');
  }, []);

  // Mark a question as answered when the patient talks about it
  const markAnswered = useCallback((questionId: string) => {
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, answered: true } : q)
    );
  }, []);

  // Generate questions from transcript
  const generateQuestions = useCallback(async (segs: TranscriptSegmentLocal[]) => {
    const transcriptText = buildTranscriptText(segs);
    if (!transcriptText.trim() || transcriptText.length < 30) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    console.log('[AI Discovery] Generating questions from transcript...', { transcriptLen: transcriptText.length });
    setIsGenerating(true);
    try {
      const result = await api.post<{ questions: any[] }>(API.AI.SUGGEST_QUESTIONS, {
        transcript: transcriptText,
        consultationMode: mode,
      }, { signal: abortControllerRef.current.signal });

      if (result.questions && Array.isArray(result.questions)) {
        const newQuestions: AiSuggestedQuestion[] = result.questions
          .map((item, idx) => ({
            id: `q-${Date.now()}-${idx}`,
            question: item.question,
            category: item.category,
            answered: false,
            options: item.options,
          }));

        if (newQuestions.length > 0) {
          setQuestions(newQuestions);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[AI Discovery] Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [buildTranscriptText]);

  // Trigger generation when segments change
  useEffect(() => {
    if (!isTranscribing || segments.length === 0) return;

    const transcript = buildTranscriptText(segments);
    const currentLength = transcript.length;
    const now = Date.now();

    // ── Credit Saving Guards ──────────────────────────────────────────
    // 1. Min 100 chars growth (requires meaningful new content)
    const lengthGrowth = currentLength - lastTriggerLengthRef.current;
    const timeSinceLast = now - lastTriggerTimeRef.current;

    if (lengthGrowth < 100 && timeSinceLast < 180000) {
      return;
    }
    if (timeSinceLast < 30000) {
      // Hard cooldown of 30s
      return;
    }

    const finalSegs = segments.filter(s => s.isFinal);
    const lastSeg = finalSegs[finalSegs.length - 1];

    if (!lastSeg) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      console.log('[AI Discovery] Triggering generation...', { lengthGrowth, timeSinceLast });
      lastTriggerLengthRef.current = currentLength;
      lastTriggerTimeRef.current = Date.now();
      generateQuestions(segments);
    }, 6000); 
  }, [segments.length, isTranscribing, generateQuestions, mode, buildTranscriptText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    questions,
    isGenerating,
    markAnswered,
  };
}
