import React from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wrench,
  Target,
  Layers,
  Grid
} from 'lucide-react';
import {
  BoardConfig,
  PlacedChannel,
  Rotation,
  CustomCategory,
  MOUNTING_OPTIONS,
  MountingType,
  ConnectorMode
} from '../lib/types';
import {
  getChannelSnapCount,
  getChannelUnitLength,
  findCollisions,
  isChannelOutOfBounds
} from '../lib/geometry';
import { getChannelPartNumber } from '../lib/bom';

interface InspectorPanelProps {
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  selectedChannelId: string | null;
  categories: CustomCategory[];
  onUpdateChannel: (channel: PlacedChannel) => void;
  onDeleteChannel: (id: string) => void;
  onDuplicateChannel: (channel: PlacedChannel) => void;
  isEditingMounts?: boolean;
  onToggleMountEdit?: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  boardConfig,
  channels,
  selectedChannelId,
  categories,
  onUpdateChannel,
  onDeleteChannel,
  onDuplicateChannel,
  isEditingMounts = false,
  onToggleMountEdit,
}) => {
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // Compute collision & bounds info for selected channel
  const collisions = findCollisions(channels);
  const isSelectedColliding = selectedChannel
    ? collisions.collidingChannelIds.some(
        ([id1, id2]) => id1 === selectedChannel.id || id2 === selectedChannel.id
      )
    : false;
  const isSelectedOutOfBounds = selectedChannel
    ? isChannelOutOfBounds(selectedChannel, boardConfig)
    : false;

  const currentSnapCount = selectedChannel ? getChannelSnapCount(selectedChannel) : 0;
  const isWeakMounting = selectedChannel?.connectorMode === 'manual' && currentSnapCount < 2;

  const handleRotate = (direction: 'cw' | 'ccw') => {
    if (!selectedChannel) return;
    const delta = direction === 'cw' ? 90 : -90;
    const nextRot = ((((selectedChannel.rotation + delta) % 360) + 360) % 360) as Rotation;
    onUpdateChannel({ ...selectedChannel, rotation: nextRot });
  };

  const handleSetRotation = (rot: Rotation) => {
    if (!selectedChannel) return;
    onUpdateChannel({ ...selectedChannel, rotation: rot });
  };

  const handleLengthChange = (delta: number) => {
    if (!selectedChannel || selectedChannel.kind !== 'straight') return;
    const currentLen = selectedChannel.length ?? 2;
    const nextLen = Math.max(1, Math.min(16, currentLen + delta));
    onUpdateChannel({ ...selectedChannel, length: nextLen });
  };

  const handleSetLength = (len: number) => {
    if (!selectedChannel || selectedChannel.kind !== 'straight') return;
    onUpdateChannel({ ...selectedChannel, length: Math.max(1, Math.min(16, len)) });
  };

  const handleSetMountingType = (mType: MountingType) => {
    if (!selectedChannel) return;
    onUpdateChannel({
      ...selectedChannel,
      mountingType: mType,
    });
  };

  const handleSetConnectorMode = (mode: ConnectorMode) => {
    if (!selectedChannel) return;
    onUpdateChannel({
      ...selectedChannel,
      connectorMode: mode,
    });
  };

  const selectedMountingOption = MOUNTING_OPTIONS.find(
    (opt) => opt.id === (selectedChannel?.mountingType ?? 'threaded_snap')
  ) || MOUNTING_OPTIONS[0];

  const partNumber = selectedChannel
    ? getChannelPartNumber(
        selectedChannel.kind,
        selectedChannel.length,
        selectedChannel.widthUnits,
        selectedChannel.heightUnits,
        selectedChannel.armSpanUnits,
        selectedChannel.trunkSpanUnits,
        selectedChannel.branchSpanUnits,
        selectedChannel.radiusUnits,
        selectedChannel.mitreArmA,
        selectedChannel.mitreArmB,
        selectedChannel.offsetUnits,
        selectedChannel.yTrunkUnits,
        selectedChannel.yBranchUnits
      )
    : '';

  return (
    <aside className="w-72 border-l border-graphite-600 bg-graphite-850 flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="h-10 border-b border-graphite-600 px-3 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-brand-primary shrink-0" />
          {selectedChannel ? 'Channel Properties' : 'Inspector'}
        </span>
        {selectedChannel && (
          <span
            className="font-mono text-[10px] text-brand-accent bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/30 truncate max-w-[140px]"
            title={partNumber}
          >
            {partNumber}
          </span>
        )}
      </div>

      {selectedChannel ? (
        /* CHANNEL PROPERTIES */
        <div className="p-3 space-y-3.5">
          {/* Status Badge */}
          {isSelectedColliding ? (
            <div className="flex items-center gap-2 p-2 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-medium">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Channel Collision</span>
            </div>
          ) : isSelectedOutOfBounds ? (
            <div className="flex items-center gap-2 p-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Out of Grid Bounds</span>
            </div>
          ) : isWeakMounting ? (
            <div className="flex items-center gap-2 p-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Weak Mounting (&lt;2 points)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Valid Placement & Mounting</span>
            </div>
          )}

          {/* Part & Dimensions in MU & mm */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Part & Dimensions
            </span>
            <div className="p-2.5 rounded-lg bg-graphite-900 border border-graphite-700 space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-slate-200 truncate">
                  {selectedChannel.kind === 'straight'
                    ? 'Straight Channel (I)'
                    : selectedChannel.kind === 'corner'
                    ? '90° Corner (Elbow)'
                    : selectedChannel.kind === 'junction'
                    ? 'T-Junction (3-Way)'
                    : selectedChannel.kind === 'cross'
                    ? '4-Way Cross'
                    : selectedChannel.kind === 'curved'
                    ? 'Radial Curved (Curved)'
                    : selectedChannel.kind === 'y_split'
                    ? 'Y-Split (Fork)'
                    : selectedChannel.kind === 'diagonal'
                    ? 'Diagonal Channel (Jog)'
                    : selectedChannel.kind === 'mitred'
                    ? 'Mitered Corner (Mitred)'
                    : selectedChannel.kind === 'spool'
                    ? 'Cable Spool'
                    : selectedChannel.kind === 'socket_holder'
                    ? 'Tessan Socket Holder'
                    : selectedChannel.kind === 'accessory'
                    ? (selectedChannel.label || 'Modular Accessory')
                    : 'Part'}
                </span>
                <span className="font-mono text-brand-accent font-bold shrink-0">
                  {selectedChannel.kind === 'spool'
                    ? '3×6 MU'
                    : selectedChannel.kind === 'socket_holder'
                    ? '6×6 MU'
                    : selectedChannel.kind === 'accessory'
                    ? `${selectedChannel.widthUnits ?? 6}×${selectedChannel.length ?? 3} MU`
                    : `${getChannelUnitLength(selectedChannel)} MU (${getChannelUnitLength(selectedChannel) * 25} mm)`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-graphite-800">
                <span>Pitch: 1 MU = 25 mm</span>
                <span className="font-mono text-slate-300">
                  {selectedChannel.kind === 'spool'
                    ? '18 cells (4 snaps)'
                    : selectedChannel.kind === 'socket_holder'
                    ? '36 cells (4 snaps)'
                    : `Section: ${(selectedChannel.widthUnits ?? 1) * 25}×${(selectedChannel.heightUnits ?? 1) * 25} mm`}
                </span>
              </div>
            </div>
          </div>

          {/* Parametric Controls: Straight Length */}
          {selectedChannel.kind === 'straight' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Parametric Length
              </span>

              {/* Stepper */}
              <div className="flex items-center justify-between p-1 rounded bg-graphite-900 border border-graphite-700 text-xs">
                <button
                  onClick={() => handleLengthChange(-1)}
                  disabled={(selectedChannel.length ?? 2) <= 1}
                  className="w-7 h-6 rounded bg-graphite-800 text-slate-200 hover:bg-graphite-700 disabled:opacity-30 font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-mono font-bold text-white text-xs text-center">
                  {selectedChannel.length ?? 2} MU ({(selectedChannel.length ?? 2) * 25} mm)
                </span>
                <button
                  onClick={() => handleLengthChange(1)}
                  disabled={(selectedChannel.length ?? 2) >= 16}
                  className="w-7 h-6 rounded bg-graphite-800 text-slate-200 hover:bg-graphite-700 disabled:opacity-30 font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Quick Presets (10 presets in 2 rows of 5) */}
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 6, 8, 10, 12, 14, 16].map((len) => (
                  <button
                    key={len}
                    onClick={() => handleSetLength(len)}
                    className={`py-1 rounded font-mono text-[10px] border transition-all ${
                      (selectedChannel.length ?? 2) === len
                        ? 'bg-brand-primary border-brand-primary text-white font-bold'
                        : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                    }`}
                  >
                    {len}U
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parametric Controls: Corner (Elbow) Arm Span */}
          {selectedChannel.kind === 'corner' && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Arm Span
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[2, 3, 4].map((span) => (
                  <button
                    key={span}
                    onClick={() =>
                      onUpdateChannel({
                        ...selectedChannel,
                        armSpanUnits: span,
                      })
                    }
                    className={`py-1.5 rounded font-mono text-xs border transition-all ${
                      (selectedChannel.armSpanUnits ?? 2) === span
                        ? 'bg-brand-primary border-brand-primary text-white font-bold'
                        : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                    }`}
                  >
                    {span}×{span} MU
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parametric Controls: Curved Channel Radius */}
          {selectedChannel.kind === 'curved' && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Bending Radius
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      onUpdateChannel({
                        ...selectedChannel,
                        radiusUnits: r,
                      })
                    }
                    className={`py-1.5 rounded font-mono text-xs border transition-all ${
                      (selectedChannel.radiusUnits ?? 2) === r
                        ? 'bg-brand-primary border-brand-primary text-white font-bold'
                        : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                    }`}
                  >
                    R{r} ({r * 25} mm)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parametric Controls: T-Junction Trunk & Branch */}
          {selectedChannel.kind === 'junction' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trunk Length
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[3, 4, 5, 6].map((trunk) => (
                    <button
                      key={trunk}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          trunkSpanUnits: trunk,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.trunkSpanUnits ?? 3) === trunk
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {trunk} MU
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Branch Length
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[2, 3, 4].map((branch) => (
                    <button
                      key={branch}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          branchSpanUnits: branch,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.branchSpanUnits ?? 2) === branch
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {branch} MU
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Parametric Controls: Y-Split Trunk & Branch */}
          {selectedChannel.kind === 'y_split' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trunk Length
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          yTrunkUnits: t,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.yTrunkUnits ?? 2) === t
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {t} MU
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Fork Configuration
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { t: 2, b: 2, label: '2×2' },
                    { t: 3, b: 2, label: '3×2' },
                    { t: 4, b: 2, label: '4×2' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          yTrunkUnits: p.t,
                          yBranchUnits: p.b,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.yTrunkUnits ?? 2) === p.t && (selectedChannel.yBranchUnits ?? 2) === p.b
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Parametric Controls: Diagonal Jog */}
          {selectedChannel.kind === 'diagonal' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Run Length
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[3, 4, 5, 6].map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          length: l,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.length ?? 3) === l
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {l} MU
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Lateral Offset (Jog)
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((o) => (
                    <button
                      key={o}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          offsetUnits: o,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.offsetUnits ?? 1) === o
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      +{o} MU
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Parametric Controls: Mitred Corner */}
          {selectedChannel.kind === 'mitred' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Arm A (Horizontal)
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[2, 3, 4, 6].map((a) => (
                    <button
                      key={a}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          mitreArmA: a,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.mitreArmA ?? 2) === a
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {a} MU
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Arm B (Vertical)
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[2, 3, 4, 6].map((b) => (
                    <button
                      key={b}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          mitreArmB: b,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.mitreArmB ?? 2) === b
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {b} MU
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Informative Note for Spool */}
          {selectedChannel.kind === 'spool' && (
            <div className="p-2.5 rounded bg-graphite-900 border border-brand-primary/40 space-y-1">
              <div className="text-xs font-semibold text-brand-accent flex items-center gap-1">
                <span>Underware Cable Spool</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Winding spool for long or excess cables. Mounts securely with 4 snaps at module corners (3×6 MU, 75×150 mm).
              </p>
            </div>
          )}

          {/* Informative Note for Socket Holder */}
          {selectedChannel.kind === 'socket_holder' && (
            <div className="p-2.5 rounded bg-graphite-900 border border-brand-primary/40 space-y-1">
              <div className="text-xs font-semibold text-brand-accent flex items-center gap-1">
                <span>Tessan Socket Holder</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Custom bracket for Tessan USB cube power strip. Mounts securely with 4 snaps at plate corners (6×6 MU, 150×150 mm).
              </p>
            </div>
          )}

          {/* Informative Note for Custom Modular Accessory */}
          {selectedChannel.kind === 'accessory' && (
            <div className="p-2.5 rounded bg-graphite-900 border border-brand-primary/40 space-y-1">
              <div className="text-xs font-semibold text-brand-accent flex items-center gap-1">
                <span>Modular Accessory: {selectedChannel.label || 'Custom'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Plate dimensions: {selectedChannel.widthUnits ?? 6}×{selectedChannel.length ?? 3} MU. Mounted with 4 snaps at module corners.
              </p>
            </div>
          )}

          {/* Parametric Width & Height Controls (1 MU vs 2 MU) - only for standard channels */}
          {selectedChannel.kind !== 'spool' && selectedChannel.kind !== 'socket_holder' && selectedChannel.kind !== 'accessory' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Width (W)
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {[1, 2].map((w) => (
                    <button
                      key={w}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          widthUnits: w,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.widthUnits ?? 1) === w
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {w} MU
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Height (H)
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {[1, 2].map((h) => (
                    <button
                      key={h}
                      onClick={() =>
                        onUpdateChannel({
                          ...selectedChannel,
                          heightUnits: h,
                        })
                      }
                      className={`py-1 rounded font-mono text-xs border transition-all ${
                        (selectedChannel.heightUnits ?? 1) === h
                          ? 'bg-brand-primary border-brand-primary text-white font-bold'
                          : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                      }`}
                    >
                      {h} MU
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MOUNTING SYSTEM */}
          <div className="space-y-2 pt-1.5 border-t border-graphite-700">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-brand-accent" />
                Mounting System
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                {currentSnapCount} {currentSnapCount === 1 ? 'point' : 'points'}
              </span>
            </div>

            {/* Mounting Type Selector */}
            <div className="space-y-1">
              <select
                value={selectedChannel.mountingType ?? 'threaded_snap'}
                onChange={(e) => handleSetMountingType(e.target.value as MountingType)}
                className="w-full rounded bg-graphite-900 border border-graphite-700 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-brand-primary cursor-pointer"
              >
                <optgroup label="Supported Systems">
                  {MOUNTING_OPTIONS.filter((opt) => opt.isImplemented).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Coming Soon (Planning)">
                  {MOUNTING_OPTIONS.filter((opt) => !opt.isImplemented).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} [Coming Soon]
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Explanatory Note */}
              <div className="p-2 rounded bg-graphite-900/80 border border-graphite-800 text-[11px] text-slate-400 leading-relaxed">
                {selectedMountingOption.notes}
                {!selectedMountingOption.isImplemented && (
                  <span className="block mt-1 text-amber-400/90 font-medium">
                    Option for preliminary planning purposes only.
                  </span>
                )}
              </div>
            </div>

            {/* Strategy: Auto vs Manual */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Point Placement</span>
                <div className="flex rounded bg-graphite-900 border border-graphite-700 p-0.5 text-[10px]">
                  <button
                    onClick={() => handleSetConnectorMode('auto')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      (selectedChannel.connectorMode ?? 'auto') === 'auto'
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Automatic
                  </button>
                  <button
                    onClick={() => handleSetConnectorMode('manual')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      selectedChannel.connectorMode === 'manual'
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {/* Edit Mount Points Button */}
              {onToggleMountEdit && (
                <button
                  onClick={onToggleMountEdit}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold border transition-all ${
                    isEditingMounts
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm ring-2 ring-brand-primary/40'
                      : 'bg-graphite-800 text-slate-200 border-graphite-600 hover:bg-graphite-700 hover:border-brand-primary'
                  }`}
                >
                  <Target className="h-3.5 w-3.5 text-brand-accent" />
                  <span>
                    {isEditingMounts ? 'Finish Editing Mounts' : 'Edit Mount Points'}
                  </span>
                </button>
              )}

              {isEditingMounts && (
                <p className="text-[10px] text-brand-accent bg-brand-primary/10 border border-brand-primary/30 rounded p-1.5 text-center">
                  Dragging disabled: click circles to add/remove mount snaps.
                </p>
              )}
            </div>
          </div>

          {/* Category Picker */}
          <div className="space-y-1.5 pt-1.5 border-t border-graphite-700">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Category / Color
            </span>
            <div className="space-y-1">
              {categories.map((cat) => {
                const isSelected = selectedChannel.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onUpdateChannel({ ...selectedChannel, category: cat.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-all ${
                      isSelected
                        ? 'border-opacity-60 text-white font-semibold shadow-sm'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-graphite-800'
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${cat.color}20` : 'transparent',
                      borderColor: isSelected ? cat.color : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {isSelected && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Rotation
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {selectedChannel.rotation}°
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {([0, 90, 180, 270] as Rotation[]).map((rot) => (
                <button
                  key={rot}
                  onClick={() => handleSetRotation(rot)}
                  className={`py-1 rounded font-mono text-[11px] border transition-all ${
                    selectedChannel.rotation === rot
                      ? 'bg-brand-primary border-brand-primary text-white font-bold'
                      : 'bg-graphite-900 border-graphite-700 text-slate-400 hover:bg-graphite-800 hover:text-white'
                  }`}
                >
                  {rot}°
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => handleRotate('ccw')}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-graphite-900 border border-graphite-700 text-[11px] text-slate-300 hover:bg-graphite-800"
                title="Rotate 90° CCW"
              >
                <RotateCcw className="h-3 w-3" />
                <span>-90°</span>
              </button>
              <button
                onClick={() => handleRotate('cw')}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-graphite-900 border border-graphite-700 text-[11px] text-slate-300 hover:bg-graphite-800"
                title="Rotate 90° CW"
              >
                <RotateCw className="h-3 w-3" />
                <span>+90°</span>
              </button>
            </div>
          </div>

          {/* Duplicate & Delete Actions */}
          <div className="pt-2 border-t border-graphite-700 flex items-center gap-2">
            <button
              onClick={() => onDuplicateChannel(selectedChannel)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-graphite-800 border border-graphite-700 text-xs font-medium text-slate-200 hover:bg-graphite-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-brand-accent" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={() => onDeleteChannel(selectedChannel.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        /* CLEAN, NON-REDUNDANT EMPTY STATE */
        <div className="p-3 space-y-3">
          {/* Card 1: Selection & Instructions */}
          <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-3 space-y-2 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-accent">
              <Sliders className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-slate-200">
              No Channel Selected
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click any channel or accessory placed on the grid to inspect and adjust length, rotation, category, and mounting points.
            </p>
          </div>

          {/* Card 2: Placed Elements Summary */}
          <div className="rounded-lg border border-graphite-700 bg-graphite-900 p-3 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-accent" />
              Board Elements
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Placed channels:</span>
                <span className="font-mono font-bold text-slate-100">
                  {channels.length} {channels.length === 1 ? 'part' : 'parts'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Mounting points:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {channels.reduce((sum, ch) => sum + getChannelSnapCount(ch), 0)} snaps
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-graphite-800">
                <span>Layout status:</span>
                {collisions.collidingChannelIds.length > 0 ? (
                  <span className="font-semibold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{collisions.collidingChannelIds.length} conflicts</span>
                  </span>
                ) : channels.length === 0 ? (
                  <span className="text-slate-500 italic">Empty board</span>
                ) : (
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Clear</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Quick Shortcuts Guide */}
          <div className="rounded-lg border border-graphite-800 bg-graphite-900/60 p-3 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Grid className="h-3.5 w-3.5 text-slate-400" />
              Quick Shortcuts
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Drag part</span>
                <span className="font-mono text-slate-300">Move</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Key R</span>
                <span className="font-mono text-slate-300">Rotate +90°</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Del / Backspace</span>
                <span className="font-mono text-slate-300">Delete</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Measure (M)</span>
                <span className="font-mono text-slate-300">Route</span>
              </div>
            </div>
          </div>

          {/* Prototype Disclaimer */}
          <div className="p-2.5 rounded-lg border border-graphite-800/80 bg-graphite-950/40 text-[10px] text-slate-500 leading-normal">
            Preliminary planning layout for KeepMaking Multiboard & Underware 2.0.
          </div>
        </div>
      )}
    </aside>
  );
};
