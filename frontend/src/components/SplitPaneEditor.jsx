import React, { useState, useCallback, useRef, useEffect, Suspense, lazy } from 'react';
import DiffView from './DiffView';
import InteractiveComparisonSlider from './InteractiveComparisonSlider';
import StageBreakdownView from './StageBreakdownView';
import CacheWarnings from './CacheWarnings';
import { runViewTransition } from '../utils/viewTransitions';
import {
  Trash2,
  Eye,
  GitCompare,
  SlidersHorizontal,
  Layers,
  Box,
  Loader2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Upload,
} from 'lucide-react';

const TokenCompressor3D = lazy(() => import('./TokenCompressor3D'));

const OUTPUT_TABS = [
  { id: 'diff', label: 'Diff', icon: GitCompare },
  { id: 'raw', label: 'Raw', icon: Eye },
  { id: 'slider', label: 'Slider', icon: SlidersHorizontal },
  { id: 'stages', label: 'Pipeline', icon: Layers },
  { id: '3d', label: '3D View', icon: Box },
];

export default function SplitPaneEditor({
  content,
  setContent,
  compressedData,
  isLoading,
  error,
  isZenMode = false,
  onToggleZenMode,
  onCopyOutput,
  onAutoFixCache,
  onFileDropToast,
}) {
  const [viewMode, setViewMode] = useState('diff');
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content ? content.length : 0;
  const compressedText = compressedData?.compressed || '';

  const handleTabChange = (nextTab) => {
    if (nextTab === viewMode) return;
    runViewTransition(() => setViewMode(nextTab));
  };

  const handleCopy = useCallback(async () => {
    if (!compressedText) return;
    if (onCopyOutput) {
      await onCopyOutput();
    } else {
      try {
        await navigator.clipboard.writeText(compressedText);
      } catch {
        // fallback handled below
      }
    }
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [compressedText, onCopyOutput]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (text) {
        setContent(text);
        if (onFileDropToast) onFileDropToast(file.name);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className={
        isZenMode
          ? 'fixed inset-0 z-40 bg-slate-950 p-4 sm:p-6 flex flex-col gap-3'
          : 'flex flex-col gap-3'
      }
    >
      {/* Cache Warnings Banner with 1-click Auto-Fix */}
      {compressedData?.cache_violations?.length > 0 && (
        <CacheWarnings
          violations={compressedData.cache_violations}
          onAutoFix={onAutoFixCache}
        />
      )}

      {/* Split Pane Grid */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${
          isZenMode ? 'flex-1 min-h-0' : 'h-[560px]'
        }`}
      >
        {/* Left Pane: Raw Input with Drag & Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col h-full bg-slate-950 border rounded-xl overflow-hidden transition ${
            isDragOver
              ? 'border-indigo-400 ring-2 ring-indigo-500/30'
              : 'border-slate-800 focus-within:border-indigo-500/50'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">Raw Input</span>
              <span className="text-slate-500 font-mono tabular-nums truncate">
                {lineCount} lines · {charCount} chars
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <label
                title="Load a .log, .txt, or .json file"
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Import File</span>
                <input
                  type="file"
                  accept=".txt,.log,.json,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
                      if (text) {
                        setContent(text);
                        if (onFileDropToast) onFileDropToast(file.name);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => setContent('')}
                disabled={!content}
                aria-label="Clear raw input"
                title="Clear input"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-20 bg-indigo-950/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-400 text-indigo-200 text-xs font-semibold shadow-xl">
                Drop .log, .json, or .txt file to compress
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            aria-label="Raw prompt, JSON schema, or build log input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or drop raw build logs, MCP tool JSON schemas, or verbose system prompts here..."
            className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-slate-100 placeholder-slate-600 resize-none focus:outline-none leading-relaxed overflow-auto"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Unified Output Header + 5 Interactive Views */}
        <div className="relative flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          {/* Unified Non-Overlapping Output Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Compressed output view modes"
              className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5"
            >
              {OUTPUT_TABS.map(({ id, label, icon: TabIcon }) => {
                const active = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleTabChange(id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className="w-3 h-3" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Copy + Zen Mode */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!compressedText}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onToggleZenMode && (
                <button
                  type="button"
                  onClick={onToggleZenMode}
                  aria-label={isZenMode ? 'Exit Zen fullscreen mode' : 'Enter Zen fullscreen mode'}
                  title={isZenMode ? 'Exit Zen Mode (Esc)' : 'Zen Fullscreen (Ctrl/Cmd+Shift+F)'}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {isZenMode ? (
                    <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-indigo-400 shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Optimizing Payload...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div role="alert" className="m-3 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Active Output View (View Transitions enabled) */}
          <div className="vt-output-pane flex-1 min-h-0 flex flex-col">
            {viewMode === 'diff' && <DiffView original={content} compressed={compressedText} />}

            {viewMode === 'raw' && (
              <pre className="flex-1 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all overflow-auto">
                {compressedText || 'No compressed output yet.'}
              </pre>
            )}

            {viewMode === 'slider' && (
              <InteractiveComparisonSlider original={content} compressed={compressedText} />
            )}

            {viewMode === 'stages' && (
              <StageBreakdownView compressedData={compressedData} originalContent={content} />
            )}

            {viewMode === '3d' && (
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                    Loading 3D Token Lattice...
                  </div>
                }
              >
                <TokenCompressor3D metrics={compressedData?.metrics} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
