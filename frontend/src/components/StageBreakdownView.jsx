import React from 'react';
import { CheckCircle2, ShieldCheck, Zap, Cpu, ArrowRight, Layers, FileCode, Clock } from 'lucide-react';
import { formatPercent, formatTokens } from '../utils/formatters';

export default function StageBreakdownView({ compressedData, originalContent }) {
  const metrics = compressedData?.metrics;
  const stagesApplied = compressedData?.stages_applied || [];
  const violations = compressedData?.cache_violations || [];

  const originalLines = originalContent ? originalContent.split('\n').length : 0;
  const compressedLines = compressedData?.compressed ? compressedData.compressed.split('\n').length : 0;
  const linesPruned = Math.max(0, originalLines - compressedLines);

  const stagesList = [
    {
      id: 'log_dedup',
      name: 'Stage 1: Log Noise & Trace Isolator',
      description: 'Collapses sequential identical lines with repeat counts and preserves core stack traces/exceptions.',
      applied: stagesApplied.some((s) => s.toLowerCase().includes('log') || s.toLowerCase().includes('dedup')),
      impact: linesPruned > 0 ? `${linesPruned} redundant lines pruned` : 'Inspected',
      badge: 'Deterministic $O(N)$',
    },
    {
      id: 'json_crush',
      name: 'Stage 2: MCP / JSON Schema Crusher',
      description: 'Strips whitespace, redundant description fields, empty defaults, and structural schema boilerplate.',
      applied: stagesApplied.some((s) => s.toLowerCase().includes('json') || s.toLowerCase().includes('crush')),
      impact: `${formatPercent(metrics?.token_reduction_pct || 0)} payload reduction`,
      badge: 'AST & Token Minify',
    },
    {
      id: 'gemini_rewrite',
      name: 'Stage 3: Gemini Dense Rewriter',
      description: 'Transforms narrative system prompts into high-density constraint tables and pipe-delimited directives.',
      applied: stagesApplied.some((s) => s.toLowerCase().includes('gemini') || s.toLowerCase().includes('rewriter')),
      impact: stagesApplied.some((s) => s.toLowerCase().includes('gemini'))
        ? 'Dense Declarative Format'
        : 'Optional / On-Demand',
      badge: 'Google Gemini',
    },
    {
      id: 'cache_audit',
      name: 'Stage 4: KV-Cache Prefix Aligner',
      description: 'Ensures prompt prefix has zero dynamic timestamps, nonces, or volatile variables for 100% cache hits.',
      applied: true,
      impact: violations.length === 0 ? 'Prefix Clean (100% Cacheable)' : `${violations.length} volatile tokens detected`,
      badge: violations.length === 0 ? 'Aligned' : 'Action Needed',
      isWarning: violations.length > 0,
    },
  ];

  return (
    <div className="h-full bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
            Pipeline Stage Performance Breakdown
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Engine Latency: {metrics?.processing_time_ms ? `${metrics.processing_time_ms.toFixed(1)}ms` : '< 1ms'}
        </span>
      </div>

      {/* High-level summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <span className="text-slate-400 block mb-1">Line Count Delta</span>
          <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>{originalLines}</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-emerald-400 font-bold">{compressedLines}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-auto">
              -{linesPruned} lines
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <span className="text-slate-400 block mb-1">Character Compression</span>
          <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>{metrics?.original_chars ?? originalContent?.length ?? 0}</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-indigo-400 font-bold">{metrics?.compressed_chars ?? 0}</span>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded ml-auto">
              {formatPercent(metrics?.token_reduction_pct || 0)}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <span className="text-slate-400 block mb-1">KV-Cache Health</span>
          <div className="text-sm font-semibold flex items-center gap-2">
            {violations.length === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Prefix Cacheable
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-400" />
                {violations.length} Cache Busters
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage Cards */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Individual Pipeline Stages
        </span>

        {stagesList.map((stage) => (
          <div
            key={stage.id}
            className={`p-3.5 rounded-xl border transition ${
              stage.isWarning
                ? 'bg-amber-950/20 border-amber-500/30'
                : stage.applied
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                : 'bg-slate-950/50 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    stage.isWarning
                      ? 'text-amber-400'
                      : stage.applied
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-200">{stage.name}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  stage.isWarning
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                }`}
              >
                {stage.badge}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pl-6">{stage.description}</p>

            <div className="mt-2.5 pt-2 border-t border-slate-800/60 pl-6 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Pipeline Output:</span>
              <span
                className={`font-semibold ${
                  stage.isWarning ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                {stage.impact}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
