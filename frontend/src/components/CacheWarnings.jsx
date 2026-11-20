import React from 'react';
import { AlertTriangle, Info, Wand2 } from 'lucide-react';

export default function CacheWarnings({ violations, onAutoFix }) {
  if (!violations || violations.length === 0) return null;

  return (
    <div
      role="alert"
      className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 my-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>KV-Cache Prefix Violation Detected ({violations.length})</span>
        </div>

        {onAutoFix && (
          <button
            type="button"
            onClick={onAutoFix}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Auto-Fix: Move to Suffix</span>
          </button>
        )}
      </div>

      <p className="text-xs text-amber-200/80 mb-3 leading-relaxed">
        Dynamic variables placed in the prompt prefix window invalidate provider KV-cache alignment
        (e.g. Anthropic Prompt Caching, OpenAI Caching). Moving dynamic variables to the prompt suffix
        preserves the static prefix and cuts latency by 50%–80%.
      </p>

      <div className="space-y-2">
        {violations.map((violation, idx) => (
          <div
            key={`${violation.line_number}-${violation.column}-${idx}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums">
                L{violation.line_number}:C{violation.column}
              </span>
              <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 break-all">
                &ldquo;{violation.matched_text}&rdquo;
              </span>
              <span className="text-[11px] text-amber-400 font-medium capitalize">
                [{violation.pattern_name.replace(/_/g, ' ')}]
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span>{violation.suggestion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
