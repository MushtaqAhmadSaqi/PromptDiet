import React from 'react';
import { FileText, Code2, ShieldAlert, Cpu } from 'lucide-react';

export default function StageToggles({ stages, setStages, contentType, setContentType }) {
  const toggleStage = (stageKey) => {
    setStages((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
      {/* Content Type Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type:</span>
        <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
          {['auto', 'log', 'json', 'prompt'].map((type) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className={`px-2.5 py-1 rounded-md font-medium transition capitalize ${
                contentType === type
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Stage Toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stages:</span>

        {/* Stage 1: Log Dedup */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
          <input
            type="checkbox"
            checked={stages.log_dedup}
            onChange={() => toggleStage('log_dedup')}
            className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950"
          />
          <span className={`flex items-center gap-1 ${stages.log_dedup ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Stage 1 (Log Dedup)
          </span>
        </label>

        {/* Stage 2: JSON Crusher */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
          <input
            type="checkbox"
            checked={stages.json_crush}
            onChange={() => toggleStage('json_crush')}
            className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950"
          />
          <span className={`flex items-center gap-1 ${stages.json_crush ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            Stage 2 (JSON Crusher)
          </span>
        </label>

        {/* Stage 4: KV-Cache Auditor */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
          <input
            type="checkbox"
            checked={stages.cache_audit}
            onChange={() => toggleStage('cache_audit')}
            className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950"
          />
          <span className={`flex items-center gap-1 ${stages.cache_audit ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Stage 4 (Cache Auditor)
          </span>
        </label>
      </div>
    </div>
  );
}

