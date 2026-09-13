import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Target, RotateCcw, Check, Ruler, X } from 'lucide-react';
import {
  BoardConfig,
  PlacedChannel,
  GridPoint,
  Rotation,
  ChannelCategory,
  ChannelKind,
  CustomCategory,
  ChannelProposal,
  CustomAccessoryDefinition,
  MountingType,
} from '../lib/types';
import {
  calculateBoardDimensions,
  generateTileMatrix,
  getChannelFootprint,
  getChannelSnapPoints,
  canPlaceChannel,
  findCollisions,
  worldToGrid,
  getMultiboardOctagonPoints,
  measurePointsAndSuggestChannel,
  getChannelSnapCount,
  getCurvedChannelGeometry,
  getYBranchChannelGeometry,
  getChannelOutlinePath,
  getDiagonalChannelGeometry,
  isChannelOutOfBounds,
  rotatePlacedChannel,
} from '../lib/geometry';
import { channelColors } from '../styles/tokens';
import { ToolType } from './ToolPalette';

interface CanvasProps {
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string | null) => void;
  onUpdateChannel: (channel: PlacedChannel) => void;
  onDeleteChannel: (id: string) => void;
  onAddChannel: (channel: PlacedChannel) => void;
  activeTool: ToolType;
  onResetTool: () => void;
  activeCategory: ChannelCategory;
  placementCategory?: ChannelCategory | null;
  placementRotation: Rotation;
  placementMirrored?: boolean;
  onRotatePlacement?: () => void;
  straightLength: number;
  categories: CustomCategory[];
  isEditingMounts?: boolean;
  onToggleMountEdit?: () => void;
  curvedRadius?: number;
  armSpanUnits?: number;
  trunkSpanUnits?: number;
  branchSpanUnits?: number;
  mitreArmA?: number;
  mitreArmB?: number;
  offsetUnits?: number;
  yTrunkUnits?: number;
  yBranchUnits?: number;
  customAccessories?: CustomAccessoryDefinition[];
  activeAccessoryId?: string | null;
  channelWidthUnits?: number;
  placementMountingType?: MountingType;
  svgRefProp?: React.RefObject<SVGSVGElement>;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  pan?: { x: number; y: number };
  onPanChange?: (p: { x: number; y: number }) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  boardConfig,
  channels,
  selectedChannelId,
  onSelectChannel,
  onUpdateChannel,
  onDeleteChannel,
  onAddChannel,
  activeTool,
  onResetTool,
  activeCategory,
  placementCategory,
  placementRotation,
  placementMirrored = false,
  onRotatePlacement: _onRotatePlacement,
  straightLength,
  categories,
  isEditingMounts = false,
  onToggleMountEdit,
  curvedRadius = 2,
  armSpanUnits = 2,
  trunkSpanUnits = 3,
  branchSpanUnits = 2,
  mitreArmA = 2,
  mitreArmB = 2,
  offsetUnits = 1,
  yTrunkUnits = 1,
  yBranchUnits = 1,
  customAccessories = [],
  activeAccessoryId,
  channelWidthUnits = 1,
  placementMountingType = 'threaded_snap',
  svgRefProp,
  zoom: controlledZoom,
  onZoomChange,
  pan: controlledPan,
  onPanChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = svgRefProp || internalSvgRef;

  const validActiveCategory = useMemo(() => {
    if (categories.some((c) => c.id === activeCategory)) return activeCategory;
    return categories[0]?.id || activeCategory;
  }, [categories, activeCategory]);

  const effectivePlacementCategory = (placementCategory && categories.some((c) => c.id === placementCategory))
    ? placementCategory
    : validActiveCategory;

  const isOpenGrid = boardConfig.platform === 'opengrid';

  const effectiveMounting: MountingType = (() => {
    if (placementMountingType === 'none') return 'none';
    if (isOpenGrid) {
      if (placementMountingType === 'threaded_snap' || placementMountingType === 'multiconnect') {
        return 'opengrid_base_snap';
      }
      return placementMountingType || 'opengrid_base_snap';
    } else {
      if (placementMountingType === 'opengrid_snap' || placementMountingType === 'opengrid_base_snap' || placementMountingType === 'opengrid_grip_snap') {
        return 'threaded_snap';
      }
      return placementMountingType || 'threaded_snap';
    }
  })();

  // Pan & Zoom state
  const [internalZoom, setInternalZoom] = useState(1.0);
  const [internalPan, setInternalPan] = useState<{ x: number; y: number }>({ x: 80, y: 70 });

  const zoom = controlledZoom !== undefined ? controlledZoom : internalZoom;
  const pan = controlledPan !== undefined ? controlledPan : internalPan;

  const setZoom = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const next = typeof updater === 'function' ? updater(zoom) : updater;
      setInternalZoom(next);
      onZoomChange?.(next);
    },
    [zoom, onZoomChange]
  );

  const setPan = useCallback(
    (updater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
      const next = typeof updater === 'function' ? updater(pan) : updater;
      setInternalPan(next);
      onPanChange?.(next);
    },
    [pan, onPanChange]
  );

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse hover coordinate tracking
  const [hoverGridPoint, setHoverGridPoint] = useState<GridPoint | null>(null);

  // Dragging existing channel state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<GridPoint | null>(null);
  const [dragOriginalPos, setDragOriginalPos] = useState<GridPoint | null>(null);
  const [dragCurrentDelta, setDragCurrentDelta] = useState<GridPoint>({ x: 0, y: 0 });

  // Measure Tool State
  const [measureStart, setMeasureStart] = useState<GridPoint | null>(null);
  const [measureProposal, setMeasureProposal] = useState<ChannelProposal | null>(null);
  const [preferredDiagonalKind, setPreferredDiagonalKind] = useState<'diagonal' | 'corner'>('diagonal');

  // Grid dimensions
  const dims = calculateBoardDimensions(boardConfig);
  const pitch = boardConfig.holePitchMm; // 25mm
  const MARGIN = 30; // Board margin in SVG mm units

  // Reset measure state when switching tools
  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null);
      setMeasureProposal(null);
    }
  }, [activeTool]);

  // Collision map
  const collisionResult = useMemo(() => findCollisions(channels), [channels]);
  const collidingChannelSet = useMemo(() => {
    const set = new Set<string>();
    for (const [id1, id2] of collisionResult.collidingChannelIds) {
      set.add(id1);
      set.add(id2);
    }
    return set;
  }, [collisionResult]);

  // Screen to SVG Coordinate converter
  const screenToSvgPoint = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svgRect = svgRef.current.getBoundingClientRect();
      const localX = (screenX - svgRect.left - pan.x) / zoom;
      const localY = (screenY - svgRect.top - pan.y) / zoom;
      return { x: localX, y: localY };
    },
    [pan, zoom]
  );

  // SVG to discrete Hole Grid Point converter
  const svgToGridPoint = useCallback(
    (svgX: number, svgY: number): GridPoint => {
      const worldX = svgX - MARGIN;
      const worldY = svgY - MARGIN;
      return worldToGrid({ x: worldX, y: worldY }, pitch);
    },
    [MARGIN, pitch]
  );

  // Hole Grid Point to SVG center coordinate
  const gridToSvgHoleCenter = useCallback(
    (gx: number, gy: number): { cx: number; cy: number } => {
      return {
        cx: MARGIN + gx * pitch,
        cy: MARGIN + gy * pitch,
      };
    },
    [MARGIN, pitch]
  );

  // Measure Tool Shortcuts: Enter to commit, Esc to cancel
  useEffect(() => {
    const handleMeasureKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'Enter' && activeTool === 'measure' && measureProposal) {
        e.preventDefault();
        handleCommitMeasuredChannel(measureProposal);
      } else if (e.key === 'Escape' && activeTool === 'measure') {
        if (measureStart || measureProposal) {
          e.preventDefault();
          setMeasureStart(null);
          setMeasureProposal(null);
        }
      }
    };

    window.addEventListener('keydown', handleMeasureKeyDown);
    return () => window.removeEventListener('keydown', handleMeasureKeyDown);
  }, [activeTool, measureProposal, measureStart]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(3.5, Math.max(0.3, prevZoom * zoomFactor));
      return Number(nextZoom.toFixed(2));
    });
  };

  // Candidate channel to place preview (ghost)
  const candidateChannel = useMemo<PlacedChannel | null>(() => {
    if (activeTool === 'select' || activeTool === 'measure' || !hoverGridPoint) return null;

    let kind: ChannelKind = 'straight';
    let length: number | undefined = straightLength;
    let radiusUnits: number | undefined = undefined;
    let mitreArmAVal: number | undefined = undefined;
    let mitreArmBVal: number | undefined = undefined;
    let offsetUnitsVal: number | undefined = undefined;
    let yTrunkUnitsVal: number | undefined = undefined;
    let yBranchUnitsVal: number | undefined = undefined;
    let armSpanUnitsVal: number | undefined = undefined;
    let trunkSpanUnitsVal: number | undefined = undefined;
    let branchSpanUnitsVal: number | undefined = undefined;
    let widthUnitsVal: number | undefined = channelWidthUnits > 1 ? channelWidthUnits : undefined;
    let labelVal: string | undefined = undefined;

    if (activeTool === 'straight') {
      kind = 'straight';
      length = straightLength;
    } else if (activeTool === 'corner') {
      kind = 'corner';
      length = undefined;
      armSpanUnitsVal = armSpanUnits;
    } else if (activeTool === 'junction') {
      kind = 'junction';
      length = undefined;
      trunkSpanUnitsVal = trunkSpanUnits;
      branchSpanUnitsVal = branchSpanUnits;
    } else if (activeTool === 'cross') {
      kind = 'cross';
      length = undefined;
    } else if (activeTool === 'curved') {
      kind = 'curved';
      length = undefined;
      radiusUnits = curvedRadius;
    } else if (activeTool === 'y_split') {
      kind = 'y_split';
      length = undefined;
      const effectiveY = yBranchUnits ?? yTrunkUnits ?? 1;
      yTrunkUnitsVal = effectiveY;
      yBranchUnitsVal = effectiveY;
    } else if (activeTool === 'diagonal') {
      kind = 'diagonal';
      length = 3;
      offsetUnitsVal = offsetUnits;
    } else if (activeTool === 'mitred') {
      kind = 'mitred';
      length = undefined;
      mitreArmAVal = mitreArmA;
      mitreArmBVal = mitreArmB;
    } else if (activeTool === 'spool') {
      kind = 'spool';
      length = 6;
    } else if (activeTool === 'socket_holder') {
      kind = 'socket_holder';
      length = 6;
    } else if (activeTool === 'accessory') {
      const selectedAcc = customAccessories?.find((a) => a.id === activeAccessoryId) || customAccessories?.[0];
      kind = 'accessory';
      widthUnitsVal = selectedAcc ? selectedAcc.widthMU : 6;
      length = selectedAcc ? selectedAcc.heightMU : 3;
      labelVal = selectedAcc ? selectedAcc.name : 'PRESA Tessan';
    }

    let placePos = hoverGridPoint;
    if (kind === 'straight') {
      const L = Math.max(1, Math.floor(length ?? 2));
      const W = Math.max(1, Math.min(2, Math.floor(widthUnitsVal || 1)));
      if (placementRotation === 90) {
        placePos = { x: hoverGridPoint.x - (W - 1), y: hoverGridPoint.y };
      } else if (placementRotation === 180) {
        placePos = { x: hoverGridPoint.x - (L - 1), y: hoverGridPoint.y - (W - 1) };
      } else if (placementRotation === 270) {
        placePos = { x: hoverGridPoint.x, y: hoverGridPoint.y - (L - 1) };
      }
    } else if (kind === 'accessory') {
      const W = Math.max(1, Math.floor(widthUnitsVal || 6));
      const H = Math.max(1, Math.floor(length || 3));
      if (placementRotation === 90) {
        placePos = { x: hoverGridPoint.x - (H - 1), y: hoverGridPoint.y };
      } else if (placementRotation === 180) {
        placePos = { x: hoverGridPoint.x - (W - 1), y: hoverGridPoint.y - (H - 1) };
      } else if (placementRotation === 270) {
        placePos = { x: hoverGridPoint.x, y: hoverGridPoint.y - (W - 1) };
      }
    }

    return {
      id: 'preview-ghost',
      kind,
      length,
      widthUnits: widthUnitsVal,
      label: labelVal,
      position: placePos,
      rotation: placementRotation,
      mirrored: placementMirrored,
      category: effectivePlacementCategory,
      mountingType: effectiveMounting,
      radiusUnits,
      armSpanUnits: armSpanUnitsVal,
      trunkSpanUnits: trunkSpanUnitsVal,
      branchSpanUnits: branchSpanUnitsVal,
      mitreArmA: mitreArmAVal,
      mitreArmB: mitreArmBVal,
      offsetUnits: offsetUnitsVal,
      yTrunkUnits: yTrunkUnitsVal,
      yBranchUnits: yBranchUnitsVal,
    };
  }, [
    activeTool,
    hoverGridPoint,
    placementRotation,
    placementMirrored,
    straightLength,
    effectivePlacementCategory,
    channelWidthUnits,
    placementMountingType,
    curvedRadius,
    armSpanUnits,
    trunkSpanUnits,
    branchSpanUnits,
    mitreArmA,
    mitreArmB,
    offsetUnits,
    yTrunkUnits,
    yBranchUnits,
    customAccessories,
    activeAccessoryId,
  ]);

  // Validity check for candidate preview
  const candidateValidity = useMemo(() => {
    if (!candidateChannel) return null;
    return canPlaceChannel(candidateChannel, channels, boardConfig);
  }, [candidateChannel, channels, boardConfig]);

  // Live dynamic proposal when measuring
  const liveMeasureProposal = useMemo<ChannelProposal | null>(() => {
    if (activeTool !== 'measure' || !measureStart || !hoverGridPoint) return null;
    if (measureStart.x === hoverGridPoint.x && measureStart.y === hoverGridPoint.y) return null;
    return measurePointsAndSuggestChannel(measureStart, hoverGridPoint, channels, boardConfig, preferredDiagonalKind);
  }, [activeTool, measureStart, hoverGridPoint, channels, boardConfig, preferredDiagonalKind]);

  // Handle Canvas Mouse Move to track cursor snap position
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning || draggingId) return;
    const svgPoint = screenToSvgPoint(e.clientX, e.clientY);
    const gridPt = svgToGridPoint(svgPoint.x, svgPoint.y);
    setHoverGridPoint(gridPt);
  };

  // Channel dragging listener (disabled during mount edit)
  useEffect(() => {
    if (!draggingId || isEditingMounts) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const svgPoint = screenToSvgPoint(e.clientX, e.clientY);
      const gridPt = svgToGridPoint(svgPoint.x, svgPoint.y);
      setHoverGridPoint(gridPt);

      if (dragStartPoint) {
        const deltaX = gridPt.x - dragStartPoint.x;
        const deltaY = gridPt.y - dragStartPoint.y;
        setDragCurrentDelta({ x: deltaX, y: deltaY });
      }
    };

    const handleWindowMouseUp = () => {
      if (draggingId && dragOriginalPos) {
        const targetChannel = channels.find((c) => c.id === draggingId);
        if (targetChannel) {
          const finalPos = {
            x: dragOriginalPos.x + dragCurrentDelta.x,
            y: dragOriginalPos.y + dragCurrentDelta.y,
          };

          if (finalPos.x !== dragOriginalPos.x || finalPos.y !== dragOriginalPos.y) {
            const moved = {
              ...targetChannel,
              position: finalPos,
            };
            if (!isChannelOutOfBounds(moved, boardConfig)) {
              onUpdateChannel(moved);
            }
          }
        }
      }
      setDraggingId(null);
      setDragStartPoint(null);
      setDragOriginalPos(null);
      setDragCurrentDelta({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingId, dragStartPoint, dragOriginalPos, dragCurrentDelta, channels, onUpdateChannel, isEditingMounts, screenToSvgPoint, svgToGridPoint]);

  // Canvas Panning listener
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowPanMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    };

    const handleWindowPanUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowPanMove);
    window.addEventListener('mouseup', handleWindowPanUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowPanMove);
      window.removeEventListener('mouseup', handleWindowPanUp);
    };
  }, [isPanning, panStart]);

  // Canvas MouseDown Dispatcher
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore clicks on HUD buttons or modal forms
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.hud-interactive')) {
      return;
    }

    // Middle click or right click starts panning
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Measure Tool click logic (Illustrator pen-like: click A -> preview -> click B freezes path and asks confirmation)
    if (activeTool === 'measure' && e.button === 0) {
      const svgPoint = screenToSvgPoint(e.clientX, e.clientY);
      const gridPt = svgToGridPoint(svgPoint.x, svgPoint.y);

      if (!measureStart) {
        setMeasureStart(gridPt);
        setMeasureProposal(null);
      } else if (!measureProposal) {
        // Point B clicked: freeze path and present confirmation dialog (does NOT create channel yet)
        const proposal = measurePointsAndSuggestChannel(measureStart, gridPt, channels, boardConfig, preferredDiagonalKind);
        setMeasureProposal(proposal);
      }
      return;
    }

    // Placement Tool click logic (straight, corner, junction, cross, curved, y_split, diagonal, mitred)
    if (activeTool !== 'select' && activeTool !== 'measure' && e.button === 0) {
      const svgPoint = screenToSvgPoint(e.clientX, e.clientY);
      const gridPt = svgToGridPoint(svgPoint.x, svgPoint.y);

      let kind: ChannelKind = 'straight';
      let length: number | undefined = straightLength;
      let radiusUnits: number | undefined = undefined;
      let mitreArmAVal: number | undefined = undefined;
      let mitreArmBVal: number | undefined = undefined;
      let offsetUnitsVal: number | undefined = undefined;
      let yTrunkUnitsVal: number | undefined = undefined;
      let yBranchUnitsVal: number | undefined = undefined;
      let armSpanUnitsVal: number | undefined = undefined;
      let trunkSpanUnitsVal: number | undefined = undefined;
      let branchSpanUnitsVal: number | undefined = undefined;
      let widthUnitsVal: number | undefined = channelWidthUnits > 1 ? channelWidthUnits : undefined;
      let labelVal: string | undefined = undefined;

      if (activeTool === 'straight') {
        kind = 'straight';
        length = straightLength;
      } else if (activeTool === 'corner') {
        kind = 'corner';
        length = undefined;
        armSpanUnitsVal = armSpanUnits;
      } else if (activeTool === 'junction') {
        kind = 'junction';
        length = undefined;
        trunkSpanUnitsVal = trunkSpanUnits;
        branchSpanUnitsVal = branchSpanUnits;
      } else if (activeTool === 'cross') {
        kind = 'cross';
        length = undefined;
      } else if (activeTool === 'curved') {
        kind = 'curved';
        length = undefined;
        radiusUnits = curvedRadius;
      } else if (activeTool === 'y_split') {
        kind = 'y_split';
        length = undefined;
        const effectiveY = yBranchUnits ?? yTrunkUnits ?? 1;
        yTrunkUnitsVal = effectiveY;
        yBranchUnitsVal = effectiveY;
      } else if (activeTool === 'diagonal') {
        kind = 'diagonal';
        length = 3;
        offsetUnitsVal = offsetUnits;
      } else if (activeTool === 'mitred') {
        kind = 'mitred';
        length = undefined;
        mitreArmAVal = mitreArmA;
        mitreArmBVal = mitreArmB;
      } else if (activeTool === 'spool') {
        kind = 'spool';
        length = 6;
      } else if (activeTool === 'socket_holder') {
        kind = 'socket_holder';
        length = 6;
      } else if (activeTool === 'accessory') {
        const selectedAcc = customAccessories?.find((a) => a.id === activeAccessoryId) || customAccessories?.[0];
        kind = 'accessory';
        widthUnitsVal = selectedAcc ? selectedAcc.widthMU : 6;
        length = selectedAcc ? selectedAcc.heightMU : 3;
        labelVal = selectedAcc ? selectedAcc.name : 'PRESA Tessan';
      }

      let placePos = gridPt;
      if (kind === 'straight') {
        const L = Math.max(1, Math.floor(length ?? 2));
        const W = Math.max(1, Math.min(2, Math.floor(widthUnitsVal || 1)));
        if (placementRotation === 90) {
          placePos = { x: gridPt.x - (W - 1), y: gridPt.y };
        } else if (placementRotation === 180) {
          placePos = { x: gridPt.x - (L - 1), y: gridPt.y - (W - 1) };
        } else if (placementRotation === 270) {
          placePos = { x: gridPt.x, y: gridPt.y - (L - 1) };
        }
      } else if (kind === 'accessory') {
        const W = Math.max(1, Math.floor(widthUnitsVal || 6));
        const H = Math.max(1, Math.floor(length || 3));
        if (placementRotation === 90) {
          placePos = { x: gridPt.x - (H - 1), y: gridPt.y };
        } else if (placementRotation === 180) {
          placePos = { x: gridPt.x - (W - 1), y: gridPt.y - (H - 1) };
        } else if (placementRotation === 270) {
          placePos = { x: gridPt.x, y: gridPt.y - (W - 1) };
        }
      }

      const newChannel: PlacedChannel = {
        id: `chan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        kind,
        length,
        widthUnits: widthUnitsVal,
        label: labelVal,
        position: placePos,
        rotation: placementRotation,
        mirrored: placementMirrored,
        category: effectivePlacementCategory,
        mountingType: effectiveMounting,
        radiusUnits,
        armSpanUnits: armSpanUnitsVal,
        trunkSpanUnits: trunkSpanUnitsVal,
        branchSpanUnits: branchSpanUnitsVal,
        mitreArmA: mitreArmAVal,
        mitreArmB: mitreArmBVal,
        offsetUnits: offsetUnitsVal,
        yTrunkUnits: yTrunkUnitsVal,
        yBranchUnits: yBranchUnitsVal,
      };

      // Block placement if outside board boundaries
      if (isChannelOutOfBounds(newChannel, boardConfig)) {
        return;
      }

      onAddChannel(newChannel);
      onSelectChannel(newChannel.id);
      return;
    }

    // Left click on empty space in select mode
    if (activeTool === 'select' && e.button === 0) {
      const closestChannel = (e.target as HTMLElement).closest('[id^="channel-group-"]');
      if (!closestChannel && !isEditingMounts) {
        onSelectChannel(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Start dragging a channel
  const handleChannelMouseDown = (e: React.MouseEvent, channel: PlacedChannel) => {
    if (activeTool !== 'select' || e.button !== 0 || isEditingMounts) return;
    e.stopPropagation();

    onSelectChannel(channel.id);
    const svgPoint = screenToSvgPoint(e.clientX, e.clientY);
    const currentGrid = svgToGridPoint(svgPoint.x, svgPoint.y);

    setDraggingId(channel.id);
    setDragStartPoint(currentGrid);
    setDragOriginalPos({ ...channel.position });
    setDragCurrentDelta({ x: 0, y: 0 });
  };

  // Create Channel from Measure Tool Proposal
  const handleCommitMeasuredChannel = (proposalToUse: ChannelProposal) => {
    const channelToPlace: PlacedChannel = proposalToUse.channel
      ? {
          ...proposalToUse.channel,
          id: `chan-meas-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          category: effectivePlacementCategory,
        }
      : {
          id: `chan-meas-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          kind: proposalToUse.suggestedKind,
          length: proposalToUse.suggestedLength,
          position: proposalToUse.suggestedPosition,
          rotation: proposalToUse.suggestedRotation,
          category: effectivePlacementCategory,
          widthUnits: proposalToUse.widthUnits ?? 1,
          heightUnits: proposalToUse.heightUnits ?? 1,
          mountingType: proposalToUse.mountingType ?? 'threaded_snap',
        };

    onAddChannel(channelToPlace);
    onSelectChannel(channelToPlace.id);
    setMeasureStart(null);
    setMeasureProposal(null);
    onResetTool();
  };

  // Render Grid Snap Holes (Multiboard Octagons or openGrid Rounded Squares)
  const renderOctagonGrid = () => {
    const holes: React.ReactNode[] = [];
    const radius = 7.5; // Outer octagon radius in SVG mm units
    const isHighContrast = activeTool === 'measure' || activeTool !== 'select' || isEditingMounts;

    for (let gy = 0; gy < dims.totalHolesY; gy++) {
      for (let gx = 0; gx < dims.totalHolesX; gx++) {
        const { cx, cy } = gridToSvgHoleCenter(gx, gy);
        const isHovered = hoverGridPoint && hoverGridPoint.x === gx && hoverGridPoint.y === gy;
        const isMeasurePointA = measureStart && measureStart.x === gx && measureStart.y === gy;
        const stroke = isMeasurePointA ? '#10B981' : isHovered ? '#38BDF8' : isHighContrast ? '#383E4C' : '#202229';
        const strokeWidth = isMeasurePointA ? 2 : isHovered ? 1.6 : isHighContrast ? 1.0 : 0.8;
        const pilotFill = isMeasurePointA ? '#10B981' : isHovered ? '#38BDF8' : isHighContrast ? '#4B5563' : '#272A32';

        holes.push(
          <g key={`hole-${gx}-${gy}`} className="pointer-events-none">
            {isOpenGrid ? (
              // openGrid square opening with rounded corners (20mm opening inside 28mm cell)
              <rect
                x={cx - 10}
                y={cy - 10}
                width={20}
                height={20}
                rx={0.8}
                fill="#0E0F12"
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="transition-colors duration-100"
              />
            ) : (
              // Multiboard octagonal snap well
              <polygon
                points={getMultiboardOctagonPoints(cx, cy, radius)}
                fill="#0E0F12"
                stroke={stroke}
                strokeWidth={strokeWidth}
                className="transition-colors duration-100"
              />
            )}
            {/* Center pilot hole */}
            <circle
              cx={cx}
              cy={cy}
              r={1.2}
              fill={pilotFill}
            />
          </g>
        );
      }
    }

    return holes;
  };

  // Render Tile Boundaries
  const renderTileBoundaries = () => {
    const borders: React.ReactNode[] = [];
    const boardTiles = generateTileMatrix(boardConfig);

    for (const t of boardTiles) {
      const x = MARGIN + t.originHoleX * pitch - pitch / 2;
      const y = MARGIN + t.originHoleY * pitch - pitch / 2;
      const tileW = t.widthHoles * pitch;
      const tileH = t.heightHoles * pitch;

      borders.push(
        <g key={`tile-border-${t.id || `${t.col}-${t.row}`}`} className="pointer-events-none">
          <rect
            x={x}
            y={y}
            width={tileW}
            height={tileH}
            fill="none"
            stroke="#1E2028"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        </g>
      );
    }

    return borders;
  };

  // Render Ghost CAD Rulers directly into SVG World Coordinates with Spotlight
  const renderGhostRulers = () => {
    const elements: React.ReactNode[] = [];
    const selectedChannel = channels.find((c) => c.id === selectedChannelId);
    const selectedFootprint = selectedChannel ? getChannelFootprint(selectedChannel) : null;

    // Determine active spotlight columns & rows from hover and selection
    const activeCols = new Set<number>();
    const activeRows = new Set<number>();

    if (hoverGridPoint && hoverGridPoint.x >= 0 && hoverGridPoint.x < dims.totalHolesX) {
      activeCols.add(hoverGridPoint.x);
    }
    if (hoverGridPoint && hoverGridPoint.y >= 0 && hoverGridPoint.y < dims.totalHolesY) {
      activeRows.add(hoverGridPoint.y);
    }

    if (selectedFootprint) {
      selectedFootprint.cells.forEach((cell) => {
        if (cell.x >= 0 && cell.x < dims.totalHolesX) activeCols.add(cell.x);
        if (cell.y >= 0 && cell.y < dims.totalHolesY) activeRows.add(cell.y);
      });
    }

    // Top Column Numbers (1 to dims.totalHolesX)
    for (let gx = 0; gx < dims.totalHolesX; gx++) {
      const { cx } = gridToSvgHoleCenter(gx, 0);
      const isActive = activeCols.has(gx);

      elements.push(
        <g key={`ghost-ruler-col-${gx}`} className="select-none pointer-events-none">
          <text
            x={cx}
            y={MARGIN - pitch / 2 - 20}
            textAnchor="middle"
            fill={isActive ? '#FFFFFF' : '#929394'}
            opacity={isActive ? 1 : 0.65}
            fontSize={isActive ? 12 : 10.5}
            fontFamily="'Figtree', sans-serif"
            fontWeight={isActive ? 800 : 500}
          >
            {gx + 1}
          </text>
        </g>
      );
    }

    // Left Row Numbers (1 to dims.totalHolesY)
    for (let gy = 0; gy < dims.totalHolesY; gy++) {
      const { cy } = gridToSvgHoleCenter(0, gy);
      const isActive = activeRows.has(gy);

      elements.push(
        <g key={`ghost-ruler-row-${gy}`} className="select-none pointer-events-none">
          <text
            x={MARGIN - pitch / 2 - 24}
            y={cy + 4}
            textAnchor="middle"
            fill={isActive ? '#FFFFFF' : '#929394'}
            opacity={isActive ? 1 : 0.65}
            fontSize={isActive ? 12 : 10.5}
            fontFamily="'Figtree', sans-serif"
            fontWeight={isActive ? 800 : 500}
          >
            {gy + 1}
          </text>
        </g>
      );
    }

    return <g id="ghost-rulers">{elements}</g>;
  };

  // Render Mount Point Editing Overlay for the selected channel
  const renderMountEditOverlay = (channel: PlacedChannel) => {
    if (!isEditingMounts || channel.id !== selectedChannelId) return null;

    const footprint = getChannelFootprint(channel);
    const activeSnaps = getChannelSnapPoints(channel);

    return (
      <g key={`mount-edit-overlay-${channel.id}`} className="mount-edit-overlay">
        {footprint.cells.map((cell, idx) => {
          const { cx, cy } = gridToSvgHoleCenter(cell.x, cell.y);
          const isActive = activeSnaps.some((s) => s.x === cell.x && s.y === cell.y);

          const handleTogglePoint = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            const posX = Math.round(channel.position.x);
            const posY = Math.round(channel.position.y);

            // Determine active indices based on footprint.cells
            let currentIndices: number[];
            if (channel.customMountIndices) {
              currentIndices = [...channel.customMountIndices];
            } else {
              // Initialize from activeSnaps matching footprint.cells
              currentIndices = footprint.cells.reduce<number[]>((acc, fc, i) => {
                if (activeSnaps.some((s) => s.x === fc.x && s.y === fc.y)) {
                  acc.push(i);
                }
                return acc;
              }, []);
            }

            let nextIndices: number[];
            if (currentIndices.includes(idx)) {
              nextIndices = currentIndices.filter((i) => i !== idx);
            } else {
              nextIndices = [...currentIndices, idx];
            }

            const nextCustomPoints: GridPoint[] = nextIndices.map((i) => ({
              x: footprint.cells[i].x - posX,
              y: footprint.cells[i].y - posY,
            }));

            onUpdateChannel({
              ...channel,
              connectorMode: 'manual',
              customMountIndices: nextIndices,
              customMountPoints: nextCustomPoints,
            });
          };

          return (
            <g
              key={`mount-target-${cell.x}-${cell.y}-${idx}`}
              className="cursor-pointer group"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={handleTogglePoint}
            >
              {/* Invisible large hit target (radius 14px) for easy clickability */}
              <circle cx={cx} cy={cy} r={14} fill="transparent" />

              {/* Interactive Target */}
              {isActive ? (
                isOpenGrid ? (
                  <>
                    <rect
                      x={cx - 7.5}
                      y={cy - 7.5}
                      width={15}
                      height={15}
                      rx={1.5}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      strokeDasharray={channel.mountingType === 'opengrid_grip_snap' ? '3 2' : undefined}
                      className="filter drop-shadow-md transition-transform group-hover:scale-110"
                    />
                    <rect x={cx - 2.5} y={cy - 2.5} width={5} height={5} rx={0.5} fill="#064E3B" />
                  </>
                ) : (
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={7.5}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      className="filter drop-shadow-md transition-transform group-hover:scale-110"
                    />
                    <circle cx={cx} cy={cy} r={2.5} fill="#064E3B" />
                  </>
                )
              ) : (
                isOpenGrid ? (
                  <rect
                    x={cx - 6.5}
                    y={cy - 6.5}
                    width={13}
                    height={13}
                    rx={1.5}
                    fill="#1E293B"
                    fillOpacity={0.8}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    className="transition-transform group-hover:scale-125 group-hover:stroke-emerald-400 group-hover:fill-emerald-950/60"
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6.5}
                    fill="#1E293B"
                    fillOpacity={0.8}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    className="transition-transform group-hover:scale-125 group-hover:stroke-emerald-400 group-hover:fill-emerald-950/60"
                  />
                )
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // Render Placed Channel
  const renderChannel = (channel: PlacedChannel, isGhost: boolean = false) => {
    const isThisDragging = draggingId === channel.id;
    const activePos = isThisDragging && dragOriginalPos
      ? {
          x: dragOriginalPos.x + dragCurrentDelta.x,
          y: dragOriginalPos.y + dragCurrentDelta.y,
        }
      : channel.position;

    const displayChannel: PlacedChannel = {
      ...channel,
      position: activePos,
    };

    const isSelected = selectedChannelId === channel.id;
    const isColliding = collidingChannelSet.has(channel.id);

    const foundCat = categories.find(
      (c) => c.id === channel.category || c.name.toLowerCase() === String(channel.category).toLowerCase()
    );
    const catColor = foundCat
      ? foundCat.color
      : (channelColors[channel.category as keyof typeof channelColors]?.hex ||
         categories.find((c) => c.id === activeCategory)?.color ||
         categories[0]?.color ||
         '#38BDF8');

    const footprint = getChannelFootprint(displayChannel);
    const snaps = getChannelSnapPoints(displayChannel);

    let borderColor = catColor;
    let glowFilter = '';

    if (isGhost) {
      borderColor = candidateValidity && !candidateValidity.isValid ? '#EF4444' : catColor;
    } else if (isColliding) {
      borderColor = '#EF4444';
      glowFilter = 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))';
    }

    const CHANNEL_WIDTH = (channel.widthUnits && channel.widthUnits > 1 ? 40 : 20);

    const minPt = gridToSvgHoleCenter(footprint.bounds.minX, footprint.bounds.minY);
    const maxPt = gridToSvgHoleCenter(footprint.bounds.maxX, footprint.bounds.maxY);

    return (
      <g
        key={channel.id}
        id={`channel-group-${channel.id}`}
        style={{ filter: glowFilter }}
        className={`transition-opacity ${
          isGhost
            ? 'opacity-75 pointer-events-none'
            : isEditingMounts && isSelected
              ? 'pointer-events-auto'
              : activeTool !== 'select'
                ? 'pointer-events-none'
                : 'cursor-move'
        }`}
        onMouseDown={(e) => !isGhost && activeTool === 'select' && handleChannelMouseDown(e, channel)}
      >
        <g>
        {/* Render Smooth Curved Conduit for Curved Channels */}
        {channel.kind === 'curved' && (() => {
          const curvedGeom = getCurvedChannelGeometry(displayChannel, pitch, MARGIN);
          return (
            <g key={`curved-smooth-duct-${channel.id}`}>
              {/* Concentric smooth annular channel trough fill and walls */}
              <path
                d={curvedGeom.ductPath}
                fill={catColor}
                fillOpacity={isGhost ? 0.12 : 0.22}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
              />
            </g>
          );
        })()}

        {/* Render Smooth Radial Fork Duct for Y-Split Channels */}
        {channel.kind === 'y_split' && (() => {
          const yGeom = getYBranchChannelGeometry(displayChannel, pitch, MARGIN);
          return (
            <g key={`y-split-smooth-duct-${channel.id}`}>
              {/* Smooth radial branching channel trough fill and walls */}
              <path
                d={yGeom.ductPath}
                fill={catColor}
                fillOpacity={isGhost ? 0.12 : 0.22}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
                strokeLinejoin="round"
              />
            </g>
          );
        })()}

        {/* Render Underware Cable Spool 3x6 MU */}
        {channel.kind === 'spool' && (() => {
          const bx = minPt.cx - CHANNEL_WIDTH / 2;
          const by = minPt.cy - CHANNEL_WIDTH / 2;
          const bw = maxPt.cx - minPt.cx + CHANNEL_WIDTH;
          const bh = maxPt.cy - minPt.cy + CHANNEL_WIDTH;
          const cx = bx + bw / 2;
          const cy = by + bh / 2;
          const isVertical = bh >= bw;
          const drumW = isVertical ? bw * 0.56 : bw * 0.70;
          const drumH = isVertical ? bh * 0.70 : bh * 0.56;

          return (
            <g key={`spool-body-${channel.id}`}>
              {/* Base Mounting Plate 3x6 MU */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                rx={10}
                fill="#14161C"
                fillOpacity={isGhost ? 0.65 : 0.9}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
              />
              {/* Spool Winding Outer Flange */}
              <rect
                x={cx - drumW / 2}
                y={cy - drumH / 2}
                width={drumW}
                height={drumH}
                rx={14}
                fill="#1D2028"
                stroke={borderColor}
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              {/* Spool Winding Inner Core Drum */}
              <rect
                x={cx - drumW * 0.35}
                y={cy - drumH * 0.35}
                width={drumW * 0.7}
                height={drumH * 0.7}
                rx={8}
                fill="#272A35"
                stroke={borderColor}
                strokeWidth={1}
              />
              {/* Winding Emblem / Spool Icon */}
              <circle cx={cx} cy={cy - 5} r={6} fill="none" stroke={borderColor} strokeWidth={1.2} />
              <circle cx={cx} cy={cy - 5} r={2} fill={borderColor} />
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize={8}
                fontFamily="'Figtree', sans-serif"
                fontWeight={700}
                letterSpacing={0.5}
              >
                SPOOL 3×6
              </text>
            </g>
          );
        })()}

        {/* Render Tessan USB Multi-Socket Holder 6x6 MU */}
        {channel.kind === 'socket_holder' && (() => {
          const bx = minPt.cx - CHANNEL_WIDTH / 2;
          const by = minPt.cy - CHANNEL_WIDTH / 2;
          const bw = maxPt.cx - minPt.cx + CHANNEL_WIDTH;
          const bh = maxPt.cy - minPt.cy + CHANNEL_WIDTH;
          const cx = bx + bw / 2;
          const cy = by + bh / 2;

          return (
            <g key={`tessan-holder-body-${channel.id}`}>
              {/* Base Mounting Frame 6x6 MU (150x150 mm) */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                rx={12}
                fill="#14161C"
                fillOpacity={isGhost ? 0.65 : 0.9}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
              />
              {/* Central Socket Cradle Square */}
              <rect
                x={cx - 36}
                y={cy - 36}
                width={72}
                height={72}
                rx={8}
                fill="#1C1E26"
                stroke={borderColor}
                strokeWidth={1.4}
              />
              {/* Electrical AC Plug Outlet Representation */}
              <circle cx={cx - 14} cy={cy - 12} r={5.5} fill="#0E0F13" stroke="#4B5563" strokeWidth={1} />
              <circle cx={cx + 14} cy={cy - 12} r={5.5} fill="#0E0F13" stroke="#4B5563" strokeWidth={1} />
              <circle cx={cx - 14} cy={cy - 12} r={1.5} fill="#38BDF8" />
              <circle cx={cx + 14} cy={cy - 12} r={1.5} fill="#38BDF8" />
              {/* USB Port Slots */}
              <rect x={cx - 16} y={cy + 6} width={8} height={4} rx={1} fill="#0E0F13" stroke="#38BDF8" strokeWidth={0.8} />
              <rect x={cx - 4} y={cy + 6} width={8} height={4} rx={1} fill="#0E0F13" stroke="#38BDF8" strokeWidth={0.8} />
              <rect x={cx + 8} y={cy + 6} width={8} height={4} rx={1.5} fill="#0E0F13" stroke="#A855F7" strokeWidth={0.8} />
              {/* Label Text */}
              <text
                x={cx}
                y={cy + 22}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize={7.5}
                fontFamily="'Figtree', sans-serif"
                fontWeight={700}
                letterSpacing={0.5}
              >
                TESSAN USB 6×6
              </text>
            </g>
          );
        })()}

        {/* Render Modular Custom Accessory Plate (e.g. 6x3 PRESA Tessan) */}
        {channel.kind === 'accessory' && (() => {
          const bx = minPt.cx - pitch / 2;
          const by = minPt.cy - pitch / 2;
          const bw = maxPt.cx - minPt.cx + pitch;
          const bh = maxPt.cy - minPt.cy + pitch;

          return (
            <g key={`accessory-plate-${channel.id}`}>
              {/* Base Mounting Plate */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                rx={8}
                fill="#14161C"
                fillOpacity={isGhost ? 0.65 : 0.9}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
              />
              {/* Inner Decorative Inset */}
              <rect
                x={bx + 3}
                y={by + 3}
                width={Math.max(0, bw - 6)}
                height={Math.max(0, bh - 6)}
                rx={5}
                fill="none"
                stroke={borderColor}
                strokeWidth={0.8}
                strokeDasharray="4 3"
                strokeOpacity={0.4}
              />
            </g>
          );
        })()}

        {/* Render Smooth Direct Conduit for Point-to-Point Diagonal Channels */}
        {channel.kind === 'diagonal' && channel.diagonalVector && (() => {
          const diagGeom = getDiagonalChannelGeometry(displayChannel, pitch, MARGIN);
          return (
            <g key={`diagonal-conduit-${channel.id}`}>
              <path
                d={diagGeom.ductPath}
                fill={catColor}
                fillOpacity={isGhost ? 0.12 : 0.22}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
                strokeLinejoin="round"
              />
            </g>
          );
        })()}

        {/* Unified Channel Perimeter Outline (No internal cell overlapping lines) */}
        {channel.kind !== 'curved' && channel.kind !== 'y_split' && channel.kind !== 'spool' && channel.kind !== 'socket_holder' && channel.kind !== 'accessory' && !(channel.kind === 'diagonal' && channel.diagonalVector) && (() => {
          const outlinePath = getChannelOutlinePath(displayChannel, pitch, MARGIN);
          return (
            <g key={`channel-outline-${channel.id}`}>
              <path
                d={outlinePath}
                fill={catColor}
                fillOpacity={isGhost ? 0.12 : 0.22}
                stroke={borderColor}
                strokeWidth={1.5}
                strokeOpacity={isGhost ? 0.85 : 1}
                strokeLinejoin="round"
              />
            </g>
          );
        })()}
        {channel.kind === 'diagonal' && !channel.diagonalVector && footprint.cells.length > 1 && (
          <path
            d={`M ${footprint.cells.map((c) => {
              const { cx, cy } = gridToSvgHoleCenter(c.x, c.y);
              return `${cx} ${cy}`;
            }).join(' L ')}`}
            fill="none"
            stroke={borderColor}
            strokeWidth={1.8}
            strokeOpacity={0.6}
          />
        )}
        {channel.kind === 'mitred' && footprint.cells.length > 1 && (() => {
          const cornerCell = footprint.cells[channel.mitreArmB ? Math.min(footprint.cells.length - 1, channel.mitreArmB - 1) : 1];
          if (!cornerCell) return null;
          const { cx, cy } = gridToSvgHoleCenter(cornerCell.x, cornerCell.y);
          const hw = CHANNEL_WIDTH / 2;
          return (
            <line
              x1={cx - hw}
              y1={cy - hw}
              x2={cx + hw}
              y2={cy + hw}
              stroke={borderColor}
              strokeWidth={1.5}
              strokeDasharray="2 2"
              strokeOpacity={0.7}
            />
          );
        })()}

        {/* Snap Connector Attachment Rings (if not in mount edit mode for this channel) */}
        {(!isEditingMounts || !isSelected) &&
          snaps.map((snap, sIdx) => {
            const { cx, cy } = gridToSvgHoleCenter(snap.x, snap.y);
            const mType = snap.mountingType ?? channel.mountingType ?? (isOpenGrid ? 'opengrid_base_snap' : 'threaded_snap');
            if (mType === 'none') return null;

            const snapColor =
              mType === 'direct_snap'
                ? '#10B981'
                : mType === 'direct_screw'
                ? '#38BDF8'
                : mType === 'multiconnect'
                ? '#A855F7'
                : borderColor;

            const effectiveColor = isColliding ? '#EF4444' : snapColor;

            // openGrid Grip Channel Snap: exact same square shape as base snap, but dashed
            if (mType === 'opengrid_grip_snap') {
              return (
                <g key={`snap-${sIdx}`}>
                  {/* Outer rounded square with dashed stroke */}
                  <rect
                    x={cx - 4}
                    y={cy - 4}
                    width={8}
                    height={8}
                    rx={1}
                    fill="none"
                    stroke={effectiveColor}
                    strokeWidth={1.3}
                    strokeDasharray="2.5 1.5"
                  />
                  {/* Inner square pin */}
                  <rect
                    x={cx - 1.4}
                    y={cy - 1.4}
                    width={2.8}
                    height={2.8}
                    rx={0.5}
                    fill={effectiveColor}
                  />
                </g>
              );
            }

            // openGrid Base Snap (or generic openGrid snap): clean square snap
            if (isOpenGrid || mType === 'opengrid_base_snap' || mType === 'opengrid_snap') {
              return (
                <g key={`snap-${sIdx}`}>
                  {/* Outer rounded square */}
                  <rect
                    x={cx - 4}
                    y={cy - 4}
                    width={8}
                    height={8}
                    rx={1}
                    fill="none"
                    stroke={effectiveColor}
                    strokeWidth={1.3}
                    strokeDasharray={mType === 'direct_snap' ? '2.5 1.5' : undefined}
                  />
                  {/* Inner square pin */}
                  <rect
                    x={cx - 1.4}
                    y={cy - 1.4}
                    width={2.8}
                    height={2.8}
                    rx={0.5}
                    fill={effectiveColor}
                  />
                </g>
              );
            }

            // Multiboard: circular snap ring with central dot
            return (
              <g key={`snap-${sIdx}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={3.8}
                  fill="none"
                  stroke={effectiveColor}
                  strokeWidth={1.2}
                  strokeDasharray={mType === 'direct_snap' ? '2.5 1.5' : undefined}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={1.2}
                  fill={effectiveColor}
                />
              </g>
            );
          })}

        {/* Modular Custom Accessory Label Badge */}
        {channel.kind === 'accessory' && (() => {
          const isRotated = channel.rotation === 90 || channel.rotation === 270;
          const wMU = isRotated ? (channel.length ?? 3) : (channel.widthUnits ?? 6);
          const hMU = isRotated ? (channel.widthUnits ?? 6) : (channel.length ?? 3);
          const bx = minPt.cx - pitch / 2;
          const by = minPt.cy - pitch / 2;
          const bw = maxPt.cx - minPt.cx + pitch;
          const bh = maxPt.cy - minPt.cy + pitch;
          const cx = bx + bw / 2;
          const cy = by + bh / 2;
          const midRow = Math.max(1, Math.floor(hMU / 2));
          const badgeY = hMU >= 2 ? by + midRow * pitch : cy;
          const badgeW = Math.min(bw - 12, Math.max(70, (channel.label?.length || 10) * 7.5 + 24));
          const badgeH = 26;

          return (
            <g key={`accessory-label-badge-${channel.id}`} className="pointer-events-none">
              <rect
                x={cx - badgeW / 2}
                y={badgeY - badgeH / 2}
                width={badgeW}
                height={badgeH}
                rx={6}
                fill="#14161C"
                stroke="#2E3342"
                strokeWidth={1.2}
              />
              <text
                x={cx}
                y={badgeY - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#F8FAFC"
                fontSize={Math.min(10.5, Math.max(7.5, (badgeW - 12) / ((channel.label?.length || 10) * 0.85)))}
                fontFamily="'Figtree', sans-serif"
                fontWeight={700}
                letterSpacing={0.5}
              >
                {channel.label || 'ACCESSORIO'}
              </text>
              <text
                x={cx}
                y={badgeY + 7.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94A3B8"
                fontSize={7.2}
                fontFamily="'Figtree', sans-serif"
                fontWeight={600}
              >
                {wMU}×{hMU} MU
              </text>
            </g>
          );
        })()}
        </g>

        {/* Selection Halo & Floating Quick Action Buttons */}
        {isSelected && !isGhost && !isEditingMounts && (
          <g>
            {(() => {
              const bx = minPt.cx - CHANNEL_WIDTH / 2 - 4;
              const by = minPt.cy - CHANNEL_WIDTH / 2 - 4;
              const bw = maxPt.cx - minPt.cx + CHANNEL_WIDTH + 8;
              const bh = maxPt.cy - minPt.cy + CHANNEL_WIDTH + 8;

              // Quick action buttons beside the dashed bounding box
              const btnSize = 20;
              const btnGap = 4;
              const isNearRightEdge = bx + bw + btnSize + 12 > dims.totalHolesX * pitch + MARGIN;
              const actionX = isNearRightEdge ? bx - btnSize - 6 : bx + bw + 6;
              const rotateY = by;
              const deleteY = by + btnSize + btnGap;

              return (
                <>
                  <rect
                    x={bx}
                    y={by}
                    width={bw}
                    height={bh}
                    rx={6}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                  />

                  {/* Quick Action Button: Rotate 90° */}
                  <g
                    className="cursor-pointer select-none pointer-events-auto group"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rotated = rotatePlacedChannel(channel, 90, boardConfig);
                      onUpdateChannel(rotated);
                    }}
                  >
                    <rect
                      x={actionX}
                      y={rotateY}
                      width={btnSize}
                      height={btnSize}
                      rx={5}
                      fill="#15161A"
                      stroke="#2A2D36"
                      strokeWidth={1}
                      className="group-hover:fill-[#1E2028] group-hover:stroke-[#383C48] transition-colors"
                    />
                    <title>Rotate 90° (R)</title>
                    {/* Rotate Icon (clean CW circular arrow) */}
                    <g transform={`translate(${actionX + 4}, ${rotateY + 4}) scale(0.5)`}>
                      <path
                        d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                        fill="#FFFFFF"
                      />
                    </g>
                  </g>

                  {/* Quick Action Button: Delete (Red button with white Clear Canvas trash icon) */}
                  <g
                    className="cursor-pointer select-none pointer-events-auto group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(channel.id);
                    }}
                  >
                    <rect
                      x={actionX}
                      y={deleteY}
                      width={btnSize}
                      height={btnSize}
                      rx={5}
                      fill="#C80E11"
                      stroke="#B50C0F"
                      strokeWidth={1}
                      className="group-hover:fill-[#A50B0E] transition-colors"
                    />
                    <title>Delete Channel</title>
                    {/* White Trash Icon from Clear Canvas */}
                    <g transform={`translate(${actionX + 4.5}, ${deleteY + 4.5}) scale(0.7857) translate(-1387, -47)`}>
                      <path
                        d="M1391.5 49V47.5C1391.5 47.3674 1391.55 47.2402 1391.65 47.1464C1391.74 47.0527 1391.87 47 1392 47H1396C1396.13 47 1396.26 47.0527 1396.35 47.1464C1396.45 47.2402 1396.5 47.3674 1396.5 47.5V49H1400.5C1400.63 49 1400.76 49.0527 1400.85 49.1464C1400.95 49.2402 1401 49.3674 1401 49.5C1401 49.6326 1400.95 49.7598 1400.85 49.8536C1400.76 49.9473 1400.63 50 1400.5 50H1387.5C1387.37 50 1387.24 49.9473 1387.15 49.8536C1387.05 49.7598 1387 49.6326 1387 49.5C1387 49.3674 1387.05 49.2402 1387.15 49.1464C1387.24 49.0527 1387.37 49 1387.5 49H1391.5ZM1392.5 49H1395.5V48H1392.5V49ZM1389 61C1388.87 61 1388.74 60.9473 1388.65 60.8536C1388.55 60.7598 1388.5 60.6326 1388.5 60.5V50H1399.5V60.5C1399.5 60.6326 1399.45 60.7598 1399.35 60.8536C1399.26 60.9473 1399.13 61 1399 61H1389ZM1392.5 58C1392.63 58 1392.76 57.9473 1392.85 57.8536C1392.95 57.7598 1393 57.6326 1393 57.5V52.5C1393 52.3674 1392.95 52.2402 1392.85 52.1464C1392.76 52.0527 1392.63 52 1392.5 52C1392.37 52 1392.24 52.0527 1392.15 52.1464C1392.05 52.2402 1392 52.3674 1392 52.5V57.5C1392 57.6326 1392.05 57.7598 1392.15 57.8536C1392.24 57.9473 1392.37 58 1392.5 58ZM1395.5 58C1395.63 58 1395.76 57.9473 1395.85 57.8536C1395.95 57.7598 1396 57.6326 1396 57.5V52.5C1396 52.3674 1395.95 52.2402 1395.85 52.1464C1395.76 52.0527 1395.63 52 1395.5 52C1395.37 52 1395.24 52.0527 1395.15 52.1464C1395.05 52.2402 1395 52.3674 1395 52.5V57.5C1395 57.6326 1395.05 57.7598 1395.15 57.8536C1395.24 57.9473 1395.37 58 1395.5 58Z"
                        fill="#FFFFFF"
                      />
                    </g>
                  </g>
                </>
              );
            })()}
          </g>
        )}
      </g>
    );
  };

  // Render Measure Tool Ray in SVG (Illustrator-like pen preview with nominal 25mm duct)
  const renderMeasureRay = () => {
    if (activeTool !== 'measure' || !measureStart) return null;
    const targetPt = measureProposal ? measureProposal.pointB : hoverGridPoint;
    if (!targetPt) return null;

    const startCenter = gridToSvgHoleCenter(measureStart.x, measureStart.y);
    const endCenter = gridToSvgHoleCenter(targetPt.x, targetPt.y);

    const dx = Math.abs(targetPt.x - measureStart.x);
    const dy = Math.abs(targetPt.y - measureStart.y);
    const isDiagonal = dx > 0 && dy > 0;

    // Build dynamic rubber-band conduit preview polygon with nominal 25mm width
    let previewDuctPath: string | null = null;
    if (dx > 0 || dy > 0) {
      if (isDiagonal && preferredDiagonalKind === 'diagonal') {
        const dummyChannel: PlacedChannel = {
          id: 'measure-preview-diag',
          kind: 'diagonal',
          position: { ...measureStart },
          rotation: 0,
          category: activeCategory,
          diagonalVector: { dx: targetPt.x - measureStart.x, dy: targetPt.y - measureStart.y },
          widthUnits: 1,
        };
        const geom = getDiagonalChannelGeometry(dummyChannel, pitch, MARGIN);
        previewDuctPath = geom.ductPath;
      } else {
        const vx = endCenter.cx - startCenter.cx;
        const vy = endCenter.cy - startCenter.cy;
        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        const ux = vx / len;
        const uy = vy / len;
        const nx = -uy;
        const ny = ux;
        const halfW = pitch / 2; // 12.5mm
        const c1 = { x: startCenter.cx - halfW * ux + halfW * nx, y: startCenter.cy - halfW * uy + halfW * ny };
        const c2 = { x: endCenter.cx + halfW * ux + halfW * nx, y: endCenter.cy + halfW * uy + halfW * ny };
        const c3 = { x: endCenter.cx + halfW * ux - halfW * nx, y: endCenter.cy + halfW * uy - halfW * ny };
        const c4 = { x: startCenter.cx - halfW * ux - halfW * nx, y: startCenter.cy - halfW * uy - halfW * ny };
        previewDuctPath = `M ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} L ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} L ${c3.x.toFixed(1)} ${c3.y.toFixed(1)} L ${c4.x.toFixed(1)} ${c4.y.toFixed(1)} Z`;
      }
    }

    const midX = (startCenter.cx + endCenter.cx) / 2;
    const midY = (startCenter.cy + endCenter.cy) / 2;
    const catColor =
      categories.find((c) => c.id === activeCategory)?.color ||
      channelColors[activeCategory as keyof typeof channelColors]?.hex ||
      categories[0]?.color ||
      '#38BDF8';

    const distMU = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));
    const distMm = distMU * pitch;

    return (
      <g className="pointer-events-none">
        {/* Rubber-band dynamic conduit body preview */}
        {previewDuctPath && (
          <path
            d={previewDuctPath}
            fill={catColor}
            fillOpacity={0.22}
            stroke={catColor}
            strokeWidth={1.8}
            strokeDasharray={measureProposal ? undefined : '4 3'}
            strokeLinejoin="round"
          />
        )}

        {/* Central ray / cable guide */}
        <line
          x1={startCenter.cx}
          y1={startCenter.cy}
          x2={endCenter.cx}
          y2={endCenter.cy}
          stroke="#38BDF8"
          strokeWidth={1.6}
          strokeDasharray="4 3"
        />

        {/* Dimension badge at midpoint */}
        {(dx > 0 || dy > 0) && (
          <g transform={`translate(${midX}, ${midY - 14})`}>
            <rect
              x={-58}
              y={-10}
              width={116}
              height={20}
              rx={5}
              fill="#181A20"
              fillOpacity={0.92}
              stroke="#38BDF8"
              strokeWidth={1}
            />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {distMU} MU ({distMm}mm) · 25mm
            </text>
          </g>
        )}

        {/* Start Point A Badge */}
        <circle cx={startCenter.cx} cy={startCenter.cy} r={8} fill="#10B981" stroke="#FFFFFF" strokeWidth={1.5} />
        <text
          x={startCenter.cx}
          y={startCenter.cy + 3}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={8}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          A
        </text>

        {/* End Point B Badge */}
        <circle cx={endCenter.cx} cy={endCenter.cy} r={8} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={1.5} />
        <text
          x={endCenter.cx}
          y={endCenter.cy + 3}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={8}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          B
        </text>
      </g>
    );
  };

  const activeProposalToDisplay = measureProposal || liveMeasureProposal;
  const selectedChannelForEdit = channels.find((c) => c.id === selectedChannelId);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#0E0F12] overflow-hidden select-none flex flex-col"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
    >


      {/* Mount Edit Mode Floating Top HUD */}
      {isEditingMounts && selectedChannelForEdit && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-graphite-850/95 border border-brand-primary/60 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white">
              Edit Mounting Points: <strong className="text-emerald-400 font-mono">{getChannelSnapCount(selectedChannelForEdit)} connectors</strong>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-graphite-700" />

          <button
            onClick={() =>
              onUpdateChannel({
                ...selectedChannelForEdit,
                connectorMode: 'auto',
                customMountPoints: undefined,
              })
            }
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-graphite-800 text-slate-300 hover:text-white border border-graphite-700 hover:bg-graphite-700"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Auto</span>
          </button>

          <button
            onClick={onToggleMountEdit}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-brand-primary text-white font-semibold hover:bg-brand-hover shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        </div>
      )}

      {/* Measure Tool Floating Banner / Proposal Confirmation Card */}
      {activeTool === 'measure' && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-sm">
          {/* Instructions Pill */}
          <div className="flex items-center gap-2 rounded-lg border border-brand-primary/50 bg-graphite-850/95 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <Ruler className="h-4 w-4 text-brand-accent animate-pulse" />
            <span className="text-xs font-medium text-slate-200">
              {!measureStart
                ? 'Click Point A anchor'
                : !measureProposal
                ? 'Move cursor and click Point B'
                : 'Route locked: inspect and confirm channel creation'}
            </span>
            <button
              onClick={() => {
                setMeasureStart(null);
                setMeasureProposal(null);
                onResetTool();
              }}
              className="text-slate-400 hover:text-white ml-1 p-0.5"
              title="Exit Measure"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dynamic Suggestion / Confirmation Card */}
          {activeProposalToDisplay && (
            <div className="hud-interactive rounded-xl border border-brand-primary/50 bg-graphite-850/95 p-3.5 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-graphite-700 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {activeProposalToDisplay.recommendedKind === 'straight'
                      ? `Straight Channel ${activeProposalToDisplay.recommendedLength} MU`
                      : activeProposalToDisplay.recommendedKind === 'diagonal'
                      ? `Diagonal Channel ${activeProposalToDisplay.distanceUnits} MU`
                      : activeProposalToDisplay.recommendedKind === 'corner'
                      ? '90° Corner / Elbow'
                      : 'Fitting'}
                  </span>
                  <span className="text-[10px] font-mono text-brand-accent bg-brand-primary/15 px-1.5 py-0.5 rounded border border-brand-primary/30">
                    {activeProposalToDisplay.alignment}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {activeProposalToDisplay.distanceUnits} MU ({activeProposalToDisplay.distanceMm} mm)
                </span>
              </div>

              {/* Diagonal Choice Selector if trajectory is diagonal */}
              {activeProposalToDisplay.alignment === 'diagonal' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Routing Style
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-graphite-900 p-1 rounded-lg border border-graphite-700">
                    <button
                      onClick={() => {
                        setPreferredDiagonalKind('diagonal');
                        if (measureStart && activeProposalToDisplay.pointB) {
                          setMeasureProposal(
                            measurePointsAndSuggestChannel(
                              measureStart,
                              activeProposalToDisplay.pointB,
                              channels,
                              boardConfig,
                              'diagonal'
                            )
                          );
                        }
                      }}
                      className={`py-1 px-2 rounded text-[11px] font-medium transition-all ${
                        preferredDiagonalKind === 'diagonal'
                          ? 'bg-brand-primary text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Diagonal (25mm)
                    </button>
                    <button
                      onClick={() => {
                        setPreferredDiagonalKind('corner');
                        if (measureStart && activeProposalToDisplay.pointB) {
                          setMeasureProposal(
                            measurePointsAndSuggestChannel(
                              measureStart,
                              activeProposalToDisplay.pointB,
                              channels,
                              boardConfig,
                              'corner'
                            )
                          );
                        }
                      }}
                      className={`py-1 px-2 rounded text-[11px] font-medium transition-all ${
                        preferredDiagonalKind === 'corner'
                          ? 'bg-brand-primary text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      90° L-Shaped
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Nominal section:</span>
                  <span className="font-mono text-emerald-400 font-semibold">25 mm (1 MU) standard</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Mounting Points:</span>
                  <span className="font-mono text-white">
                    Min {activeProposalToDisplay.minMounts} · Recommended {activeProposalToDisplay.recommendedMounts}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Collisions / Obstacles:</span>
                  <span
                    className={
                      activeProposalToDisplay.hasObstacles
                        ? 'text-rose-400 font-semibold'
                        : 'text-emerald-400 font-semibold'
                    }
                  >
                    {activeProposalToDisplay.hasObstacles ? 'Overlap detected' : 'Clear path'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Confirm vs Cancel */}
              <div className="flex items-center gap-2 pt-1 border-t border-graphite-700">
                <button
                  onClick={() => handleCommitMeasuredChannel(activeProposalToDisplay)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm transition-colors"
                  title="Confirm and create channel (Enter key)"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirm & Create</span>
                  <kbd className="ml-1 px-1 py-0.5 bg-emerald-800/80 rounded text-[9px] font-mono">↵ Enter</kbd>
                </button>

                <button
                  onClick={() => {
                    setMeasureStart(null);
                    setMeasureProposal(null);
                  }}
                  className="px-2.5 py-1.5 rounded bg-graphite-800 text-xs font-medium text-slate-300 hover:text-white border border-graphite-700 transition-colors"
                  title="Cancel route (Esc key)"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Mode HUD: Active Placement Tool Indicator */}
      {activeTool !== 'select' && activeTool !== 'measure' && (
        <div className="absolute bottom-36 min-[1360px]:bottom-8 left-6 md:left-8 z-30 flex items-center gap-2 rounded-xl border border-[#2A2D36] bg-[#15161A]/95 px-3.5 py-2 shadow-2xl backdrop-blur-md animate-in fade-in select-none pointer-events-none transition-all duration-200">
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-[#2A2D36] animate-pulse"
            style={{ backgroundColor: categories.find((c) => c.id === effectivePlacementCategory)?.color || '#3B82F6' }}
          />
          <span className="text-xs font-['Figtree'] font-medium text-slate-200">
            Placing{' '}
            <strong className="text-white capitalize font-bold">
              {activeTool === 'straight'
                ? `Straight (${straightLength} MU)`
                : activeTool === 'spool'
                ? 'Cable Spool (3×6 MU)'
                : activeTool === 'socket_holder'
                ? 'Tessan Socket Holder (6×6 MU)'
                : activeTool}
            </strong>{' '}
            ({placementRotation}°)
          </span>
          <span className="text-[10px] font-['Figtree'] font-bold text-slate-400 bg-[#0E0F12] px-2 py-0.5 rounded-[6px] border border-[#2A2D36]">
            [R] Rotate | [Esc] Cancel
          </span>
        </div>
      )}

      {/* SVG Top-View Planner Canvas */}
      <div className="flex-1 w-full h-full cursor-crosshair">
        <svg
          ref={svgRef}
          className="w-full h-full block"
        >
          {/* Root Pan & Zoom Transformed Container */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Outer Board Boundary Shadow & Plate */}
            <rect
              x={MARGIN - pitch / 2 - 4}
              y={MARGIN - pitch / 2 - 4}
              width={dims.totalHolesX * pitch + 8}
              height={dims.totalHolesY * pitch + 8}
              rx={isOpenGrid ? 4 : 16}
              fill="#15161A"
              stroke="#2A2D36"
              strokeWidth={1.5}
            />

            {/* Ghost CAD Rulers with active coordinate spotlight */}
            {renderGhostRulers()}

            {/* Multiboard Tile Boundaries */}
            {renderTileBoundaries()}

            {/* Multiboard Octagonal Snap Hole Grid with High-Contrast tuning */}
            {renderOctagonGrid()}

            {/* Placed Channels */}
            {channels.map((ch) => renderChannel(ch, false))}

            {/* Active Tool Placement Preview Ghost */}
            {candidateChannel && renderChannel(candidateChannel, true)}

            {/* Top-Level Mount Point Editing Overlay (Guaranteed above all channels) */}
            {selectedChannelForEdit && isEditingMounts && renderMountEditOverlay(selectedChannelForEdit)}

            {/* Measure Tool Ray & Points */}
            {renderMeasureRay()}
          </g>
        </svg>
      </div>
    </div>
  );
};
