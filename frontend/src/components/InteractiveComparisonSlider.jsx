import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

export default function InteractiveComparisonSlider({ original, compressed }) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback(
    (clientX) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSliderPosition(pct);
    },
    []
  );

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none font-mono text-xs"
    >
      {/* Background (Compressed / Optimized) */}
      <div className="absolute inset-0 p-4 overflow-auto text-emerald-200/90 whitespace-pre-wrap break-all bg-emerald-950/10">
        <div className="sticky top-0 right-0 float-right px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Optimized Output
        </div>
        {compressed || 'No compressed text available'}
      </div>

      {/* Foreground (Original / Raw) clipped by sliderPosition */}
      <div
        className="absolute inset-0 p-4 overflow-auto text-slate-300 whitespace-pre-wrap break-all bg-slate-950 border-r border-indigo-500/80 shadow-2xl"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <div className="sticky top-0 left-0 float-left px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
          Original Input
        </div>
        {original || 'No original text available'}
      </div>

      {/* Draggable Divider Handle */}
      <div
        className="absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize group"
        style={{ left: `calc(${sliderPosition}% - 12px)`, width: '24px' }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="w-6 h-10 rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg border border-indigo-400 transition-colors">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 pointer-events-none backdrop-blur-xs">
        Drag slider left / right to compare transformation
      </div>
    </div>
  );
}
