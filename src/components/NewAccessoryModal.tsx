import React, { useState } from 'react';
import { X, Box, Check } from 'lucide-react';
import { CustomAccessoryDefinition } from '../lib/types';

interface NewAccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccessory: (acc: CustomAccessoryDefinition) => void;
}

export const NewAccessoryModal: React.FC<NewAccessoryModalProps> = ({
  isOpen,
  onClose,
  onAddAccessory,
}) => {
  const [name, setName] = useState('');
  const [widthMU, setWidthMU] = useState<number>(3);
  const [heightMU, setHeightMU] = useState<number>(3);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = `acc_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    onAddAccessory({
      id,
      name: trimmed,
      widthMU: Math.max(1, Math.min(12, widthMU)),
      heightMU: Math.max(1, Math.min(12, heightMU)),
    });
    setName('');
    setWidthMU(3);
    setHeightMU(3);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl bg-[#15161A] border border-[#2A2D36] shadow-2xl p-6 text-slate-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Box size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">New Custom Channel / Accessory</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1D1E22] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Accessory Label / Hardware Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GaN Charger Mount, Anker Hub..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Width (MU)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={widthMU}
                  onChange={(e) => setWidthMU(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  ({widthMU * 25} mm)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Height / Depth (MU)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={heightMU}
                  onChange={(e) => setHeightMU(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  ({heightMU * 25} mm)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-sky-400 font-bold">ℹ Note:</span>
            <span>
              1 MU = 25mm Multiboard hole pitch. Mounting screws will automatically be calculated at the corners.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium shadow-md transition-all flex items-center gap-1.5"
            >
              <Check size={14} /> Add Accessory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
