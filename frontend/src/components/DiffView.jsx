import React, { memo, useMemo } from 'react';

const RE_ERROR_LINE = /error|fail|exception|traceback/i;

const DiffView = memo(function DiffView({ original, compressed }) {
  const { compLines, prunedCount } = useMemo(() => {
    const orig = original ? original.split('\n') : [];
    const comp = compressed ? compressed.split('\n') : [];
    return {
      compLines: comp,
      prunedCount: Math.max(0, orig.length - comp.length),
    };
  }, [original, compressed]);

  if (!compressed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
        <p className="font-medium text-slate-400 mb-1">No compressed output yet</p>
        <p>Paste a build log, MCP JSON schema, or system prompt on the left — or pick a 1-Click Demo above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
        <span>
          {compLines.length} output lines
          {prunedCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              -{prunedCount} pruned
            </span>
          )}
        </span>
        <span className="text-[10px] text-slate-500">
          <span className="text-emerald-400 mr-2">+ collapsed</span>
          <span className="text-rose-400">! error preserved</span>
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed space-y-0.5">
        {compLines.map((line, idx) => {
          const isRepeatMarker = line.includes('[previous line repeated') || line.includes('__repeated');
          const isErrorLine = RE_ERROR_LINE.test(line);

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
            <div
              key={idx}
              className={`diff-line-item py-0.5 px-1.5 rounded-sm whitespace-pre-wrap break-all ${lineClass}`}
            >
              <span className="text-slate-600 select-none mr-2 inline-block w-8 text-right tabular-nums">
                {idx + 1}
              </span>
              <span className="select-none font-bold text-slate-500 mr-1">{prefix}</span>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default DiffView;
