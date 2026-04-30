import { useState, useEffect, useRef, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveProps<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
}

export function useAutoSave<T>({ value, onSave, delay = 1000 }: UseAutoSaveProps<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const valueRef = useRef(value);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref up to date to avoid dependency cycle in useCallback
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const triggerSave = useCallback(async (currentValue: T) => {
    try {
      setStatus('saving');
      await onSave(currentValue);
      setStatus('saved');
      
      // Reset back to idle after showing 'saved' for a bit
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setStatus('error');
    }
  }, [onSave]);

  useEffect(() => {
    // Skip initial mount save
    if (value === undefined) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving status to idle if user starts typing again
    if (status === 'saved' || status === 'error') {
      setStatus('idle');
    }

    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(value);
    }, delay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [value, delay, triggerSave]); // status removed from deps to prevent infinite loop

  // Manual save trigger (e.g. for onBlur)
  const forceSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    triggerSave(valueRef.current);
  };

  return { status, forceSave };
}
