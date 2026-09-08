import React, { useState, useEffect } from 'react';
import {
  Layers,
  Trash2,
  FileSpreadsheet,
  ClipboardCopy,
  TableProperties,
  Edit2,
  Check,
  Maximize2,
} from 'lucide-react';
import { BoardConfig } from '../lib/types';
import { calculateBoardDimensions, findBestMultiboardModule } from '../lib/geometry';

interface HeaderProps {
  boardConfig: BoardConfig;
  onUpdateConfig: (newConfig: Partial<BoardConfig>) => void;
  onClearBoard: () => void;
  onExportCSV: () => void;
  onCopyBOM: () => void;
  onToggleBOMDrawer: () => void;
  channelCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  boardConfig,
  onUpdateConfig,
  onClearBoard,
  onExportCSV,
  onCopyBOM,
  onToggleBOMDrawer,
  channelCount,
}) => {
  const [projectTitle, setProjectTitle] = useState('My Desk Setup');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const dims = calculateBoardDimensions(boardConfig);

  // Local state for mm inputs and modular choice
  const [inputWidthMm, setInputWidthMm] = useState<string>(String(dims.totalWidthMm));
  const [inputHeightMm, setInputHeightMm] = useState<string>(String(dims.totalHeightMm));
  const [moduleChoice, setModuleChoice] = useState<'auto' | 8 | 6 | 4>('auto');

  useEffect(() => {
    setInputWidthMm(String(dims.totalWidthMm));
    setInputHeightMm(String(dims.totalHeightMm));
  }, [dims.totalWidthMm, dims.totalHeightMm]);

  // Apply dimensions with authentic Multiboard module matching
  const applyDimensions = (
    widthStr: string,
    heightStr: string,
    chosenModule: 'auto' | 8 | 6 | 4 = moduleChoice
  ) => {
    const w = parseInt(widthStr, 10);
    const h = parseInt(heightStr, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 100 && h >= 100) {
      const tiling = findBestMultiboardModule(w, h, chosenModule, boardConfig.holePitchMm);
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
    } else {
      setInputWidthMm(String(dims.totalWidthMm));
      setInputHeightMm(String(dims.totalHeightMm));
    }
  };

  const handleCommitWidth = () => {
    applyDimensions(inputWidthMm, inputHeightMm, moduleChoice);
  };

  const handleCommitHeight = () => {
    applyDimensions(inputWidthMm, inputHeightMm, moduleChoice);
  };

  const handleModuleChange = (newModule: 'auto' | 8 | 6 | 4) => {
    setModuleChoice(newModule);
    applyDimensions(inputWidthMm, inputHeightMm, newModule);
  };

  const handleStepCols = (delta: number) => {
    const nextCols = Math.max(1, Math.min(24, boardConfig.cols + delta));
    const newWidth = nextCols * boardConfig.tileWidthHoles * boardConfig.holePitchMm;
    setInputWidthMm(String(newWidth));
    onUpdateConfig({
      cols: nextCols,
      customDeskWidthMm: newWidth,
    });
  };

  const handleStepRows = (delta: number) => {
    const nextRows = Math.max(1, Math.min(16, boardConfig.rows + delta));
    const newHeight = nextRows * boardConfig.tileHeightHoles * boardConfig.holePitchMm;
    setInputHeightMm(String(newHeight));
    onUpdateConfig({
      rows: nextRows,
      customDeskHeightMm: newHeight,
    });
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-graphite-600 bg-graphite-850 px-4 select-none shrink-0 z-20">
      {/* Left: Brand & Editable Project Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary/20 border border-brand-primary text-brand-primary shadow-sm">
            <Layers className="h-4 w-4" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="h-6 rounded border border-brand-primary bg-graphite-950 px-1.5 text-sm font-semibold text-slate-100 outline-none"
                  />
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingTitle(true)}
                  className="group flex cursor-pointer items-center gap-1.5"
                  title="Click to rename project"
                >
                  <span className="text-sm font-bold tracking-tight text-slate-100">
                    {projectTitle}
                  </span>
                  <Edit2 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <span className="rounded bg-graphite-700 px-1.5 py-0.5 text-[10px] font-semibold text-brand-accent uppercase tracking-wide">
                Underware
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-7 w-[1px] bg-graphite-600 hidden sm:block" />

        {/* Custom Board / Desk Dimensions in mm with Multiboard Tiling */}
        <div className="flex items-center gap-2 bg-graphite-950 border border-graphite-700 rounded-md px-2.5 py-1 text-xs">
          <Maximize2 className="h-3.5 w-3.5 text-brand-accent shrink-0" />
          <span className="text-slate-400 font-medium hidden md:inline">Desk:</span>

          {/* Width mm input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={50}
              min={100}
              max={4000}
              value={inputWidthMm}
              onChange={(e) => setInputWidthMm(e.target.value)}
              onBlur={handleCommitWidth}
              onKeyDown={(e) => e.key === 'Enter' && handleCommitWidth()}
              className="w-14 h-5 bg-graphite-900 border border-graphite-700 rounded px-1 text-center font-mono text-xs font-semibold text-slate-100 outline-none focus:border-brand-primary"
              title="Desk width in mm"
            />
            <span className="text-[11px] text-slate-400">mm</span>
          </div>

          <span className="text-slate-500 font-mono">×</span>

          {/* Height/Depth mm input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              step={50}
              min={100}
              max={3000}
              value={inputHeightMm}
              onChange={(e) => setInputHeightMm(e.target.value)}
              onBlur={handleCommitHeight}
              onKeyDown={(e) => e.key === 'Enter' && handleCommitHeight()}
              className="w-14 h-5 bg-graphite-900 border border-graphite-700 rounded px-1 text-center font-mono text-xs font-semibold text-slate-100 outline-none focus:border-brand-primary"
              title="Desk depth / height in mm"
            />
            <span className="text-[11px] text-slate-400">mm</span>
          </div>

          {/* Module Selector Pill Group */}
          <div className="flex items-center rounded bg-graphite-900 border border-graphite-800 p-0.5 text-[10px]">
            <button
              onClick={() => handleModuleChange('auto')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                moduleChoice === 'auto'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Automatic best Multiboard module calculation (8x8, 6x6, 4x4)"
            >
              Auto
            </button>
            <button
              onClick={() => handleModuleChange(8)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                moduleChoice === 8
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard 8x8 module (200x200mm)"
            >
              8×8
            </button>
            <button
              onClick={() => handleModuleChange(6)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                moduleChoice === 6
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mid-size 6x6 module (150x150mm)"
            >
              6×6
            </button>
            <button
              onClick={() => handleModuleChange(4)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                moduleChoice === 4
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact 4x4 module (100x100mm)"
            >
              4×4
            </button>
          </div>

          {/* Multiboard Tiling Result Pill */}
          <span className="ml-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60 hidden sm:inline">
            {boardConfig.cols * boardConfig.rows} tiles of {boardConfig.tileWidthHoles}×{boardConfig.tileHeightHoles} ({boardConfig.tileWidthHoles * boardConfig.holePitchMm}×{boardConfig.tileHeightHoles * boardConfig.holePitchMm}mm) • {dims.totalHolesX}×{dims.totalHolesY} holes
          </span>

          {/* Quick step buttons for columns/rows */}
          <div className="flex items-center gap-0.5 border-l border-graphite-800 pl-1.5 ml-0.5">
            <button
              onClick={() => handleStepCols(-1)}
              disabled={boardConfig.cols <= 1}
              className="px-1 text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
              title="Reduce 1 tile column"
            >
              -C
            </button>
            <button
              onClick={() => handleStepCols(1)}
              disabled={boardConfig.cols >= 24}
              className="px-1 text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
              title="Add 1 tile column"
            >
              +C
            </button>
            <button
              onClick={() => handleStepRows(-1)}
              disabled={boardConfig.rows <= 1}
              className="px-1 text-[11px] text-slate-400 hover:text-white disabled:opacity-30 ml-1"
              title="Reduce 1 tile row"
            >
              -R
            </button>
            <button
              onClick={() => handleStepRows(1)}
              disabled={boardConfig.rows >= 16}
              className="px-1 text-[11px] text-slate-400 hover:text-white disabled:opacity-30"
              title="Add 1 tile row"
            >
              +R
            </button>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Clear Board */}
        <button
          onClick={onClearBoard}
          disabled={channelCount === 0}
          className="flex items-center gap-1.5 rounded bg-graphite-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 border border-graphite-600 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-colors disabled:opacity-35 disabled:pointer-events-none"
          title="Clear all channels from desk"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Clear</span>
        </button>

        <div className="h-6 w-[1px] bg-graphite-600 mx-1 hidden sm:block" />

        {/* Copy BOM */}
        <button
          onClick={onCopyBOM}
          className="flex items-center gap-1.5 rounded bg-graphite-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 border border-graphite-600 hover:bg-graphite-600 hover:text-white transition-colors"
          title="Copy Bill of Materials (BOM) as Markdown (.md)"
        >
          <ClipboardCopy className="h-3.5 w-3.5 text-brand-accent" />
          <span className="hidden sm:inline">Copy BOM.md</span>
        </button>

        {/* Export CSV */}
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 rounded bg-graphite-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 border border-graphite-600 hover:bg-graphite-600 hover:text-white transition-colors"
          title="Download Bill of Materials (BOM) in CSV"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden md:inline">Export CSV</span>
        </button>

        {/* Open BOM Drawer Modal */}
        <button
          onClick={onToggleBOMDrawer}
          className="flex items-center gap-1.5 rounded bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-hover transition-colors"
          title="Open complete Bill of Materials (BOM)"
        >
          <TableProperties className="h-3.5 w-3.5" />
          <span>BOM</span>
        </button>
      </div>
    </header>
  );
};
