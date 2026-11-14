import React from 'react';
import MetricScorecard from './MetricScorecard';
import { Zap, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { formatTokens, formatPercent, formatCost, formatMs } from '../utils/formatters';

export default function MetricsDashboard({ metrics }) {
  const tokensSaved = metrics?.tokens_saved ?? 0;
  const reductionPct = metrics?.token_reduction_pct ?? 0;
  const costSaved = metrics?.estimated_cost_saved_usd ?? 0;
  const latency = metrics?.processing_time_ms ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
      <MetricScorecard
        title="Tokens Saved"
        value={formatTokens(tokensSaved)}
        subtitle={`${formatTokens(metrics?.original_tokens ?? 0)} -> ${formatTokens(metrics?.compressed_tokens ?? 0)}`}
        icon={Zap}
        color="brand"
      />
      <MetricScorecard
        title="Token Reduction"
        value={formatPercent(reductionPct)}
        subtitle={tokensSaved > 0 ? "Payload optimized" : "No compression needed"}
        icon={TrendingDown}
        color="emerald"
      />
      <MetricScorecard
        title="Est. Cost Saved"
        value={formatCost(costSaved)}
        subtitle="GPT-4o Input Tier"
        icon={DollarSign}
        color="amber"
      />
      <MetricScorecard
        title="Engine Latency"
        value={formatMs(latency)}
        subtitle="Local Python AST/Regex"
        icon={Clock}
        color="cyan"
      />
    </div>
  );
}

