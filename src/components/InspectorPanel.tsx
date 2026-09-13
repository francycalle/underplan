import React, { useMemo } from 'react';
import {
  AlertTriangle,
} from 'lucide-react';
import {
  BoardConfig,
  PlacedChannel,
  CustomCategory,
  MOUNTING_OPTIONS,
  MountingType,
  ChannelCategory,
  ChannelKind,
} from '../lib/types';
import {
  getChannelSnapCount,
  findCollisions,
  isChannelOutOfBounds,
} from '../lib/geometry';
import { ToolType } from './ToolPalette';

export interface InspectorPanelProps {
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

  // Active placement parameters
  activeTool?: ToolType;
  straightLength?: number;
  onSetStraightLength?: (len: number) => void;
  channelWidthUnits?: number;
  onSetChannelWidthUnits?: (w: number) => void;
  activeCategory?: ChannelCategory;
  placementCategory?: ChannelCategory | null;
  onSetPlacementCategory?: (cat: ChannelCategory) => void;
  placementMountingType?: MountingType;
  onSetPlacementMountingType?: (m: MountingType) => void;

  // Topology-specific placement parameters
  armSpanUnits?: number;
  onSetArmSpanUnits?: (span: number) => void;
  curvedRadius?: number;
  onSetCurvedRadius?: (r: number) => void;
  trunkSpanUnits?: number;
  onSetTrunkSpanUnits?: (t: number) => void;
  branchSpanUnits?: number;
  onSetBranchSpanUnits?: (b: number) => void;
  yTrunkUnits?: number;
  onSetYTrunkUnits?: (t: number) => void;
  yBranchUnits?: number;
  onSetYBranchUnits?: (b: number) => void;

  // Mirror action (T-channel branch flip)
  onMirrorChannel?: (channel: PlacedChannel) => void;
  onMirrorPlacement?: () => void;
}

