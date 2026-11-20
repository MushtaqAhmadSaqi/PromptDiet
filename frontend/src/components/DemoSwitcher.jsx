import React, { useState, useEffect } from 'react';
import { Play, FileText, Code2, Sparkles } from 'lucide-react';
import { fetchFixtures } from '../utils/api';
import { FALLBACK_FIXTURES } from '../utils/localEngine';
import { runViewTransition } from '../utils/viewTransitions';

const BADGES = {
  'build-log': '-96% lines',
  'mcp-schema': '-54% bytes',
  'cache-busting-prompt': '3+ violations',
};

export default function DemoSwitcher({ onSelectFixture }) {
  const [fixtures, setFixtures] = useState(FALLBACK_FIXTURES);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchFixtures(controller.signal)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFixtures(data);
        }
      })
      .catch(() => {
        // Keep built-in local fallback fixtures when offline
      });
    return () => controller.abort();
  }, []);

  const handleSelect = (fixture) => {
    runViewTransition(() => {
      setActiveId(fixture.id);
      onSelectFixture(fixture);
    });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'log':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />;
      case 'json':
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl text-xs">
      <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
        <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" aria-hidden="true" />
        <span>1-Click Demos:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {fixtures.map((f) => {
          const isActive = activeId === f.id;
          return (
            <button
              type="button"
              key={f.id}
              aria-pressed={isActive}
              title={f.description}
              onClick={() => handleSelect(f)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200 shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {getIcon(f.content_type)}
              <span>{f.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                {BADGES[f.id] || 'Demo'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
