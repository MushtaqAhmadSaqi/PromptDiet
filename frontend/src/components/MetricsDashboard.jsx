import React, { useState, useId } from 'react';
import MetricScorecard from './MetricScorecard';
import { Zap, TrendingDown, DollarSign, Clock, ChevronDown, Calculator } from 'lucide-react';
import { formatTokens, formatPercent } from '../utils/formatters';
import { runViewTransition } from '../utils/viewTransitions';

const MODEL_PRICING = {
  'gpt-4o': { name: 'GPT-4o', costPerMillion: 2.50, provider: 'OpenAI' },
  'claude-3-5-sonnet': { name: 'Claude 3.5 Sonnet', costPerMillion: 3.00, provider: 'Anthropic' },
  'gemini-1-5-pro': { name: 'Gemini 1.5 Pro', costPerMillion: 1.25, provider: 'Google' },
  'gemini-1-5-flash': { name: 'Gemini 1.5 Flash', costPerMillion: 0.075, provider: 'Google' },
  'gpt-4o-mini': { name: 'GPT-4o mini', costPerMillion: 0.15, provider: 'OpenAI' },
  'deepseek-v3': { name: 'DeepSeek-V3', costPerMillion: 0.14, provider: 'DeepSeek' },
};

const NUMBER_FORMATTER = new Intl.NumberFormat();

export default function MetricsDashboard({ metrics, engineMode = 'fastapi' }) {
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [showScaleCalc, setShowScaleCalc] = useState(false);
  const [dailyRequests, setDailyRequests] = useState(5000);

  const modelSelectId = useId();
  const trafficRangeId = useId();

  const tokensSaved = metrics?.tokens_saved ?? 0;
  const originalTokens = metrics?.original_tokens ?? 0;
  const compressedTokens = metrics?.compressed_tokens ?? 0;
  const reductionPct = metrics?.token_reduction_pct ?? 0;
  const latency = metrics?.processing_time_ms ?? 0;

  const currentModel = MODEL_PRICING[selectedModel] || MODEL_PRICING['gpt-4o'];
  const calculatedCostSaved = (tokensSaved / 1_000_000) * currentModel.costPerMillion;

  const monthlyRequests = dailyRequests * 30;
  const monthlyTokensSaved = tokensSaved * monthlyRequests;
  const monthlyCostSaved = (monthlyTokensSaved / 1_000_000) * currentModel.costPerMillion;

  const compressedPct = originalTokens > 0 ? (compressedTokens / originalTokens) * 100 : 0;
  const savedPct = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0;

  const toggleScaleCalc = () => {
    runViewTransition(() => setShowScaleCalc((prev) => !prev));
  };

  return (
    <section aria-label="Compression Telemetry" className="space-y-3 my-4">
      {/* 4 Primary Metric Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricScorecard
          title="Tokens Saved"
          numericValue={tokensSaved}
          subtitle={`${formatTokens(originalTokens)} → ${formatTokens(compressedTokens)} tokens`}
          icon={Zap}
          color="brand"
          trend={tokensSaved > 0 ? `-${formatPercent(reductionPct)}` : null}
        />

        <MetricScorecard
          title="Token Reduction"
          numericValue={reductionPct}
          valueSuffix="%"
          subtitle={tokensSaved > 0 ? 'Context window freed' : 'No compression'}
          icon={TrendingDown}
          color="emerald"
        />

        <MetricScorecard
          title={`Cost Saved (${currentModel.name})`}
          numericValue={calculatedCostSaved}
          valuePrefix="$"
          subtitle={`@ $${currentModel.costPerMillion}/M tokens`}
          icon={DollarSign}
          color="amber"
        />

        <MetricScorecard
          title="Engine Latency"
          numericValue={latency}
          valueSuffix="ms"
          subtitle={engineMode === 'fastapi' ? 'FastAPI AST / Regex' : 'Local Browser Engine'}
          icon={Clock}
          color="cyan"
        />
      </div>

      {/* Interactive Visual Token Gauge & Model Selector Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor={modelSelectId} className="text-slate-400 font-medium">
              Pricing Model:
            </label>
            <select
              id={modelSelectId}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium cursor-pointer"
            >
              {Object.entries(MODEL_PRICING).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.name} (${item.costPerMillion}/M tokens)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={toggleScaleCalc}
            aria-expanded={showScaleCalc}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium transition border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            <span>Scale Projections</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${showScaleCalc ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Visual Token Reduction Progress Bar */}
        {originalTokens > 0 && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 tabular-nums">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  Payload Pruned: <strong className="text-slate-200">{formatTokens(tokensSaved)}</strong> ({reductionPct.toFixed(1)}%)
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>
                  Kept: <strong className="text-slate-200">{formatTokens(compressedTokens)}</strong> ({Math.max(0, 100 - reductionPct).toFixed(1)}%)
                </span>
              </span>
            </div>

            <div
              className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800"
              role="progressbar"
              aria-valuenow={Math.round(reductionPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Token compression ratio"
            >
              <div
                style={{ width: `${compressedPct}%` }}
                className="bg-indigo-500 transition-all duration-500"
                title={`Retained: ${compressedTokens} tokens`}
              />
              <div
                style={{ width: `${savedPct}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm"
                title={`Pruned: ${tokensSaved} tokens`}
              />
            </div>
          </div>
        )}

        {/* Scale Projection Drawer */}
        {showScaleCalc && (
          <div className="vt-scale-drawer mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
            <div>
              <label htmlFor={trafficRangeId} className="text-slate-400 block mb-1 font-medium">
                Simulated Daily Traffic:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={trafficRangeId}
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={dailyRequests}
                  onChange={(e) => setDailyRequests(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-slate-200 min-w-20 text-right tabular-nums">
                  {NUMBER_FORMATTER.format(dailyRequests)}/day
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Monthly Tokens Saved</span>
              <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
                {NUMBER_FORMATTER.format(monthlyTokensSaved)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-center">
              <span className="text-[11px] text-emerald-400 block">Est. Monthly Cloud Savings</span>
              <span className="text-sm font-bold text-emerald-300 font-mono tabular-nums">
                ${monthlyCostSaved.toFixed(2)} / month
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
