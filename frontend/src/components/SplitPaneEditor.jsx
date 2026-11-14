import React, { useState } from 'react';
import DiffView from './DiffView';
import CacheWarnings from './CacheWarnings';
import { Trash2, Eye, GitCompare, Loader2 } from 'lucide-react';

export default function SplitPaneEditor({
  content,
  setContent,
  compressedData,
  isLoading,
  error,
}) {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' or 'raw'

  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content ? content.length : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Cache Warnings Banner */}
      {compressedData?.cache_violations?.length > 0 && (
        <CacheWarnings violations={compressedData.cache_violations} />
      )}

      {/* Split Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[550px]">
        {/* Left Pane: Raw Input */}
        <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500/50 transition">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">Raw Input</span>
              <span className="text-slate-500 font-mono">
                {lineCount} lines · {charCount} chars
              </span>
            </div>

            <button
              onClick={() => setContent('')}
              disabled={!content}
              title="Clear input"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition disabled:opacity-30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste raw build logs, MCP tool JSON schemas, or verbose system prompts here..."
            className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-slate-100 placeholder-slate-600 resize-none focus:outline-none leading-relaxed overflow-auto"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Compressed Output / Diff */}
        <div className="relative flex flex-col h-full">
          {/* View Mode Toggle Header */}
          <div className="absolute top-2 right-4 z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition ${
                viewMode === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>Diff</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition ${
                viewMode === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Raw</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-20 rounded-xl">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-indigo-400 shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Optimizing with Python Engine...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 mb-3">
              {error}
            </div>
          )}

          {/* Content */}
          {viewMode === 'diff' ? (
            <DiffView
              original={content}
              compressed={compressedData?.compressed || ''}
            />
          ) : (
            <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Raw Compressed Text
              </div>
              <pre className="flex-1 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all overflow-auto">
                {compressedData?.compressed || 'No compressed output yet.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

