import { useState, useEffect, useRef } from 'react';

export function useAnimatedNumber(targetValue, duration = 400) {
  const numericTarget = Number(targetValue) || 0;
  const [displayValue, setDisplayValue] = useState(numericTarget);
  const currentValueRef = useRef(numericTarget);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || duration <= 0) {
      currentValueRef.current = numericTarget;
      setDisplayValue(numericTarget);
      return;
    }

    const start = currentValueRef.current;
    const end = numericTarget;
    if (start === end) return;

    startTimeRef.current = performance.now();

    const updateNumber = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;

      currentValueRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateNumber);
      } else {
        currentValueRef.current = end;
        setDisplayValue(end);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateNumber);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericTarget, duration]);

  return displayValue;
}
