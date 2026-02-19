import { useState, useRef, useCallback, useEffect } from "react";

interface UseCountdownTimerResult {
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether time has expired */
  isExpired: boolean;
  /** Start or resume the countdown */
  start: () => void;
  /** Pause the countdown */
  pause: () => void;
  /** Reset to initial duration */
  reset: () => void;
  /** Formatted remaining time "MM:SS" */
  formatted: string;
  /** Progress 0-1 (1 = full time remaining) */
  progress: number;
}

export function useCountdownTimer(
  durationMs: number,
  onExpire?: () => void
): UseCountdownTimerResult {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const expiredRef = useRef(false);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (expiredRef.current) return;
    stop();
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const total = accumulatedRef.current + (now - startTimeRef.current);
      setElapsedMs(total);
      if (total >= durationMs && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 100);
  }, [stop, durationMs, onExpire]);

  const pause = useCallback(() => {
    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      setElapsedMs(accumulatedRef.current);
    }
    stop();
    setIsRunning(false);
  }, [isRunning, stop]);

  const reset = useCallback(() => {
    stop();
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setIsRunning(false);
    expiredRef.current = false;
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progress = durationMs > 0 ? remainingMs / durationMs : 0;

  return {
    remainingMs,
    elapsedMs,
    isRunning,
    isExpired: elapsedMs >= durationMs,
    start,
    pause,
    reset,
    formatted,
    progress,
  };
}
