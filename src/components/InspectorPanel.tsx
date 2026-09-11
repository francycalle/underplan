import React from 'react';
import {
  Trash2,
  Copy,
  AlertTriangle,
  Wrench,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  BoardConfig,
  PlacedChannel,
  Rotation,
  CustomCategory,
  MOUNTING_OPTIONS,
  MountingType,
} from '../lib/types';
import {
  getChannelSnapCount,
  findCollisions,
  isChannelOutOfBounds,
} from '../lib/geometry';

interface InspectorPanelProps {
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  selectedChannelId: string | null;
  categories: CustomCategory[];
  onUpdateChannel: (channel: PlacedChannel) => void;
  onDeleteChannel: (id: string) => void;
  onDuplicateChannel: (channel: PlacedChannel) => void;
  onClose?: () => void;
  isEditingMounts?: boolean;
  onToggleMountEdit?: () => void;
}

const LENGTH_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];
const WIDTH_OPTIONS = [1, 2, 3, 4, 5];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  boardConfig,
  channels,
  selectedChannelId,
  categories,
  onUpdateChannel,
  onDeleteChannel,
  onDuplicateChannel,
  onClose,
  isEditingMounts = false,
  onToggleMountEdit,
}) => {
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // If nothing is selected, the inspector is hidden to maintain 100% canvas focus
  if (!selectedChannel) return null;

  const collisions = findCollisions(channels);
  const isSelectedColliding = collisions.collidingChannelIds.some(
    ([id1, id2]) => id1 === selectedChannel.id || id2 === selectedChannel.id
  );
  const isSelectedOutOfBounds = isChannelOutOfBounds(selectedChannel, boardConfig);

  const currentSnapCount = getChannelSnapCount(selectedChannel);
  const currentLength = selectedChannel.length ?? 3;
  const currentWidth = selectedChannel.widthUnits ?? 1;

  const handleSetLength = (len: number) => {
    const validLen = Math.max(1, Math.min(16, len));
    onUpdateChannel({
      ...selectedChannel,
      length: validLen,
    });
  };

  const handleSetWidth = (w: number) => {
    onUpdateChannel({
      ...selectedChannel,
      widthUnits: w as 1 | 2,
    });
  };

  const handleSetRotation = (rot: Rotation) => {
    onUpdateChannel({
      ...selectedChannel,
      rotation: rot,
    });
  };

  const handleSetMounting = (mType: MountingType) => {
    onUpdateChannel({
      ...selectedChannel,
      mountingType: mType,
    });
  };

  const handleSetCategory = (catId: string) => {
    onUpdateChannel({
      ...selectedChannel,
      category: catId as any,
    });
  };

  const isStraight = selectedChannel.kind === 'straight';
  const isCustom = selectedChannel.kind === 'accessory';

  return (
    <aside
      className="fixed top-24 right-6 w-72 z-40 pointer-events-auto rounded-3xl bg-[#0E1322]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-4 text-white flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header: Title & Close */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {isCustom ? selectedChannel.label || 'Custom Accessory' : 'Channel Length (MU)'}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Deselect (Esc)"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Length Stepper & Quick Pills (For Straight Channels) */}
      {isStraight && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700/80 rounded-xl p-1">
            <button
              type="button"
              onClick={() => handleSetLength(currentLength - 1)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm transition-colors"
              title="Decrease length"
            >
              -
            </button>
            <div className="text-center font-mono font-bold text-sm">
              {currentLength} MU
              <span className="text-[10px] text-slate-400 font-normal ml-1">
                ({currentLength * 25}mm)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSetLength(currentLength + 1)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm transition-colors"
              title="Increase length"
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {LENGTH_PRESETS.map((len) => {
              const isSelected = currentLength === len;
              return (
                <button
                  key={len}
                  type="button"
                  onClick={() => handleSetLength(len)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {len}MU
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Width (MU) Stepped Line */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Width (MU)</span>
          <span className="font-mono text-slate-300 text-[11px]">{currentWidth} MU</span>
        </div>
        <div className="relative px-2 py-1">
          {/* Track line */}
          <div className="absolute top-[9px] left-3 right-3 h-[2px] bg-slate-800" />
          {/* Active track progress */}
          <div
            className="absolute top-[9px] left-3 h-[2px] bg-blue-500 transition-all"
            style={{ width: `${((currentWidth - 1) / (WIDTH_OPTIONS.length - 1)) * 100}%` }}
          />
          {/* Dots and Labels */}
          <div className="relative flex items-center justify-between">
            {WIDTH_OPTIONS.map((w) => {
              const isSelected = currentWidth === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleSetWidth(w)}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                  title={`Set width to ${w} MU`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 ring-4 ring-blue-500/20 scale-110'
                        : 'bg-slate-800 border-2 border-slate-700 group-hover:border-slate-500'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={`text-[11px] font-mono transition-colors ${
                      isSelected ? 'text-white font-bold' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {w}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mounting System Dropdown & Edit Points */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Mounting System</span>
        <div className="relative">
          <select
            value={selectedChannel.mountingType ?? 'threaded_snap'}
            onChange={(e) => handleSetMounting(e.target.value as MountingType)}
            className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:border-blue-500 pr-8 cursor-pointer"
          >
            {MOUNTING_OPTIONS.filter((m) => m.isAvailable).map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                {opt.name} ({currentSnapCount} snaps)
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {onToggleMountEdit && (
          <button
            type="button"
            onClick={onToggleMountEdit}
            className={`w-full mt-1 py-2 px-3 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              isEditingMounts
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench size={13} />
            <span>{isEditingMounts ? 'Done Editing Snaps' : 'Edit Mount points'}</span>
          </button>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Category</span>
        <div className="relative flex items-center">
          <span
            className="absolute left-3.5 w-2.5 h-2.5 rounded-full pointer-events-none z-10"
            style={{ backgroundColor: categories.find((c) => c.id === selectedChannel.category)?.color || '#38BDF8' }}
          />
          <select
            value={selectedChannel.category}
            onChange={(e) => handleSetCategory(e.target.value)}
            className="w-full appearance-none pl-8 pr-8 py-2.5 rounded-xl bg-slate-900 border-2 border-blue-500 text-white text-xs font-medium focus:outline-none pr-8 cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
          />
        </div>
      </div>

      {/* Rotation (0°, 90°, 180°, 270°) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400 flex items-center justify-between">
          <span>Rotation</span>
          <span className="text-[10px] text-slate-500 font-mono">(Key: R)</span>
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {([0, 90, 180, 270] as Rotation[]).map((rot) => {
            const isSelected = (selectedChannel.rotation ?? 0) === rot;
            return (
              <button
                key={rot}
                type="button"
                onClick={() => handleSetRotation(rot)}
                className={`py-1.5 rounded-xl text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-blue-600/30 border border-blue-500 text-white font-bold'
                    : 'bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {rot}°
              </button>
            );
          })}
        </div>
      </div>

      {/* Duplicate Button */}
      <button
        type="button"
        onClick={() => onDuplicateChannel(selectedChannel)}
        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <Copy size={14} className="text-slate-400" />
        <span>Duplicate</span>
      </button>

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onDeleteChannel(selectedChannel.id)}
        className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
      >
        <Trash2 size={15} />
        <span>Delete Channel</span>
      </button>

      {/* Validation Warnings */}
      {(isSelectedColliding || isSelectedOutOfBounds) && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-amber-400" />
          <span>
            {isSelectedColliding
              ? 'Warning: Overlaps another channel on the grid.'
              : 'Warning: Channel extends beyond board boundaries.'}
          </span>
        </div>
      )}
    </aside>
  );
};
