import { useState, useEffect, useRef, useCallback } from 'react';

export const useBattleTimer = (onExpire?: () => void) => {
  const [timeLeft, setTimeLeftState] = useState<number>(0);
  const [isTimeLow, setIsTimeLow] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const targetEndTimeRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Sync remaining seconds from server
  const syncTime = useCallback((seconds: number) => {
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeftState(seconds);
    setIsTimeLow(seconds <= 60 && seconds > 0);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning || targetEndTimeRef.current === null) return;

    const tick = () => {
      const remainingMs = targetEndTimeRef.current! - Date.now();
      const remainingSecs = Math.max(0, Math.round(remainingMs / 1000));

      setTimeLeftState(remainingSecs);
      setIsTimeLow(remainingSecs <= 60 && remainingSecs > 0);

      if (remainingSecs <= 0) {
        onExpireRef.current?.();
        targetEndTimeRef.current = null; // stop ticking
        setIsRunning(false);
      }
    };

    const intervalId = setInterval(tick, 200); // Check frequently for smoother rendering

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    isTimeLow,
    syncTime,
    formatTime,
  };
};
