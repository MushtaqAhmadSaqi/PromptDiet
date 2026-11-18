import React from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

export default function MetricScorecard({
  title,
  numericValue = null,
  valuePrefix = '',
  valueSuffix = '',
  fallbackValue = '',
  subtitle,
  icon: Icon,
  color = 'brand',
  trend = null,
}) {
  const animatedNumber = useAnimatedNumber(numericValue ?? 0, 500);

  const formatAnimated = () => {
    if (numericValue === null || numericValue === undefined) {
      return fallbackValue;
    }

    if (valueSuffix === '%') {
      return `${animatedNumber.toFixed(1)}%`;
    }

    if (valuePrefix === '$') {
      if (animatedNumber < 0.01 && animatedNumber > 0) {
        return `$${animatedNumber.toFixed(4)}`;
      }
      return `$${animatedNumber.toFixed(3)}`;
    }

    if (valueSuffix === 'ms') {
      return `${animatedNumber.toFixed(1)}ms`;
    }

    // Default integer format with commas
    return `${valuePrefix}${new Intl.NumberFormat().format(Math.round(animatedNumber))}${valueSuffix}`;
  };

  const displayString = numericValue !== null ? formatAnimated() : fallbackValue;

  const colorStyles = {
    brand: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/50',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/50',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 group-hover:border-cyan-500/50',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400 group-hover:border-amber-500/50',
  }[color] || 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400';

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 hover:shadow-indigo-500/5 transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border transition-colors ${colorStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{displayString}</span>
        {trend && (
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>

      {subtitle && <div className="mt-1 text-xs text-slate-400 font-medium truncate">{subtitle}</div>}
    </div>
  );
}