const STRAIGHT_QUICK_ROW_1 = [1, 2, 3, 4];
const STRAIGHT_QUICK_ROW_2 = [5, 6, 8, 10];
const ROUND_QUICK_PILLS = [2, 3, 4, 5];
const ELBOW_SPAN_PILLS = [
  { label: '2X2', value: 2 },
  { label: '3X3', value: 3 },
  { label: '4X4', value: 4 },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  boardConfig,
  channels,
  selectedChannelId,
  categories,
  onUpdateChannel,
  onDeleteChannel: _onDeleteChannel,
  onDuplicateChannel,
  isEditingMounts = false,
  onToggleMountEdit,
  activeTool,
  straightLength = 10,
  onSetStraightLength,
  channelWidthUnits = 1,
  onSetChannelWidthUnits,
  activeCategory,
  placementCategory,
  onSetPlacementCategory,
  placementMountingType = 'threaded_snap',
  onSetPlacementMountingType,
  armSpanUnits = 2,
  onSetArmSpanUnits,
  curvedRadius = 2,
  onSetCurvedRadius,
  trunkSpanUnits = 3,
  onSetTrunkSpanUnits,
  branchSpanUnits = 2,
  onSetBranchSpanUnits,
  yTrunkUnits = 1,
  onSetYTrunkUnits,
  yBranchUnits = 1,
  onSetYBranchUnits,
  onMirrorChannel,
  onMirrorPlacement,
}) => {
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const isPlacementMode = !selectedChannel && activeTool && activeTool !== 'select' && activeTool !== 'measure';

  // If nothing is selected and not in placement mode, inspector is hidden
  if (!selectedChannel && !isPlacementMode) return null;

  // Determine active channel kind / topology
  const activeKind: ChannelKind | ToolType = selectedChannel
    ? selectedChannel.kind
    : (activeTool as ChannelKind | ToolType || 'straight');

  const isStraight = activeKind === 'straight';
  const isElbow = activeKind === 'corner' || (activeKind as string) === 'elbow';
  const isRound = activeKind === 'curved' || (activeKind as string) === 'round';
  const isTChannel = activeKind === 'junction' || (activeKind as string) === 't';
  const isXChannel = activeKind === 'cross' || (activeKind as string) === 'x';
  const isYChannel = activeKind === 'y_split' || (activeKind as string) === 'y';
  const isCustomAccessory =
    activeKind === 'accessory' ||
    activeKind === 'spool' ||
    activeKind === 'socket_holder' ||
    (activeKind as string) === 'custom';

  // Current values
  const currentLength = selectedChannel ? (selectedChannel.length ?? 3) : (straightLength ?? 10);
  const currentArmSpan = selectedChannel ? (selectedChannel.armSpanUnits ?? 2) : (armSpanUnits ?? 2);
  const currentRadius = selectedChannel ? (selectedChannel.radiusUnits ?? 2) : (curvedRadius ?? 2);
  const currentTrunk = selectedChannel ? (selectedChannel.trunkSpanUnits ?? 3) : (trunkSpanUnits ?? 3);
  const currentBranch = selectedChannel ? (selectedChannel.branchSpanUnits ?? 2) : (branchSpanUnits ?? 2);
  const currentYBranch = selectedChannel
    ? (selectedChannel.yBranchUnits ?? selectedChannel.yTrunkUnits ?? 1)
    : (yBranchUnits ?? yTrunkUnits ?? 1);
  const rawWidth = selectedChannel ? (selectedChannel.widthUnits ?? 1) : (channelWidthUnits ?? 1);
  const currentWidth = (isElbow && currentArmSpan <= 2) || (isTChannel && currentTrunk <= 3)
    ? 1
    : rawWidth;
  const isOpenGrid = boardConfig?.platform === 'opengrid';
  const unitName = isOpenGrid ? 'OU' : 'MU';
  const defaultMounting: MountingType = isOpenGrid ? 'opengrid_base_snap' : 'threaded_snap';
  const currentMounting = selectedChannel
    ? (selectedChannel.mountingType ?? defaultMounting)
    : (placementMountingType ?? defaultMounting);

  const availableMountings = useMemo(() => {
    const isOG = boardConfig?.platform === 'opengrid';
    if (isOG) {
      return MOUNTING_OPTIONS.filter(
        (m) =>
          m.id === 'opengrid_base_snap' ||
          m.id === 'opengrid_grip_snap' ||
          m.id === 'none' ||
          m.id === selectedChannel?.mountingType
      );
    }
    return MOUNTING_OPTIONS.filter(
      (m) =>
        m.id === 'threaded_snap' ||
        m.id === 'direct_snap' ||
        m.id === 'direct_screw' ||
        m.id === 'multiconnect' ||
        m.id === 'none' ||
        m.id === selectedChannel?.mountingType
    );
  }, [boardConfig?.platform, selectedChannel?.mountingType]);

  const activeCategoryId = selectedChannel
    ? selectedChannel.category
    : (placementCategory || activeCategory || categories[0]?.id);

  const resolvedCategoryId = useMemo(() => {
    if (categories.some((c) => c.id === activeCategoryId)) return activeCategoryId;
    const byName = categories.find((c) => c.name.toLowerCase() === String(activeCategoryId).toLowerCase());
    if (byName) return byName.id;
    return categories[0]?.id || activeCategoryId;
  }, [categories, activeCategoryId]);

  const activeCat = categories.find((c) => c.id === resolvedCategoryId) || categories[0];

  const collisions = selectedChannel ? findCollisions(channels) : { collidingChannelIds: [], collidingCells: [] };
  const isSelectedColliding = selectedChannel
    ? collisions.collidingChannelIds.some(
        ([id1, id2]) => id1 === selectedChannel.id || id2 === selectedChannel.id
      )
    : false;
  const isSelectedOutOfBounds = selectedChannel ? isChannelOutOfBounds(selectedChannel, boardConfig) : false;

  const currentSnapCount = selectedChannel
    ? getChannelSnapCount(selectedChannel)
    : (isStraight ? Math.max(2, currentLength * currentWidth) : 2);

  // Width ticks options per topology matching user requirements
  const widthTicks = useMemo(() => {
    if (isStraight) return [1, 2, 3, 4, 5];
    if (isElbow) {
      if (currentArmSpan <= 2) return [1];
      return [1, 2];
    }
    if (isRound) {
      if (currentRadius <= 2) return [1];
      if (currentRadius === 3) return [1, 2];
      return [1, 2, 3];
    }
    if (isTChannel) {
      if (currentTrunk <= 3) return [1];
      return [1, 2];
    }
    if (isXChannel) return [1, 2, 3];
    if (isYChannel) return [1, 2];
    return [1, 2];
  }, [isStraight, isElbow, currentArmSpan, isRound, currentRadius, isTChannel, currentTrunk, isXChannel, isYChannel]);

  // Handlers
  const handleSetLength = (len: number) => {
    const validLen = Math.max(1, Math.min(16, len));
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        length: validLen,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetStraightLength?.(validLen);
    }
  };

  const handleSetArmSpan = (span: number) => {
    const validSpan = Math.max(2, Math.min(4, span));
    const nextW = validSpan <= 2 ? 1 : currentWidth;
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        armSpanUnits: validSpan,
        widthUnits: nextW as any,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetArmSpanUnits?.(validSpan);
      if (nextW !== currentWidth) {
        onSetChannelWidthUnits?.(nextW);
      }
    }
  };

  const handleSetRadius = (r: number) => {
    const validR = Math.max(2, Math.min(5, r));
    const maxW = validR <= 2 ? 1 : validR === 3 ? 2 : 3;
    const nextW = Math.min(currentWidth, maxW);
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        radiusUnits: validR,
        widthUnits: nextW as any,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetCurvedRadius?.(validR);
      if (nextW !== currentWidth) {
        onSetChannelWidthUnits?.(nextW);
      }
    }
  };

  const handleSetTrunk = (t: number) => {
    const validT = Math.max(3, Math.min(8, t));
    const maxW = validT <= 3 ? 1 : 2;
    const nextW = Math.min(currentWidth, maxW);
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        trunkSpanUnits: validT,
        widthUnits: nextW as any,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetTrunkSpanUnits?.(validT);
      if (nextW !== currentWidth) {
        onSetChannelWidthUnits?.(nextW);
      }
    }
  };

  const handleSetBranch = (b: number) => {
    const validB = Math.max(1, Math.min(6, b));
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        branchSpanUnits: validB,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetBranchSpanUnits?.(validB);
    }
  };

  const handleSetYBranch = (b: number) => {
    const validB = Math.max(1, Math.min(6, b));
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        yBranchUnits: validB,
        yTrunkUnits: validB,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetYBranchUnits?.(validB);
      onSetYTrunkUnits?.(validB);
    }
  };

  const handleSetWidth = (w: number) => {
    if (selectedChannel) {
      onUpdateChannel({
        ...selectedChannel,
        widthUnits: w as any,
        connectorMode: 'auto',
        customMountIndices: undefined,
        customMountPoints: undefined,
      });
    } else {
      onSetChannelWidthUnits?.(w);
    }
  };

  const handleSetMounting = (mType: MountingType) => {
    if (selectedChannel) {
      onUpdateChannel({ ...selectedChannel, mountingType: mType });
    } else {
      onSetPlacementMountingType?.(mType);
    }
  };

  const handleSetCategory = (catId: string) => {
    if (selectedChannel) {
      onUpdateChannel({ ...selectedChannel, category: catId as any });
    } else {
      onSetPlacementCategory?.(catId as any);
    }
  };

  return (
    <aside
      className="fixed top-1/2 -translate-y-1/2 right-8 w-[210px] z-40 pointer-events-auto rounded-[20px] bg-[#2A2D36] shadow-2xl p-[15px] text-white flex flex-col gap-3 select-none animate-in fade-in slide-in-from-right-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >

      {/* ========================================================================= */}
      {/* TOPOLOGY 1: STRAIGHT LINE (Length Stepper + 2 Rows of 4 Pills) */}
      {/* ========================================================================= */}
      {isStraight && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
            Channel Length ({unitName})
          </span>

          {/* Stepper Row: w=180, Minus 45x30, Center 80x30, Plus 45x30 */}
          <div className="flex items-center justify-between w-[180px]">
            <button
              type="button"
              onClick={() => handleSetLength(currentLength - 1)}
              disabled={currentLength <= 1}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Decrease length"
            >
              -
            </button>
            <div className="w-[80px] h-[30px] rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] flex items-center justify-center font-['Figtree'] font-black text-sm text-white">
              {currentLength}
            </div>
            <button
              type="button"
              onClick={() => handleSetLength(currentLength + 1)}
              disabled={currentLength >= 16}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Increase length"
            >
              +
            </button>
          </div>

          {/* Quick Unit Pills: Row 1 (1, 2, 3, 4) */}
          <div className="flex items-center justify-between w-[180px]">
            {STRAIGHT_QUICK_ROW_1.map((len) => {
              const isSelected = currentLength === len;
              return (
                <button
                  key={len}
                  type="button"
                  onClick={() => handleSetLength(len)}
                  className={`w-[40px] h-[25px] rounded-[10px] text-xs font-['Figtree'] transition-all border-[2px] ${
                    isSelected
                      ? 'bg-white text-[#15161A] font-black border-white shadow-sm'
                      : 'bg-[#15161A] text-white/70 font-bold border-[#15161A] hover:border-[#383C48] hover:text-white'
                  }`}
                >
                  {len}
                </button>
              );
            })}
          </div>

          {/* Quick Unit Pills: Row 2 (5, 6, 8, 10) */}
          <div className="flex items-center justify-between w-[180px]">
            {STRAIGHT_QUICK_ROW_2.map((len) => {
              const isSelected = currentLength === len;
              return (
                <button
                  key={len}
                  type="button"
                  onClick={() => handleSetLength(len)}
                  className={`w-[40px] h-[25px] rounded-[10px] text-xs font-['Figtree'] transition-all border-[2px] ${
                    isSelected
                      ? 'bg-white text-[#15161A] font-black border-white shadow-sm'
                      : 'bg-[#15161A] text-white/70 font-bold border-[#15161A] hover:border-[#383C48] hover:text-white'
                  }`}
                >
                  {len}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOPOLOGY 2: ELBOW CHANNEL (Arm Span 3 Pills: 2X2, 3X3, 4X4) */}
      {/* ========================================================================= */}
      {isElbow && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
            Arm Span ({unitName})
          </span>

          <div className="flex items-center justify-between w-[180px]">
            {ELBOW_SPAN_PILLS.map((pill) => {
              const isSelected = currentArmSpan === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => handleSetArmSpan(pill.value)}
                  className={`w-[55px] h-[30px] rounded-[10px] text-xs font-['Figtree'] transition-all border-[2px] ${
                    isSelected
                      ? 'bg-white text-[#15161A] font-black border-white shadow-sm'
                      : 'bg-[#15161A] text-white/70 font-bold border-[#15161A] hover:border-[#383C48] hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOPOLOGY 3: ROUND CHANNEL (Radius Stepper + 4 Pills 2,3,4,5) */}
      {/* ========================================================================= */}
      {isRound && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
            Channel Radius ({unitName})
          </span>

          {/* Stepper Row: w=180, Minus 45x30, Center 80x30, Plus 45x30 */}
          <div className="flex items-center justify-between w-[180px]">
            <button
              type="button"
              onClick={() => handleSetRadius(currentRadius - 1)}
              disabled={currentRadius <= 2}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Decrease radius"
            >
              -
            </button>
            <div className="w-[80px] h-[30px] rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] flex items-center justify-center font-['Figtree'] font-black text-sm text-white">
              {currentRadius}
            </div>
            <button
              type="button"
              onClick={() => handleSetRadius(currentRadius + 1)}
              disabled={currentRadius >= 5}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Increase radius"
            >
              +
            </button>
          </div>

          {/* Quick Radius Pills: 2, 3, 4, 5 */}
          <div className="flex items-center justify-between w-[180px]">
            {ROUND_QUICK_PILLS.map((r) => {
              const isSelected = currentRadius === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSetRadius(r)}
                  className={`w-[40px] h-[25px] rounded-[10px] text-xs font-['Figtree'] transition-all border-[2px] ${
                    isSelected
                      ? 'bg-white text-[#15161A] font-black border-white shadow-sm'
                      : 'bg-[#15161A] text-white/70 font-bold border-[#15161A] hover:border-[#383C48] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOPOLOGY 4: T CHANNEL (Trunk Length Stepper + Branch Length Stepper) */}
      {/* ========================================================================= */}
      {isTChannel && (
        <div className="flex flex-col gap-2.5">
          {/* Trunk Length Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
              Trunk Length ({unitName})
            </span>
            <div className="flex items-center justify-between w-[180px]">
              <button
                type="button"
                onClick={() => handleSetTrunk(currentTrunk - 1)}
                disabled={currentTrunk <= 3}
                className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
                title="Decrease trunk length"
              >
                -
              </button>
              <div className="w-[80px] h-[30px] rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] flex items-center justify-center font-['Figtree'] font-black text-sm text-white">
                {currentTrunk}
              </div>
              <button
                type="button"
                onClick={() => handleSetTrunk(currentTrunk + 1)}
                disabled={currentTrunk >= 8}
                className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
                title="Increase trunk length"
              >
                +
              </button>
            </div>
          </div>

          {/* Branch Length Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
              Branch Length ({unitName})
            </span>
            <div className="flex items-center justify-between w-[180px]">
              <button
                type="button"
                onClick={() => handleSetBranch(currentBranch - 1)}
                disabled={currentBranch <= 1}
                className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
                title="Decrease branch length"
              >
                -
              </button>
              <div className="w-[80px] h-[30px] rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] flex items-center justify-center font-['Figtree'] font-black text-sm text-white">
                {currentBranch}
              </div>
              <button
                type="button"
                onClick={() => handleSetBranch(currentBranch + 1)}
                disabled={currentBranch >= 6}
                className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
                title="Increase branch length"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOPOLOGY 6: Y CHANNEL (Branch Length Stepper) */}
      {/* ========================================================================= */}
      {isYChannel && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
            Branch Length ({unitName})
          </span>

          <div className="flex items-center justify-between w-[180px]">
            <button
              type="button"
              onClick={() => handleSetYBranch(currentYBranch - 1)}
              disabled={currentYBranch <= 1}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Decrease branch length"
            >
              -
            </button>
            <div className="w-[80px] h-[30px] rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] flex items-center justify-center font-['Figtree'] font-black text-sm text-white">
              {currentYBranch}
            </div>
            <button
              type="button"
              onClick={() => handleSetYBranch(currentYBranch + 1)}
              disabled={currentYBranch >= 6}
              className="w-[45px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] active:scale-95 disabled:opacity-40 border-[2px] border-[#15161A] hover:border-[#383C48] flex items-center justify-center text-white font-['Figtree'] font-black text-sm transition-all"
              title="Increase branch length"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WIDTH ({unitName}) SLIDER - Tailored for each topology (Hidden for Custom/Accessories) */}
      {/* ========================================================================= */}
      {!isCustomAccessory && (
        <div className="flex flex-col gap-1.5 w-[180px]">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394]">
              Width ({unitName})
            </span>
            <span className="text-[11px] font-['Figtree'] font-bold text-white/90">
              {currentWidth} {unitName}
            </span>
          </div>

          <div className="relative flex flex-col justify-center px-2 py-2 select-none">
            {/* Background connecting track line */}
            <div className="absolute top-[18px] -translate-y-1/2 left-3 right-3 h-[4px] bg-[#15161A] rounded-full" />

            {/* Active filled track from first station to active station */}
            <div
              className="absolute top-[18px] -translate-y-1/2 left-3 h-[4px] rounded-full transition-all duration-150"
              style={{
                backgroundColor: activeCat?.color || '#3B82F6',
                width: widthTicks.length > 1
                  ? `${Math.max(0, Math.min(1, (currentWidth - widthTicks[0]) / (widthTicks[widthTicks.length - 1] - widthTicks[0]))) * (180 - 24)}px`
                  : '0px',
              }}
            />

            {/* Ticks and Numbers */}
            <div className="relative flex items-center justify-between">
              {widthTicks.map((w) => {
                const isSelected = currentWidth === w;
                const isPassed = w < currentWidth;
                const isReached = w <= currentWidth;

                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleSetWidth(w)}
                    className="relative z-10 flex flex-col items-center gap-1 focus:outline-none outline-none group cursor-pointer"
                    title={`Set width to ${w} ${unitName}`}
                  >
                    {/* Station Indicator Dot (wrapped in fixed 20x20 container to prevent vertical bounce) */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <div
                        className={`rounded-full transition-all duration-150 flex items-center justify-center ${
                          isSelected
                            ? 'w-4 h-4 shadow-md ring-2 ring-white/90'
                            : isPassed
                            ? 'w-2.5 h-2.5'
                            : 'w-2.5 h-2.5 bg-[#15161A] border border-[#383C48]/80 group-hover:border-slate-300'
                        }`}
                        style={{
                          backgroundColor: isReached ? (activeCat?.color || '#3B82F6') : undefined,
                        }}
                      >
                        {/* Inner white dot for active station */}
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-inner" />
                        )}
                      </div>
                    </div>

                    {/* Numeric station label (wrapped in fixed 16px container to prevent bounce) */}
                    <div className="h-4 flex items-center justify-center shrink-0">
                      <span
                        className={`text-[10px] font-['Figtree'] leading-none transition-colors ${
                          isSelected
                            ? 'text-white font-black scale-110'
                            : isPassed
                            ? 'text-white/80 font-bold'
                            : 'text-white/30 font-medium group-hover:text-white/70'
                        }`}
                      >
                        {w}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Warning Notes */}
          {isTChannel && currentTrunk <= 3 && (
            <div className="text-[10px] font-['Figtree'] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-[8px] px-2 py-1 leading-tight">
              Trunk da 3 {unitName}: larghezza limitata a 1 {unitName} per geometria T-branch.
            </div>
          )}
          {isRound && currentRadius <= 2 && (
            <div className="text-[10px] font-['Figtree'] text-slate-400 bg-[#15161A] border border-[#383C48]/40 rounded-[8px] px-2 py-1 leading-tight">
              Raggio 2 {unitName}: supporta solo larghezza 1 {unitName}.
            </div>
          )}
          {isElbow && currentArmSpan <= 2 && (
            <div className="text-[10px] font-['Figtree'] text-slate-400 bg-[#15161A] border border-[#383C48]/40 rounded-[8px] px-2 py-1 leading-tight">
              Elbow 2×2 {unitName}: supporta solo larghezza 1 {unitName}.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: MOUNTING SYSTEM (Dropdown & Edit Snaps) */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-1.5 w-[180px]">
        <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394] px-0.5">
          Mounting System
        </span>

        {/* Dropdown: w=180, h=30, rx=10 */}
        <div className="relative w-[180px]">
          <select
            aria-label="Mounting System"
            value={currentMounting}
            onChange={(e) => handleSetMounting(e.target.value as MountingType)}
            className="w-[180px] h-[30px] appearance-none px-3 rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] hover:border-[#383C48] text-white text-xs font-['Figtree'] font-semibold focus:outline-none cursor-pointer pr-7 truncate transition-colors"
          >
            {availableMountings.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[#15161A] text-white font-['Figtree']">
                {opt.name} ({currentSnapCount})
              </option>
            ))}
          </select>
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white"
          >
            <polygon points="1,2 9,2 5,7" fill="white" />
          </svg>
        </div>

        {/* Edit Mount points button (only when channel is placed/selected) */}
        {selectedChannel && onToggleMountEdit && (
          <button
            type="button"
            onClick={onToggleMountEdit}
            className={`w-[180px] h-[30px] rounded-[10px] border-[2px] text-xs font-['Figtree'] font-semibold flex items-center justify-center transition-all active:scale-95 ${
              isEditingMounts
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-[#15161A] border-[#15161A] hover:border-[#383C48] text-white hover:bg-[#1C1D23]'
            }`}
          >
            <span>{isEditingMounts ? 'Done Editing Snaps' : 'Edit Mount points'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION: CATEGORY DROPDOWN */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-1.5 w-[180px]">
        <span className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-[#929394] px-0.5">
          Category
        </span>

        <div className="relative w-[180px] flex items-center">
          <span
            className="absolute left-3 w-[12px] h-[12px] rounded-full pointer-events-none z-10 shrink-0"
            style={{ backgroundColor: activeCat?.color || '#3B82F6' }}
          />
          <select
            aria-label="Category"
            value={resolvedCategoryId}
            onChange={(e) => handleSetCategory(e.target.value)}
            className="w-[180px] h-[30px] appearance-none pl-7 pr-7 rounded-[10px] bg-[#15161A] border-[2px] border-[#15161A] hover:border-[#383C48] focus:border-[#4B5563] text-white text-xs font-['Figtree'] font-semibold focus:outline-none cursor-pointer truncate transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-[#15161A] text-white font-['Figtree']">
                {cat.name}
              </option>
            ))}
          </select>
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white"
          >
            <polygon points="1,2 9,2 5,7" fill="white" />
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: MIRROR BUTTON (Specific to T-Channel) */}
      {/* ========================================================================= */}
      {isTChannel && (selectedChannel || isPlacementMode) && (
        <button
          type="button"
          onClick={() => {
            if (selectedChannel && onMirrorChannel) {
              onMirrorChannel(selectedChannel);
            } else if (onMirrorPlacement) {
              onMirrorPlacement();
            }
          }}
          className="w-[180px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#15161A] hover:border-[#383C48] text-white text-xs font-['Figtree'] font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm"
          title="Mirror T-Channel (Flip branch orientation)"
        >
          Mirror
        </button>
      )}

      {/* ========================================================================= */}
      {/* SECTION: DUPLICATE BUTTON (When channel is selected) */}
      {/* ========================================================================= */}
      {selectedChannel && onDuplicateChannel && (
        <button
          type="button"
          onClick={() => onDuplicateChannel(selectedChannel)}
          className="w-[180px] h-[30px] rounded-[10px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#15161A] hover:border-[#383C48] text-white text-xs font-['Figtree'] font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm"
          title="Duplicate selected channel"
        >
          Duplicate
        </button>
      )}

      {/* Overlap / Collision Alert */}
      {isSelectedColliding && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-red-950/60 border border-red-500/50 text-red-300 text-[11px] font-['Figtree'] font-bold">
          <AlertTriangle size={13} className="shrink-0 text-red-400" />
          <span>Overlap Detected</span>
        </div>
      )}

      {/* Out of Bounds Alert */}
      {isSelectedOutOfBounds && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-['Figtree'] font-bold">
          <AlertTriangle size={13} className="shrink-0 text-amber-400" />
          <span>Outside Board</span>
        </div>
      )}
    </aside>
  );
};
