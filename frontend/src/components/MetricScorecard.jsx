import React from 'react';

export default function MetricScorecard({ title, value, subtitle, icon: Icon, color = 'brand' }) {
  const colorStyles = {
    brand: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  }[color] || 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border ${colorStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-100">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-400">{subtitle}</div>}
    </div>
  );
}

