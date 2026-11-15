import React, { useState, useEffect } from 'react';
import { Play, FileText, Code2, Sparkles } from 'lucide-react';
import { fetchFixtures } from '../utils/api';

export default function DemoSwitcher({ onSelectFixture }) {
  const [fixtures, setFixtures] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    fetchFixtures()
      .then((data) => setFixtures(data))
      .catch((err) => console.warn('Could not load remote fixtures:', err));
  }, []);

  const handleSelect = (fixture) => {
    setActiveId(fixture.id);
    onSelectFixture(fixture);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'log':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      case 'json':
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getBadge = (id) => {
    switch (id) {
      case 'build-log':
        return '-96% lines';
      case 'mcp-schema':
        return '-54% bytes';
      default:
        return '4 violations';
    }
  };

  if (!fixtures || fixtures.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl text-xs">
      <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
        <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
        <span>1-Click Demos:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {fixtures.map((f) => (
          <button
            key={f.id}
            onClick={() => handleSelect(f)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition text-xs font-medium ${
              activeId === f.id
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
          >
            {getIcon(f.content_type)}
            <span>{f.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-indigo-300 border border-slate-800">
              {getBadge(f.id)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
