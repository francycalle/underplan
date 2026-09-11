import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelCount: number;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  channelCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl bg-[#15161A] border border-[#2A2D36] shadow-2xl p-6 text-slate-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={18} />
            </div>
            <h2 className="text-base font-semibold text-white">Clear Canvas?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1D1E22] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Are you sure you want to clear the canvas? This will remove all{' '}
          <strong className="text-rose-400 font-semibold">{channelCount} placed channels</strong> and custom accessories. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1D1E22] hover:bg-[#2A2D36] text-slate-300 text-sm font-medium transition-colors"
          >
            Keep Layout
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#C80E11] hover:bg-[#B50C0F] text-white text-sm font-medium shadow-lg transition-all flex items-center gap-1.5"
          >
            <Trash2 size={16} /> Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
