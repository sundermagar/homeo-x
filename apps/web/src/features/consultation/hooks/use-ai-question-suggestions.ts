// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../lib/api-client';
import { API } from '../../../lib/constants';
import type { TranscriptSegmentLocal } from '../../../types/scribing';

export interface AiSuggestedQuestion {
  id: string;
  question: string;
  category: 'symptom' | 'modality' | 'mental' | 'general' | 'history';
  answered: boolean;
}

/**
 * Hook that generates AI follow-up homeopathic questions from live transcript.
 * Uses the /api/ai/suggest/questions endpoint (fast, lightweight LLM call) to generate structured
 * clinical questions the doctor should ask next.
 *
 * Triggers:
 * - Every 3+ new final segments (lowered from 2 to catch short exchanges)
 * - After 4s debounce of silence
 * - Works even after recording stops (so questions persist after wrap-up)
 */
export function useAiQuestionSuggestions(
  segments: TranscriptSegmentLocal[],
  isTranscribing: boolean,
) {
  const [questions, setQuestions] = useState<AiSuggestedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const lastProcessedCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build readable transcript
  const buildTranscriptText = useCallback((segs: TranscriptSegmentLocal[]) => {
    return segs
      .filter(s => s.isFinal)
      .map(s => `${s.speaker === 'DOCTOR' ? 'Doctor' : 'Patient'}: ${s.translatedText || s.text}`)
      .join('\n');
  }, []);

  const markAnswered = useCallback((questionId: string) => {
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, answered: true } : q)
    );
  }, []);

  // Generate questions using the LLM consult endpoint
  const generateQuestions = useCallback(async (segs: TranscriptSegmentLocal[]) => {
    const transcriptText = buildTranscriptText(segs);
    if (!transcriptText.trim() || transcriptText.length < 20) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    try {
      const result = await api.post<{ questions?: Array<{q:string;c:string}> }>(
        API.AI.SUGGEST_QUESTIONS,
        { transcript: transcriptText }
      );

      let parsed: Array<{ q: string; c: string }> = [];

      if (result?.questions && Array.isArray(result.questions)) {
        parsed = result.questions;
      }

      if (parsed.length > 0) {
        const validCategories = ['symptom', 'modality', 'mental', 'general', 'history'];
        const newQuestions: AiSuggestedQuestion[] = parsed
          .filter(item => item.q && typeof item.q === 'string' && item.q.length > 3)
          .slice(0, 4)
          .map((item, idx) => ({
            id: `q-${Date.now()}-${idx}`,
            question: item.q.trim(),
            category: (validCategories.includes(item.c) ? item.c : 'symptom') as AiSuggestedQuestion['category'],
            answered: false,
          }));

        if (newQuestions.length > 0) {
          setQuestions(newQuestions);
        }
      }
    } catch (err: any) {
      // Silently ignore errors (network, abort, parse failures)
      if (err?.name !== 'AbortError') {
        console.debug('[AI Questions] generation failed:', err?.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [buildTranscriptText]);

  // Trigger on transcript changes — works during AND after recording
  useEffect(() => {
    const finalSegments = segments.filter(s => s.isFinal);
    const newCount = finalSegments.length;

    // Need at least 2 segments total, and 2+ new since last generation
    if (newCount < 2) return;
    if (newCount - lastProcessedCountRef.current < 2) return;

    // Clear existing debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Shorter debounce while actively transcribing, longer when paused
    const delay = isTranscribing ? 4000 : 1500;

    debounceTimerRef.current = setTimeout(() => {
      lastProcessedCountRef.current = newCount;
      generateQuestions(finalSegments);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [segments.length, isTranscribing, generateQuestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return { questions, isGenerating, markAnswered };
}
