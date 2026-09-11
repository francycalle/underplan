import React, { useState, useEffect } from 'react';
import { X, Check, Grid, Sliders } from 'lucide-react';
import { BoardConfig } from '../lib/types';
import { calculateBoardDimensions, findBestMultiboardModule } from '../lib/geometry';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  onUpdateTitle: (title: string) => void;
  boardConfig: BoardConfig;
  onUpdateConfig: (newConfig: Partial<BoardConfig>) => void;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: 'std_desk',
    name: 'Standard Desk',
    icon: '🖥️',
    widthMm: 1200,
    heightMm: 600,
    description: '1200×600 mm • Ideal for cable runs behind monitors',
  },
  {
    id: 'large_desk',
    name: 'Large Executive Desk',
    icon: '🖥️',
    widthMm: 1600,
    heightMm: 800,
    description: '1600×800 mm • Dual monitor & audio gear setup',
  },
  {
    id: 'wall_board',
    name: 'Studio Wall Pegboard',
    icon: '🧱',
    widthMm: 800,
    heightMm: 800,
    description: '800×800 mm • Vertical wall-mount tool & cable grid',
  },
  {
    id: 'drawer',
    name: 'Tool Cart / Drawer',
    icon: '🗄️',
    widthMm: 500,
    heightMm: 400,
    description: '500×400 mm • Compact drawer organizer tray',
  },
  {
    id: 'enclosure',
    name: '3D Printer Enclosure',
    icon: '🖨️',
    widthMm: 600,
    heightMm: 600,
    description: '600×600 mm • Enclosure ceiling & rear cable routing',
  },
];

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  onUpdateTitle,
  boardConfig,
  onUpdateConfig,
}) => {
  const [title, setTitle] = useState(projectTitle);
  const dims = calculateBoardDimensions(boardConfig);

  const [inputWidthMm, setInputWidthMm] = useState(String(dims.totalWidthMm));
  const [inputHeightMm, setInputHeightMm] = useState(String(dims.totalHeightMm));
  const [clampBuffer, setClampBuffer] = useState(false);

  useEffect(() => {
    setTitle(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    setInputWidthMm(String(dims.totalWidthMm));
    setInputHeightMm(String(dims.totalHeightMm));
  }, [dims.totalWidthMm, dims.totalHeightMm]);

  if (!isOpen) return null;

  const applyMmDimensions = (wStr: string, hStr: string) => {
    const w = parseInt(wStr, 10);
    const h = parseInt(hStr, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 100 && h >= 100) {
      const tiling = findBestMultiboardModule(w, h, 'auto', boardConfig.holePitchMm);
      onUpdateConfig({
        cols: tiling.cols,
        rows: tiling.rows,
        tileWidthHoles: tiling.moduleSize,
        tileHeightHoles: tiling.moduleSize,
        customDeskWidthMm: tiling.actualWidthMm,
        customDeskHeightMm: tiling.actualHeightMm,
      });
      setInputWidthMm(String(tiling.actualWidthMm));
      setInputHeightMm(String(tiling.actualHeightMm));
    }
  };

  const handleApplyPreset = (preset: Preset) => {
    applyMmDimensions(String(preset.widthMm), String(preset.heightMm));
  };

  const handleStepCols = (delta: number) => {
    const nextCols = Math.max(1, Math.min(32, boardConfig.cols + delta));
    const newWidth = nextCols * (boardConfig.tileWidthHoles || 8) * boardConfig.holePitchMm;
    setInputWidthMm(String(newWidth));
    onUpdateConfig({
      cols: nextCols,
      customDeskWidthMm: newWidth,
    });
  };

  const handleStepRows = (delta: number) => {
    const nextRows = Math.max(1, Math.min(24, boardConfig.rows + delta));
    const newHeight = nextRows * (boardConfig.tileHeightHoles || 8) * boardConfig.holePitchMm;
    setInputHeightMm(String(newHeight));
    onUpdateConfig({
      rows: nextRows,
      customDeskHeightMm: newHeight,
    });
  };

  const handleSave = () => {
    onUpdateTitle(title.trim() || 'My Setup');
    applyMmDimensions(inputWidthMm, inputHeightMm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-3xl bg-[#0E1320] border border-slate-700/80 shadow-2xl p-6 text-slate-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Setup & Surface Configuration</h2>
              <p className="text-xs text-slate-400">Configure mounting dimensions, surface type, and Multiboard tiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Setup Title Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Setup Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Studio Desk, Workshop Wall..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
          />
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Surface Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const isSelected =
                dims.totalWidthMm === preset.widthMm && dims.totalHeightMm === preset.heightMm;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={`flex items-start gap-3 p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/80 text-white'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl select-none">{preset.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {preset.name}
                      {isSelected && <Check size={12} className="text-blue-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{preset.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Physical Dimensions & Steppers */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Grid size={14} className="text-sky-400" /> Custom Dimensions (mm)
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {dims.totalHolesX} × {dims.totalHolesY} holes ({dims.totalCols * dims.totalRows} tiles)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Width (mm)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="25"
                  value={inputWidthMm}
                  onChange={(e) => setInputWidthMm(e.target.value)}
                  onBlur={() => applyMmDimensions(inputWidthMm, inputHeightMm)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleStepCols(-1)}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                  title="Remove 1 tile column"
                >
                  -C
                </button>
                <button
                  type="button"
                  onClick={() => handleStepCols(1)}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                  title="Add 1 tile column"
                >
                  +C
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Depth / Height (mm)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="25"
                  value={inputHeightMm}
                  onChange={(e) => setInputHeightMm(e.target.value)}
                  onBlur={() => applyMmDimensions(inputWidthMm, inputHeightMm)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleStepRows(-1)}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                  title="Remove 1 tile row"
                >
                  -R
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRows(1)}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                  title="Add 1 tile row"
                >
                  +R
                </button>
              </div>
            </div>
          </div>

          {/* Clamp buffer option */}
          <label className="flex items-center gap-2.5 mt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clampBuffer}
              onChange={(e) => setClampBuffer(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-300 flex items-center gap-1">
              Reserve 75mm rear buffer for monitor C-clamps
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
