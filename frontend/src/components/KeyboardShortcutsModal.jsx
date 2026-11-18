import React from 'react';
import { Command, X, Keyboard } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${modKey} + Enter`, description: 'Run Gemini dense rewrite' },
    { key: `${modKey} + K`, description: 'Open Template Library' },
    { key: `${modKey} + Shift + C`, description: 'Copy compressed output to clipboard' },
    { key: `${modKey} + Shift + F`, description: 'Toggle Fullscreen Zen editor' },
    { key: 'Esc', description: 'Close any active modal or zen view' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{sc.description}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] font-semibold border border-slate-700 shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/60 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
