import { useState, useRef, useCallback, useEffect } from 'react';
import { AnalysisTheory } from '../types';
import { useAuthStore } from '@/shared/stores/auth-store';

const STREAM_TIMEOUT_MS = 15_000; // 15 seconds

export interface AIAnalysisRequest {
  theory: AnalysisTheory | string;
  question: string;
  imageUrl?: string;
  patientContext?: string;
  regid?: number;
  sessionId?: string;
  stream?: boolean;
}

interface UseAiAnalysisStreamReturn {
  content: string;
  isStreaming: boolean;
  provider: string | null;
  sessionId: string | null;
  error: string | null;
  start: (params: AIAnalysisRequest) => void;
  stop: () => void;
  reset: () => void;
}

export function useAiAnalysisStream(): UseAiAnalysisStreamReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gotFirstChunkRef = useRef(false);

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stop = useCallback(() => {
    clearTimeout_();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setContent('');
    setProvider(null);
    setSessionId(null);
    setError(null);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout_();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const start = useCallback(async (params: AIAnalysisRequest) => {
    stop(); // Cancel any ongoing request
    
    setContent('');
    setIsStreaming(true);
    setProvider(null);
    setSessionId(null);
    setError(null);
    gotFirstChunkRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const token = useAuthStore.getState().token;
    const baseURL = import.meta.env['VITE_API_URL'] || '/api';

    // Set a hard timeout — if no first data chunk arrives within 15s, abort
    timeoutRef.current = setTimeout(() => {
      if (!gotFirstChunkRef.current && abortControllerRef.current === controller) {
        controller.abort();
        setError('AI service is busy. Please wait a moment and try again.');
        setIsStreaming(false);
      }
    }, STREAM_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseURL}/medical-cases/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(import.meta.env.DEV ? { 'x-forwarded-host': window.location.host } : {})
        },
        body: JSON.stringify({ ...params, stream: true }),
        signal: controller.signal
      });

      if (!response.ok) {
        clearTimeout_();
        const statusText = response.status === 429 
          ? 'AI service is experiencing high traffic. Please wait a moment and try again.'
          : `Server error (${response.status}). Please try again.`;
        throw new Error(statusText);
      }

      if (!response.body) {
        clearTimeout_();
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }

        // We got data — clear the timeout since the stream is alive
        if (!gotFirstChunkRef.current) {
          gotFirstChunkRef.current = true;
          clearTimeout_();
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            if (dataStr.trim() === '[DONE]') {
              setIsStreaming(false);
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.chunk) {
                setContent(prev => prev + data.chunk);
              }
              if (data.provider) {
                setProvider(data.provider);
              }
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
              if (data.error) {
                // Server sent an error through the stream — stop immediately
                setError(data.error);
                setIsStreaming(false);
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data chunk:', e);
            }
          }
        }
      }
    } catch (err: any) {
      clearTimeout_();
      if (err.name === 'AbortError') {
        // Only show "stopped by user" if there was no error already set (timeout sets its own error)
        if (!gotFirstChunkRef.current) {
          setError('AI service is busy or timed out. Please wait a moment and try again.');
        } else {
          setContent(prev => prev + '\n\n**Analysis stopped by user**.');
        }
      } else {
        setError(err.message || 'An unknown error occurred');
      }
    } finally {
      clearTimeout_();
      setIsStreaming(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [stop]);

  return {
    content,
    isStreaming,
    provider,
    sessionId,
    error,
    start,
    stop,
    reset
  };
}
