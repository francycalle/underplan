import React from 'react';
import {
  Layers,
  ShieldCheck,
  ChevronUp,
  FileSpreadsheet,
  ClipboardCopy,
  AlertCircle
} from 'lucide-react';
import { BillOfMaterials } from '../lib/types';

interface BOMBarProps {
  bom: BillOfMaterials;
  onOpenDrawer: () => void;
  onExportCSV: () => void;
  onCopyBOM: () => void;
  hasCollisions: boolean;
}

export const BOMBar: React.FC<BOMBarProps> = ({
  bom,
  onOpenDrawer,
  onExportCSV,
  onCopyBOM,
  hasCollisions,
}) => {
  const { summary, boardDimensions } = bom;

  return (
    <div className="h-10 border-t border-graphite-600 bg-graphite-850 px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left Telemetry Highlights */}
      <div className="flex items-center gap-4 text-xs">
        {/* Multiboard Tiles */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="h-3.5 w-3.5 text-brand-accent" />
          <span className="font-semibold text-white">{summary.totalTiles}</span>
          <span className="text-slate-400">Tiles</span>
          <span className="text-slate-500 text-[10px]">
            ({boardDimensions.cols}×{boardDimensions.rows})
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-graphite-700 hidden sm:block" />

        {/* Cable Channels */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
          <span className="font-semibold text-white">{summary.totalChannels}</span>
          <span className="text-slate-400">Channels</span>
          <span className="text-slate-500 text-[10px]">
            ({(summary.totalChannelLengthMm / 1000).toFixed(2)}m total)
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-graphite-700 hidden md:block" />

        {/* Snap Hardware */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold text-emerald-400">
            {summary.totalSnapCountWithSpares}
          </span>
          <span className="text-slate-400">Snaps</span>
          <span className="text-emerald-500/80 text-[10px]">
            ({summary.baseSnapCount} req + {summary.spareSnapCount} spare)
          </span>
        </div>

        {/* Collision alert pill if any */}
        {hasCollisions && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded animate-pulse">
            <AlertCircle className="h-3 w-3" />
            <span>Overlap Detected</span>
          </div>
        )}
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopyBOM}
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-graphite-700 transition-colors"
          title="Copy BOM to clipboard"
        >
          <ClipboardCopy className="h-3 w-3 text-slate-400" />
          <span>Copy</span>
        </button>

        <button
          onClick={onExportCSV}
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-graphite-700 transition-colors"
          title="Export CSV"
        >
          <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
          <span>CSV</span>
        </button>

        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-graphite-700 border border-graphite-600 text-xs font-semibold text-slate-200 hover:bg-graphite-600 hover:text-white transition-colors"
        >
          <span>View Detailed BOM</span>
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
