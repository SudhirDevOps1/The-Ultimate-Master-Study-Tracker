import { useEffect, useRef, useCallback } from 'react';

interface ActivityDetectionOptions {
  inactivityThresholdMs?: number; // Default 10 minutes
  onInactivity?: () => void;
  onActivity?: () => void;
}

export function useActivityDetection(options: ActivityDetectionOptions = {}) {
  const {
    inactivityThresholdMs = 10 * 60 * 1000, // 10 minutes
    onInactivity,
    onActivity,
  } = options;

  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef = useRef<boolean>(false);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // If we were inactive, call onActivity
    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      onActivity?.();
    }

    // Reset the inactivity timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      isInactiveRef.current = true;
      onInactivity?.();
    }, inactivityThresholdMs);
  }, [inactivityThresholdMs, onInactivity, onActivity]);

  useEffect(() => {
    // Track user interactions
    const events = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll', 'mousemove'];
    
    const handleActivity = () => {
      recordActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial inactivity timeout
    recordActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [recordActivity]);

  return {
    isInactive: isInactiveRef.current,
    lastActivityTime: lastActivityRef.current,
  };
}
