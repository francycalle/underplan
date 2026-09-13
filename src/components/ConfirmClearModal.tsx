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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-md rounded-[20px] bg-[#15161A] border-[2.8px] border-[#2A2D36] shadow-2xl p-6 text-white flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8.5px] bg-[#C80E11]/15 border-[2px] border-[#C80E11]/40 flex items-center justify-center text-[#C80E11]">
              <AlertTriangle size={16} />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Clear Canvas?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8.5px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#2A2D36] flex items-center justify-center text-[#929394] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[#929394] leading-relaxed">
          Are you sure you want to clear the canvas? This will permanently remove all{' '}
          <strong className="text-white font-bold">{channelCount} placed channels</strong> and custom accessories. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8.5px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#2A2D36] text-[#929394] hover:text-white text-xs font-bold transition-colors"
          >
            Keep Layout
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 rounded-[8.5px] bg-[#C80E11] hover:bg-[#B50C0F] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Trash2 size={14} /> Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
