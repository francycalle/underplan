import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-14 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-graphite-600 bg-graphite-800/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
      {type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
      {type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
      {type === 'info' && <Info className="h-4 w-4 text-sky-400 shrink-0" />}

      <span className="text-xs font-medium text-slate-100">{message}</span>

      <button
        onClick={onClose}
        className="ml-2 rounded p-0.5 text-slate-400 hover:bg-graphite-700 hover:text-slate-200 transition-colors"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
