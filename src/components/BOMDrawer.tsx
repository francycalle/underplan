import React, { useState } from 'react';
import {
  X,
  ClipboardCopy,
  Download,
  Layers,
  ShieldCheck,
  Check,
  Cable,
  Wrench,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { BillOfMaterials } from '../lib/types';
import { formatBOMAsCSV, formatBOMAsMarkdown } from '../lib/bom';

interface BOMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BillOfMaterials;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const BOMDrawer: React.FC<BOMDrawerProps> = ({
  isOpen,
  onClose,
  bom,
  onShowToast,
}) => {
  const [copiedType, setCopiedType] = useState<'md' | null>(null);
  const [showChannelMountDetails, setShowChannelMountDetails] = useState(false);

  if (!isOpen) return null;

  const { summary, boardDimensions, items } = bom;

  const handleCopyMarkdown = async () => {
    const md = formatBOMAsMarkdown(bom);
    await navigator.clipboard.writeText(md);
    setCopiedType('md');
    onShowToast('Bill of Materials copied to clipboard!', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadCSV = () => {
    const csv = formatBOMAsCSV(bom);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Underplan-BOM-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV file downloaded successfully!', 'success');
  };

  // Group items by category
  const channelItems = items.filter((item) => item.category === 'channels');
  const mountItems = items.filter((item) => item.category === 'mounting');
  const tileItems = items.filter((item) => item.category === 'tiles');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-graphite-850 border border-graphite-600 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-graphite-600 bg-graphite-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-brand-accent" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Bill of Materials (BOM)
              </h2>
              <p className="text-[11px] text-slate-400">
                Desk {boardDimensions.totalWidthMm}×{boardDimensions.totalHeightMm} mm ({boardDimensions.totalHolesX}×{boardDimensions.totalHolesY} MU) • {summary.totalTiles} Multiboard Tiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-graphite-700 border border-graphite-600 text-xs font-medium text-slate-200 hover:bg-graphite-600 hover:text-white transition-colors"
              title="Copy BOM table formatted as Markdown"
            >
              {copiedType === 'md' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              <span>{copiedType === 'md' ? 'Copied' : 'Copy BOM'}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-primary text-xs font-semibold text-white hover:bg-brand-hover transition-colors shadow-sm"
              title="Download Bill of Materials as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:bg-graphite-700 hover:text-white transition-colors ml-1"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Prototype Disclaimer Banner */}
        <div className="flex items-center gap-2 px-5 py-2 bg-brand-primary/10 border-b border-brand-primary/20 text-[11px] text-slate-300">
          <Info className="h-3.5 w-3.5 text-brand-accent shrink-0" />
          <span>
            Indicative planning estimates — verify dimensions, tolerances, and mounting requirements in the official configurator before printing.
          </span>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-graphite-700 bg-graphite-900/40 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="h-3.5 w-3.5 text-brand-accent" />
              <span className="font-semibold text-white">{summary.totalTiles}</span> Tiles ({boardDimensions.cols}×{boardDimensions.rows})
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Cable className="h-3.5 w-3.5 text-brand-primary" />
              <span className="font-semibold text-white">{summary.totalChannels}</span> Channels ({summary.totalChannelLengthUnits} MU / {summary.totalChannelLengthMm} mm)
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{summary.totalMounts} Active Mounting Points</span>
          </div>
        </div>

        {/* Scrollable Grouped Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Underware Channels */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cable className="h-3.5 w-3.5 text-brand-primary" />
                Underware Channels
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {summary.totalChannels} total parts
              </span>
            </div>

            <div className="rounded-lg border border-graphite-700 overflow-hidden bg-graphite-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-graphite-700 bg-graphite-900 text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-3">Part / Specification</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-center">Quantity</th>
                    <th className="py-2 px-3 text-center">Mounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800">
                  {channelItems.length > 0 ? (
                    channelItems.map((item) => (
                      <tr key={item.id} className="hover:bg-graphite-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.partNumber}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="rounded bg-graphite-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-graphite-700">
                            {item.categoryLabel || item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-400">
                          {item.snapsRequired ? `${item.snapsRequired} pts` : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                        No channels placed on desk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Mounting Systems (Hardware) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                Mounting Systems (Hardware)
              </h3>
              <button
                onClick={() => setShowChannelMountDetails(!showChannelMountDetails)}
                className="text-[11px] font-medium text-brand-accent hover:underline flex items-center gap-1"
              >
                {showChannelMountDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>{showChannelMountDetails ? 'Hide details' : 'Breakdown by channel'}</span>
              </button>
            </div>

            <div className="rounded-lg border border-graphite-700 overflow-hidden bg-graphite-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-graphite-700 bg-graphite-900 text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-3">Hardware / Connector</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center">Base</th>
                    <th className="py-2 px-3 text-center">Total Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800">
                  {mountItems.length > 0 ? (
                    mountItems.map((item) => (
                      <tr key={item.id} className="hover:bg-graphite-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-emerald-400">{item.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.partNumber}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {item.specs?.baseRequirement ?? item.quantity} pcs
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-300">
                          {item.quantity} {item.unit}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                        No mounting points required
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expandable Breakdown per Channel */}
            {showChannelMountDetails && summary.mountDetails && (
              <div className="p-3 bg-graphite-900 border border-graphite-700 rounded-lg space-y-2 animate-in fade-in">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Mounting Points Breakdown by Channel:
                </div>
                <div className="space-y-1 text-xs">
                  {summary.mountDetails.map((detail, idx) => (
                    <div
                      key={`${detail.channelId}-${idx}`}
                      className="flex items-center justify-between py-1 px-2 rounded bg-graphite-850 border border-graphite-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-medium text-slate-200">{detail.channelName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-400 capitalize">
                          {detail.mountingType.replace('_', ' ')}
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {detail.mountCount} points
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 3. Multiboard Grid (Tiles) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-brand-accent" />
                Multiboard Grid (Tiles)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {summary.totalTiles} total tiles
              </span>
            </div>

            <div className="rounded-lg border border-graphite-700 overflow-hidden bg-graphite-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-graphite-700 bg-graphite-900 text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-3">Tile Module</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800">
                  {tileItems.map((item) => (
                    <tr key={item.id} className="hover:bg-graphite-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{item.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{item.partNumber}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100">
                        {item.quantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
