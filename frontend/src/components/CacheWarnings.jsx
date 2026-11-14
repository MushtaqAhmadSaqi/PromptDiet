import React from 'react';
import { AlertTriangle, Info, ArrowRight } from 'lucide-react';

export default function CacheWarnings({ violations }) {
  if (!violations || violations.length === 0) return null;

  return (
    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 my-3">
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>KV-Cache Prefix Violation Detected ({violations.length})</span>
      </div>

      <p className="text-xs text-amber-200/80 mb-3 leading-relaxed">
        Dynamic variables placed in the prompt prefix window invalidate provider KV-cache alignment
        (e.g. Anthropic Prompt Caching, OpenAI Caching). Moving dynamic variables to the prompt suffix preserves the static prefix and cuts latency by 50%–80%.
      </p>

      <div className="space-y-2">
        {violations.map((violation, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                L{violation.line_number}:C{violation.column}
              </span>
              <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                "{violation.matched_text}"
              </span>
              <span className="text-[11px] text-amber-400 font-medium capitalize">
                [{violation.pattern_name.replace(/_/g, ' ')}]
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-300 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{violation.suggestion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

