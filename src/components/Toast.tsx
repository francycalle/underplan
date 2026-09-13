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
    <div className="fixed bottom-24 right-8 z-50 flex items-center gap-2.5 rounded-[12px] border border-[#2A2D36] bg-[#15161A]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 select-none">
      {type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
      {type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
      {type === 'info' && <Info className="h-4 w-4 text-[#3B82F6] shrink-0" />}

      <span className="text-xs font-['Figtree'] font-semibold text-white">{message}</span>

      <button
        onClick={onClose}
        className="ml-2 rounded p-0.5 text-slate-400 hover:bg-[#2A2D36] hover:text-white transition-colors"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
