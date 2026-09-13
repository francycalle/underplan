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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-md rounded-[20px] bg-[#15161A] border-[2.8px] border-[#2A2D36] shadow-2xl p-6 text-white flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8.5px] bg-[#3B82F6]/15 border-[2px] border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
              <Box size={16} />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">New Custom Channel / Accessory</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8.5px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#2A2D36] flex items-center justify-center text-[#929394] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#929394]">
              Accessory Label / Hardware Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GaN Charger Mount, Anker Hub..."
              className="w-full px-3.5 py-2.5 rounded-[8.5px] bg-[#0E0F12] border-[2px] border-[#2A2D36] text-white text-sm font-semibold focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#929394]">
                Width (MU)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={widthMU}
                  onChange={(e) => setWidthMU(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-[8.5px] bg-[#0E0F12] border-[2px] border-[#2A2D36] text-white font-mono text-sm font-semibold focus:outline-none focus:border-[#3B82F6]"
                />
                <span className="text-xs text-[#929394] whitespace-nowrap">
                  ({widthMU * 25} mm)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#929394]">
                Height / Depth (MU)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={heightMU}
                  onChange={(e) => setHeightMU(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-[8.5px] bg-[#0E0F12] border-[2px] border-[#2A2D36] text-white font-mono text-sm font-semibold focus:outline-none focus:border-[#3B82F6]"
                />
                <span className="text-xs text-[#929394] whitespace-nowrap">
                  ({heightMU * 25} mm)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[10px] bg-[#0E0F12] border-[2px] border-[#2A2D36] text-[11px] text-[#929394] flex items-center gap-2">
            <span className="text-[#3B82F6] font-bold">ℹ Note:</span>
            <span>
              1 MU = 25mm Multiboard hole pitch. Mounting screws will automatically be calculated at the corners.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8.5px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#2A2D36] text-[#929394] hover:text-white text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-[8.5px] bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check size={14} /> Add Accessory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
