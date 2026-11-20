import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, Film, Zap } from 'lucide-react';

const FPS = 30;
const TOTAL_FRAMES = 180; // 6-second loopable motion-graphics reel

// Spring-inspired smooth ease-out curve (no linear interpolation)
function easeOutBack(t) {
  const c1 = 1.45;
  const c3 = c1 + 1;
  const x = Math.max(0, Math.min(1, t));
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

export default function MotionShowcaseModal({ isOpen, onClose, metrics }) {
  const dialogRef = useRef(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const origTokens = metrics?.original_tokens || 1420;
  const compTokens = metrics?.compressed_tokens || 218;
  const savedTokens = Math.max(0, origTokens - compTokens);
  const reductionPct = metrics?.token_reduction_pct || 84.6;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      setFrame(0);
      setIsPlaying(true);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setFrame(95);
      return;
    }

    let rafId;
    let lastTime = performance.now();
    const frameInterval = 1000 / FPS;

    const tick = (now) => {
      if (now - lastTime >= frameInterval) {
        lastTime = now;
        setFrame((f) => (f + 1) % TOTAL_FRAMES);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying]);

  // Multi-property staggered spring progress
  const titleIn = easeOutBack(frame / 22);
  const badgeIn = easeOutBack((frame - 6) / 20);
  const barIn = easeOutCubic((frame - 22) / 38);
  const card1In = easeOutBack((frame - 36) / 20);
  const card2In = easeOutBack((frame - 42) / 20);
  const card3In = easeOutBack((frame - 48) / 20);
  const breathe = Math.sin((frame / FPS) * Math.PI * 1.4) * 3;
  const exitFade = frame > 165 ? 1 - (frame - 165) / 15 : 1;

  const animatedPct = (reductionPct * barIn).toFixed(1);
  const animatedSaved = Math.round(savedTokens * barIn);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="pd-motion-title"
      className="pd-dialog max-w-3xl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Film className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="pd-motion-title">PromptDiet Motion Reel (Remotion Preview)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close motion showcase"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 16:9 Five-Layer Motion Graphics Stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950 select-none">
          {/* Layer 1: Animated Gradient Mesh Background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 22% 25%, rgba(99,102,241,0.28), transparent 52%), radial-gradient(circle at 78% 75%, rgba(16,185,129,0.20), transparent 50%), #020617',
              transform: `scale(${1 + Math.sin(frame / 45) * 0.03})`,
            }}
          />

          {/* Layer 2 & 3: Staggered Graphics & Type */}
          <div
            className="relative z-10 h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center"
            style={{ opacity: exitFade }}
          >
            <div
              style={{
                opacity: Math.min(1, Math.max(0, badgeIn)),
                transform: `translateY(${(1 - badgeIn) * 18}px) scale(${0.92 + badgeIn * 0.08})`,
              }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-[11px] font-semibold uppercase tracking-widest mb-4"
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Deterministic O(N) Compression
            </div>

            <h3
              style={{
                opacity: Math.min(1, Math.max(0, titleIn)),
                transform: `translateY(${(1 - titleIn) * 26 + breathe * 0.4}px) scale(${0.94 + titleIn * 0.06})`,
              }}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-2 tabular-nums"
            >
              -{animatedPct}% <span className="text-indigo-400">Token Bloat</span>
            </h3>

            <p
              style={{
                opacity: Math.min(1, Math.max(0, barIn)),
                transform: `translateY(${(1 - barIn) * 14}px)`,
              }}
              className="text-xs sm:text-sm text-slate-300 max-w-lg mb-6"
            >
              Pruned <strong className="text-emerald-400 font-mono tabular-nums">{animatedSaved.toLocaleString()}</strong> tokens while preserving stack traces and KV-cache prefix alignment.
            </p>

            {/* Staggered KPI Cards */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xl">
              {[
                { label: 'Original', val: `${origTokens.toLocaleString()} tok`, p: card1In, cls: 'text-slate-200' },
                { label: 'Compressed', val: `${compTokens.toLocaleString()} tok`, p: card2In, cls: 'text-indigo-300' },
                { label: 'Cache Status', val: '100% Aligned', p: card3In, cls: 'text-emerald-400' },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    opacity: Math.min(1, Math.max(0, card.p)),
                    transform: `translateY(${(1 - card.p) * 22}px) scale(${0.92 + card.p * 0.08})`,
                  }}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/70 backdrop-blur-sm"
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{card.label}</div>
                  <div className={`text-sm sm:text-base font-bold font-mono tabular-nums ${card.cls}`}>{card.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Layer 4 & 5: Subtle Color Grade + Vignette */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 58%, rgba(2, 6, 23, 0.72) 100%)',
            }}
          />
        </div>

        {/* Transport Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause motion reel' : 'Play motion reel'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFrame(0);
              setIsPlaying(true);
            }}
            aria-label="Restart motion reel"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            aria-label="Timeline scrubber"
            min="0"
            max={TOTAL_FRAMES - 1}
            value={frame}
            onChange={(e) => {
              setIsPlaying(false);
              setFrame(Number(e.target.value));
            }}
            className="flex-1 accent-indigo-500 cursor-pointer"
          />

          <span className="font-mono text-[11px] text-slate-400 tabular-nums w-20 text-right">
            {frame} / {TOTAL_FRAMES}f
          </span>
        </div>
      </div>
    </dialog>
  );
}
