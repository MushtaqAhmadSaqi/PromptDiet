import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function DiffView({ original, compressed }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!compressed) return;
    navigator.clipboard.writeText(compressed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const origLines = (original || '').split('\n');
  const compLines = (compressed || '').split('\n');

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      {/* Pane Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300 uppercase tracking-wider">Compressed Diff</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
            {compLines.length} lines ({Math.max(0, origLines.length - compLines.length)} pruned)
          </span>
        </div>

        <button
          onClick={handleCopy}
          disabled={!compressed}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs disabled:opacity-40"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? 'Copied' : 'Copy Output'}</span>
        </button>
      </div>

      {/* Line Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed space-y-0.5">
        {compLines.map((line, idx) => {
          const isRepeatMarker = line.includes('[previous line repeated') || line.includes('__repeated');
          const isErrorLine = /error|fail|exception|traceback/i.test(line);

          let lineClass = 'text-slate-300';
          let prefix = '  ';

          if (isRepeatMarker) {
            lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2 font-medium';
            prefix = '+ ';
          } else if (isErrorLine) {
            lineClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2 font-bold';
            prefix = '! ';
          }

          return (
            <div key={idx} className={`py-0.5 px-1.5 rounded-sm whitespace-pre-wrap break-all ${lineClass}`}>
              <span className="text-slate-600 select-none mr-2 inline-block w-8 text-right">{idx + 1}</span>
              <span className="select-none font-bold text-slate-500 mr-1">{prefix}</span>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

