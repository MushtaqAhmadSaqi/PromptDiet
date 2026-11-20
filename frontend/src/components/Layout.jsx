import React from 'react';
import { Zap, Cpu, Database, Keyboard, Film } from 'lucide-react';

export default function Layout({
  children,
  stats,
  engineMode = 'fastapi',
  onOpenShortcuts,
  onOpenMotionPreview,
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
              <Zap className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white truncate">PromptDiet</h1>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Local-First
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                System Prompt, MCP Schema &amp; Build-Log Token Compressor
              </p>
            </div>
          </div>

          {/* Right Status, Motion Tour & Shortcuts */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs flex-shrink-0">
            {stats && stats.total_tokens_saved > 0 && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium tabular-nums">
                <span>{new Intl.NumberFormat().format(stats.total_tokens_saved)} total tokens pruned</span>
              </div>
            )}

            {onOpenMotionPreview && (
              <button
                type="button"
                onClick={onOpenMotionPreview}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="Open animated Remotion-style Motion Showcase"
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Motion Reel</span>
              </button>
            )}

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                aria-label="Open keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <kbd className="hidden sm:inline font-mono text-[10px] text-slate-400">?</kbd>
              </button>
            )}

            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
              title={
                engineMode === 'fastapi'
                  ? 'Connected to Python FastAPI engine'
                  : 'Running offline in deterministic browser engine'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  engineMode === 'fastapi' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden md:inline">Engine:</span>
              <span className="font-mono text-slate-200">
                {engineMode === 'fastapi' ? 'FastAPI' : 'Local JS'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            PromptDiet · Deterministic O(N) Context Compression with KV-Cache Alignment
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              SQLite / Supabase REST
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              tiktoken / Gemini Flash
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
