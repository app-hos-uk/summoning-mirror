import { useEffect, useRef, useCallback } from 'react';

export function useInactivityTimer(
  onTimeout: () => void,
  timeoutMs: number = 60000,
  enabled: boolean = true,
  graceMs: number = 0
) {
  const onTimeoutRef = useRef(onTimeout);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    if (enabled) {
      timerRef.current = setTimeout(() => onTimeoutRef.current(), timeoutMs);
    }
  }, [clear, enabled, timeoutMs]);

  useEffect(() => {
    if (graceRef.current) {
      clearTimeout(graceRef.current);
      graceRef.current = null;
    }

    if (!enabled) {
      clear();
      return;
    }

    const events = ['touchstart', 'click', 'keydown'] as const;
    let listenersAttached = false;

    const start = () => {
      reset();
      if (!listenersAttached) {
        events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
        listenersAttached = true;
      }
    };

    if (graceMs > 0) {
      graceRef.current = setTimeout(start, graceMs);
    } else {
      start();
    }

    return () => {
      if (graceRef.current) {
        clearTimeout(graceRef.current);
        graceRef.current = null;
      }
      clear();
      if (listenersAttached) {
        events.forEach((e) => document.removeEventListener(e, reset));
      }
    };
  }, [reset, enabled, clear, graceMs]);

  return reset;
}
