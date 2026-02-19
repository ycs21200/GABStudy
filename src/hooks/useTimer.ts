import { useState, useRef, useCallback, useEffect } from "react";

interface UseTimerResult {
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset to 0 */
  reset: () => void;
  /** Reset to a specific value (for resume) */
  setElapsed: (ms: number) => void;
  /** Formatted time string "MM:SS" */
  formatted: string;
  /** Elapsed seconds (integer) */
  elapsedSec: number;
}

export function useTimer(initialMs: number = 0): UseTimerResult {
  const [elapsedMs, setElapsedMs] = useState(initialMs);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(initialMs);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const total = accumulatedRef.current + (now - startTimeRef.current);
      setElapsedMs(total);
    }, 100);
  }, [stop]);

  const pause = useCallback(() => {
    if (isRunning) {
      accumulatedRef.current =
        accumulatedRef.current + (Date.now() - startTimeRef.current);
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
  }, [stop]);

  const setElapsed = useCallback(
    (ms: number) => {
      stop();
      accumulatedRef.current = ms;
      setElapsedMs(ms);
      setIsRunning(false);
    },
    [stop]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return {
    elapsedMs,
    isRunning,
    start,
    pause,
    reset,
    setElapsed,
    formatted,
    elapsedSec,
  };
}
