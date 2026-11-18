import { useState, useEffect, useRef } from 'react';

export function useAnimatedNumber(targetValue, duration = 400) {
  const [displayValue, setDisplayValue] = useState(targetValue || 0);
  const startValueRef = useRef(targetValue || 0);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const start = displayValue;
    const end = Number(targetValue) || 0;
    if (start === end) return;

    startValueRef.current = start;
    startTimeRef.current = performance.now();

    const updateNumber = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateNumber);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}
