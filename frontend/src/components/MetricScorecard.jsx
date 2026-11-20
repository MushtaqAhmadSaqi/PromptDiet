import React, { memo } from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

const COLOR_STYLES = {
  brand: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 group-hover:border-indigo-500/50',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/50',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 group-hover:border-cyan-500/50',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400 group-hover:border-amber-500/50',
};

const NUMBER_FORMATTER = new Intl.NumberFormat();

const MetricScorecard = memo(function MetricScorecard({
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
  const animatedNumber = useAnimatedNumber(numericValue ?? 0, 450);

  let displayString = fallbackValue;
  if (numericValue !== null && numericValue !== undefined) {
    if (valueSuffix === '%') {
      displayString = `${animatedNumber.toFixed(1)}%`;
    } else if (valuePrefix === '$') {
      displayString =
        animatedNumber < 0.01 && animatedNumber > 0
          ? `$${animatedNumber.toFixed(4)}`
          : `$${animatedNumber.toFixed(3)}`;
    } else if (valueSuffix === 'ms') {
      displayString = `${animatedNumber.toFixed(1)}ms`;
    } else {
      displayString = `${valuePrefix}${NUMBER_FORMATTER.format(Math.round(animatedNumber))}${valueSuffix}`;
    }
  }

  const colorStyle = COLOR_STYLES[color] || COLOR_STYLES.brand;

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 hover:shadow-indigo-500/5 transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl border transition-colors flex-shrink-0 ${colorStyle}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
          {displayString}
        </span>
        {trend && (
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 tabular-nums">
            {trend}
          </span>
        )}
      </div>

      {subtitle && <div className="mt-1 text-xs text-slate-400 font-medium truncate tabular-nums">{subtitle}</div>}
    </div>
  );
});

export default MetricScorecard;
