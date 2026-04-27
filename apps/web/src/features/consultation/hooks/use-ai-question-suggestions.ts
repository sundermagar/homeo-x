import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../lib/api-client';
import type { TranscriptSegmentLocal } from '../../../types/scribing';

export interface AiSuggestedQuestion {
  id: string;
  question: string;
  category: 'symptom' | 'modality' | 'mental' | 'general' | 'history';
  answered: boolean;
}

/**
 * Hook that generates AI follow-up questions from live transcript.
 * Token-efficient: only triggers after sufficient new content and uses debouncing.
 * Runs on the EXISTING /ai/suggest/soap endpoint to avoid needing a new backend route.
 */
export function useAiQuestionSuggestions(
  segments: TranscriptSegmentLocal[],
  isTranscribing: boolean,
) {
  const [questions, setQuestions] = useState<AiSuggestedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    setIsGenerating(true);
    try {
      // Use the existing translate endpoint as a lightweight AI call
      // with a custom prompt to generate questions
      const result = await api.post<{ translated: string }>('/api/v1/ai/translate', {
        text: `TASK: Generate 3-4 short follow-up clinical questions a homeopathic doctor should ask based on this conversation. Focus on uncovered symptoms, modalities (worse/better from), mental state, and duration.

CONVERSATION:
${transcriptText.slice(-1500)}

RULES:
- Output ONLY a JSON array of objects: [{"q":"question text","c":"category"}]
- Categories: symptom, modality, mental, general, history
- Questions MUST be in English only
- Max 4 questions
- Skip questions already answered in the conversation
- Keep questions SHORT (under 15 words)`,
        targetLanguage: 'en',
      });

      // Parse the AI response
      try {
        const raw = result.translated;
        // Extract JSON array from response
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]) as Array<{ q: string; c: string }>;
          const newQuestions: AiSuggestedQuestion[] = parsed
            .filter(item => item.q && typeof item.q === 'string')
            .slice(0, 4)
            .map((item, idx) => ({
              id: `q-${Date.now()}-${idx}`,
              question: item.q,
              category: (['symptom', 'modality', 'mental', 'general', 'history'].includes(item.c)
                ? item.c
                : 'symptom') as AiSuggestedQuestion['category'],
              answered: false,
            }));

          if (newQuestions.length > 0) {
            setQuestions(newQuestions);
          }
        }
      } catch {
        // Parsing failed — silently ignore, keep old questions
      }
    } catch {
      // API call failed — silently ignore
    } finally {
      setIsGenerating(false);
    }
  }, [buildTranscriptText]);

  // Auto-fire disabled: this hook's output was never rendered in the UI
  // (only modeQuestions feeds `allQuestions`). markAnswered below still works
  // as a pure-local state helper without burning ~12 Claude calls per session.
  // See consultation-stage.tsx:447 for where allQuestions is assembled.
  void generateQuestions;
  void segments;
  void isTranscribing;

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
