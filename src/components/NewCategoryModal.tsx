import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { CustomCategory } from '../lib/types';

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: CustomCategory) => void;
}

const PRESET_COLORS = [
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Lime Green', hex: '#4FDA48' },
  { label: 'Amber', hex: '#F59E0B' },
  { label: 'Cyan', hex: '#06B6D4' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Emerald', hex: '#10B981' },
  { label: 'Rose', hex: '#F43F5E' },
  { label: 'Sky', hex: '#0EA5E9' },
  { label: 'Orange', hex: '#F97316' },
];

export const NewCategoryModal: React.FC<NewCategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].hex);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = `cat_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    onAddCategory({
      id,
      name: trimmed,
      color: selectedColor,
    });
    setName('');
    setSelectedColor(PRESET_COLORS[0].hex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-sm rounded-[20px] bg-[#15161A] border-[2.8px] border-[#2A2D36] shadow-2xl p-6 text-white flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8.5px] bg-[#3B82F6]/15 border-[2px] border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
              <Palette size={16} />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">New Cable Category</h2>
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
              Category Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Audio Cables, Thunderbolt..."
              className="w-full px-3.5 py-2.5 rounded-[8.5px] bg-[#0E0F12] border-[2px] border-[#2A2D36] text-white text-sm font-semibold focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#929394]">
              Color Marker
            </label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {PRESET_COLORS.map((c) => {
                const isSelected = selectedColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#3B82F6] ring-offset-2 ring-offset-[#15161A] scale-110'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {isSelected && <Check size={12} className="text-black stroke-[3]" />}
                  </button>
                );
              })}
            </div>
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
              className="px-4 py-2 rounded-[8.5px] bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
