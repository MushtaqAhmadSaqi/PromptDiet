import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
          info: <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />,
        };

        const borderStyles = {
          success: 'border-emerald-500/40 bg-slate-900/95 text-emerald-200',
          error: 'border-rose-500/40 bg-slate-900/95 text-rose-200',
          warning: 'border-amber-500/40 bg-slate-900/95 text-amber-200',
          info: 'border-indigo-500/40 bg-slate-900/95 text-indigo-200',
        }[toast.type || 'info'];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${borderStyles}`}
          >
            <div className="flex items-start gap-2.5">
              {icons[toast.type || 'info']}
              <div className="text-xs leading-relaxed font-medium">
                {toast.title && <div className="font-semibold text-slate-100 mb-0.5">{toast.title}</div>}
                <div className="text-slate-300">{toast.message}</div>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
