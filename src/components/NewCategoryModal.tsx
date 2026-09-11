import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { CustomCategory } from '../lib/types';

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: CustomCategory) => void;
}

const PRESET_COLORS = [
  { label: 'Amber', hex: '#F59E0B' },
  { label: 'Cyan', hex: '#06B6D4' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Emerald', hex: '#10B981' },
  { label: 'Rose', hex: '#F43F5E' },
  { label: 'Sky', hex: '#0EA5E9' },
  { label: 'Indigo', hex: '#6366F1' },
  { label: 'Yellow', hex: '#EAB308' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-3xl bg-[#15161A] border border-[#2A2D36] shadow-2xl p-6 text-slate-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Palette size={16} />
            </div>
            <h2 className="text-base font-semibold text-white">New Cable Category</h2>
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
              Category Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Audio Cables, Thunderbolt..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Color Marker
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((c) => {
                const isSelected = selectedColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'ring-2 ring-white scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {isSelected && <Check size={14} className="text-black font-bold" />}
                  </button>
                );
              })}
            </div>
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium shadow-md transition-all"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
