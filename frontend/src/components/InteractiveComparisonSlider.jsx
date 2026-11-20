import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

export default function InteractiveComparisonSlider({ original, compressed }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(pct);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || !e.touches || e.touches.length === 0) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handlePointerEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handlePointerEnd]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((p) => Math.max(5, p - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((p) => Math.min(95, p + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(5);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(95);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full min-h-0 bg-slate-950 overflow-hidden select-none font-mono text-xs"
    >
      {/* Background (Compressed / Optimized) */}
      <div className="absolute inset-0 p-4 overflow-auto text-emerald-200/90 whitespace-pre-wrap break-all bg-emerald-950/10">
        <div className="sticky top-0 right-0 float-right px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
          Optimized Output
        </div>
        {compressed || 'No compressed text available yet.'}
      </div>

      {/* Foreground (Original / Raw) clipped by sliderPosition */}
      <div
        className="absolute inset-0 p-4 overflow-auto text-slate-300 whitespace-pre-wrap break-all bg-slate-950 border-r border-indigo-500/80 shadow-2xl"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <div className="sticky top-0 left-0 float-left px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700 mb-2 mr-2">
          Original Input
        </div>
        {original || 'No original text available yet.'}
      </div>

      {/* Draggable & Keyboard-Accessible Divider Handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparison split slider between original and compressed text"
        aria-valuemin={5}
        aria-valuemax={95}
        aria-valuenow={Math.round(sliderPosition)}
        onKeyDown={handleKeyDown}
        className="absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize group touch-none focus-visible:outline-none"
        style={{ left: `calc(${sliderPosition}% - 14px)`, width: '28px' }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="w-0.5 h-full bg-indigo-500/70 absolute inset-y-0 left-1/2 -translate-x-1/2" />
        <div className="relative w-7 h-10 rounded-full bg-indigo-600 group-hover:bg-indigo-500 group-focus-visible:ring-2 group-focus-visible:ring-white text-white flex items-center justify-center shadow-lg border border-indigo-400 transition-colors">
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 pointer-events-none backdrop-blur-sm tabular-nums">
        Drag handle or use ← / → keys ({Math.round(sliderPosition)}% split)
      </div>
    </div>
  );
}
