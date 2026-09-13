import type {
  BillOfMaterials,
  BoardConfig,
  BoardState,
  BOMItem,
  BOMSummary,
  ChannelCategory,
  ChannelKind,
  GridPlatform,
  MountDetail,
  MountingType,
  PlacedChannel,
  TileDefinition,
} from './types.ts';
import {
  calculateBoardDimensions,
  DEFAULT_BOARD_CONFIG,
  generateTileMatrix,
  getChannelSnapCount,
  getChannelUnitLength,
} from './geometry.ts';

// ============================================================================
// 1. Part Number & Catalog Helpers
// ============================================================================

/**
 * Generates a standardized part number for a channel specification.
 */
export function getChannelPartNumber(
  kind: ChannelKind,
  length?: number,
  widthUnits?: number,
  heightUnits?: number,
  armSpanUnits?: number,
  trunkSpanUnits?: number,
  branchSpanUnits?: number,
  radiusUnits?: number,
  mitreArmA?: number,
  mitreArmB?: number,
  offsetUnits?: number,
  yTrunkUnits?: number,
  yBranchUnits?: number,
  label?: string
): string {
  const w = widthUnits && widthUnits > 1 ? `W${widthUnits}` : '';
  const h = heightUnits && heightUnits > 1 ? `H${heightUnits}` : '';
  const modifier = [w, h].filter(Boolean).join('-');
  const modSuffix = modifier ? `-${modifier}` : '';

  switch (kind) {
    case 'straight': {
      const len = Math.max(1, Math.floor(length ?? 2));
      return `MB-CHAN-STR-${len}U${modSuffix}`;
    }
    case 'corner': {
      const span = armSpanUnits ?? 2;
      return `MB-CHAN-CNR-${span}X${span}${modSuffix}`;
    }
    case 'junction': {
      const trunk = trunkSpanUnits ?? 3;
      const branch = branchSpanUnits ?? 2;
      return `MB-CHAN-JNC-${trunk}X${branch}${modSuffix}`;
    }
    case 'cross':
      return `MB-CHAN-CRS-3X3${modSuffix}`;
    case 'curved': {
      const rad = radiusUnits ?? 2;
      return `MB-CHAN-CRV-R${rad}U${modSuffix}`;
    }
    case 'y_split': {
      const trunk = yTrunkUnits ?? yBranchUnits ?? 3;
      const branch = yBranchUnits ?? yTrunkUnits ?? 3;
      return `MB-CHAN-YSPL-${trunk}X${branch}U${modSuffix}`;
    }
    case 'diagonal': {
      const len = Math.max(2, Math.floor(length ?? 3));
      const off = offsetUnits ?? 1;
      return `MB-CHAN-DIAG-${len}X${off}U${modSuffix}`;
    }
    case 'mitred': {
      const armA = mitreArmA ?? 2;
      const armB = mitreArmB ?? 2;
      return `MB-CHAN-MTR-${armA}X${armB}U${modSuffix}`;
    }
    case 'spool':
      return 'UW-SPOOL-3X6';
    case 'socket_holder':
      return 'MB-HLDR-TESSAN-6X6';
    case 'accessory': {
      const w = widthUnits ?? 6;
      const h = length ?? 3;
      if (label && label.trim()) {
        const slug = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return `MB-ACC-${slug || `${w}X${h}U`}`;
      }
      return `MB-ACC-${w}X${h}U`;
    }
  }
}

/**
 * Returns a human-readable display name for a channel item in Multiboard Units (MU) and mm.
 */
export function getChannelDisplayName(
  kind: ChannelKind,
  length?: number,
  pitchMm: number = 25,
  widthUnits?: number,
  heightUnits?: number,
  armSpanUnits?: number,
  trunkSpanUnits?: number,
  branchSpanUnits?: number,
  radiusUnits?: number,
  mitreArmA?: number,
  mitreArmB?: number,
  offsetUnits?: number,
  yTrunkUnits?: number,
  yBranchUnits?: number,
  label?: string
): string {
  const w = widthUnits ?? 1;
  const h = heightUnits ?? 1;
  const unit = pitchMm === 28 ? 'OU' : 'MU';
  const dimTag = w > 1 || h > 1 ? ` · W${w}/H${h}` : '';

  switch (kind) {
    case 'straight': {
      const len = Math.max(1, Math.floor(length ?? 2));
      const mm = len * pitchMm;
      return `Straight Channel (I-Channel) ${len} ${unit}${dimTag} (${mm}mm)`;
    }
    case 'corner': {
      const span = armSpanUnits ?? 2;
      const mm = span * pitchMm;
      return `90° Corner (L-Channel) ${span}×${span} ${unit}${dimTag} (${mm}×${mm}mm)`;
    }
    case 'junction': {
      const trunk = trunkSpanUnits ?? 3;
      const branch = branchSpanUnits ?? 2;
      return `T-Junction ${trunk}×${branch} ${unit}${dimTag} (${trunk * pitchMm}×${branch * pitchMm}mm)`;
    }
    case 'cross':
      return `4-Way Cross (X-Channel) 3×3 ${unit}${dimTag} (${3 * pitchMm}×${3 * pitchMm}mm)`;
    case 'curved': {
      const rad = radiusUnits ?? 2;
      const mm = rad * pitchMm;
      return `Radial Curved (Curved) R${rad} ${unit}${dimTag} (R${mm}mm)`;
    }
    case 'y_split': {
      const trunk = yTrunkUnits ?? yBranchUnits ?? 3;
      const branch = yBranchUnits ?? yTrunkUnits ?? 3;
      return `Y-Split (Fork) ${trunk}×${branch} ${unit}${dimTag} (${trunk * pitchMm}×${branch * pitchMm}mm)`;
    }
    case 'diagonal': {
      const len = Math.max(2, Math.floor(length ?? 3));
      const off = offsetUnits ?? 1;
      return `Diagonal Channel (Jog 45°) ${len}×${off} ${unit}${dimTag} (${len * pitchMm}mm)`;
    }
    case 'mitred': {
      const armA = mitreArmA ?? 2;
      const armB = mitreArmB ?? 2;
      return `Mitered Corner (Mitred) ${armA}×${armB} ${unit}${dimTag} (${armA * pitchMm}×${armB * pitchMm}mm)`;
    }
    case 'spool':
      return `Cable Spool 3×6 ${unit} (${3 * pitchMm}×${6 * pitchMm}mm)`;
    case 'socket_holder':
      return `Tessan Multi-Socket Holder 6×6 ${unit} (${6 * pitchMm}×${6 * pitchMm}mm)`;
    case 'accessory': {
      if (label && label.trim()) {
        return label.trim();
      }
      const w = widthUnits ?? 6;
      const h = length ?? 3;
      return `Custom Accessory ${w}×${h} ${unit}`;
    }
  }
}

/**
 * Generates a descriptive string for a channel item.
 */
export function getChannelDescription(
  kind: ChannelKind,
  length?: number,
  radiusUnits?: number,
  mitreArmA?: number,
  mitreArmB?: number,
  offsetUnits?: number,
  yTrunkUnits?: number,
  yBranchUnits?: number,
  label?: string
): string {
  switch (kind) {
    case 'straight': {
      const len = Math.max(1, Math.floor(length ?? 2));
      return `Underware modular straight cable channel ${len} MU (${len * 25} mm).`;
    }
    case 'corner':
      return 'Underware 90° orthogonal curved corner for angled cable routing on Multiboard grid.';
    case 'junction':
      return 'Underware 3-way T-junction fitting for cable branches on Multiboard grid.';
    case 'cross':
      return 'Underware 4-way cross fitting for perpendicular intersections on Multiboard grid.';
    case 'curved': {
      const rad = radiusUnits ?? 2;
      return `Underware concentric radial curved corner R${rad} (${rad * 25} mm) for gentle cable bends.`;
    }
    case 'y_split': {
      const t = yTrunkUnits ?? yBranchUnits ?? 1;
      const b = yBranchUnits ?? yTrunkUnits ?? 1;
      return `Underware symmetrical 45° Y-split ${t}×${b} MU for cable routing on Multiboard grid.`;
    }
    case 'diagonal': {
      const l = length ?? 3;
      const o = offsetUnits ?? 1;
      return `Underware 45° offset jog segment ${l}×${o} MU (${l * 25} mm) for lateral lane shifts.`;
    }
    case 'mitred': {
      const a = mitreArmA ?? 2;
      const b = mitreArmB ?? 2;
      return `Underware 90° square mitered corner ${a}×${b} MU (${a * 25}×${b * 25} mm) for sharp turns.`;
    }
    case 'spool':
      return 'Underware cable spool 3×6 MU (75×150 mm) for slack management and cable winding on Multiboard grid.';
    case 'socket_holder':
      return 'Underware / Multiboard mounting bracket 6×6 MU (150×150 mm) for Tessan USB cube power strip.';
    case 'accessory':
      if (label && label.trim()) {
        return `Custom modular accessory "${label.trim()}" mounted on Multiboard grid.`;
      }
      return 'Custom modular accessory mounted on Multiboard grid.';
  }
}

// ============================================================================
// 2. Aggregations
// ============================================================================

/**
 * Aggregates all Multiboard or openGrid tiles required for the board layout.
 */
export function aggregateTiles(
  config: BoardConfig,
  tiles?: readonly TileDefinition[]
): readonly BOMItem[] {
  const platform = config.platform ?? 'multiboard';
  const defaultPitch = platform === 'opengrid' ? 28 : 25;
  const holePitchMm = config.holePitchMm ?? defaultPitch;
  const prefix = platform === 'opengrid' ? 'OG' : 'MB';

  const effectiveTiles = (tiles && tiles.length > 0)
    ? tiles
    : (config.customTiles && config.customTiles.length > 0)
      ? config.customTiles
      : null;

  if (effectiveTiles && effectiveTiles.length > 0) {
    const groups = new Map<string, { width: number; height: number; count: number }>();
    for (const t of effectiveTiles) {
      const key = `${t.widthHoles}x${t.heightHoles}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, { width: t.widthHoles, height: t.heightHoles, count: 1 });
      }
    }

    const items: BOMItem[] = [];
    for (const [, g] of groups.entries()) {
      const is8x8 = g.width === 8 && g.height === 8;
      const is7x7 = g.width === 7 && g.height === 7;
      const is6x6 = g.width === 6 && g.height === 6;
      const is5x5 = g.width === 5 && g.height === 5;
      const is4x4 = g.width === 4 && g.height === 4;

      const partNumber = is8x8
        ? `${prefix}-TILE-8X8`
        : is7x7
          ? `${prefix}-TILE-7X7`
          : is6x6
            ? `${prefix}-TILE-6X6`
            : is5x5
              ? `${prefix}-TILE-5X5`
              : is4x4
                ? `${prefix}-TILE-4X4`
                : `${prefix}-TILE-${g.width}X${g.height}`;

      const widthMm = g.width * holePitchMm;
      const heightMm = g.height * holePitchMm;

      let name: string;
      let description: string;

      if (platform === 'opengrid') {
        name = is8x8
          ? 'openGrid Tile (8x8)'
          : is7x7
            ? 'openGrid Tile (7x7)'
            : is6x6
              ? 'openGrid Tile (6x6)'
              : is5x5
                ? 'openGrid Tile (5x5)'
                : is4x4
                  ? 'openGrid Tile (4x4)'
                  : `openGrid Custom Tile (${g.width}x${g.height})`;
        description = `Standard openGrid modular tile (${widthMm}×${heightMm}mm) with 28mm pitch.`;
      } else {
        name = is8x8
          ? 'Multiboard Standard Tile (8x8)'
          : is6x6
            ? 'Multiboard Tile (6x6)'
            : is4x4
              ? 'Multiboard Compact Tile (4x4)'
              : `Multiboard Custom Tile (${g.width}x${g.height})`;
        description = is8x8
          ? 'Standard Multiboard 8x8 core grid tile for wall or under-desk cable management.'
          : is6x6
            ? 'Multiboard 6x6 mid-size grid tile for compact or medium workspaces.'
            : is4x4
              ? 'Multiboard 4x4 compact grid tile for smaller workspaces or tight corners.'
              : `Custom Multiboard ${g.width}x${g.height} tile (${widthMm}x${heightMm}mm).`;
      }

      items.push({
        id: `bom-tile-${partNumber.toLowerCase()}`,
        name,
        partNumber,
        category: 'tiles',
        categoryLabel: platform === 'opengrid' ? 'openGrid Tile' : 'Tile / Grid',
        quantity: g.count,
        unit: 'tiles',
        description,
        snapsRequired: 0,
        specs: {
          gridHoles: `${g.width} x ${g.height}`,
          dimensionsMm: `${widthMm} x ${heightMm}`,
          pitchMm: holePitchMm,
          platform,
        },
      });
    }

    // Sort descending by tile area (larger tiles first)
    items.sort((a, b) => {
      const partsA = a.partNumber.split('-TILE-')[1]?.split('X') || ['1', '1'];
      const partsB = b.partNumber.split('-TILE-')[1]?.split('X') || ['1', '1'];
      const areaA = (parseInt(partsA[0], 10) || 1) * (parseInt(partsA[1], 10) || 1);
      const areaB = (parseInt(partsB[0], 10) || 1) * (parseInt(partsB[1], 10) || 1);
      return areaB - areaA;
    });

    return Object.freeze(items);
  }

  const { cols, rows, tileWidthHoles, tileHeightHoles } = config;
  const totalTileCount = cols * rows;

  if (totalTileCount <= 0) return [];

  const is8x8 = tileWidthHoles === 8 && tileHeightHoles === 8;
  const is7x7 = tileWidthHoles === 7 && tileHeightHoles === 7;
  const is6x6 = tileWidthHoles === 6 && tileHeightHoles === 6;
  const is5x5 = tileWidthHoles === 5 && tileHeightHoles === 5;
  const is4x4 = tileWidthHoles === 4 && tileHeightHoles === 4;

  const partNumber = is8x8
    ? `${prefix}-TILE-8X8`
    : is7x7
      ? `${prefix}-TILE-7X7`
      : is6x6
        ? `${prefix}-TILE-6X6`
        : is5x5
          ? `${prefix}-TILE-5X5`
          : is4x4
            ? `${prefix}-TILE-4X4`
            : `${prefix}-TILE-${tileWidthHoles}X${tileHeightHoles}`;

  const widthMm = tileWidthHoles * holePitchMm;
  const heightMm = tileHeightHoles * holePitchMm;

  let name: string;
  let description: string;

  if (platform === 'opengrid') {
    name = is8x8
      ? 'openGrid Tile (8x8)'
      : is7x7
        ? 'openGrid Tile (7x7)'
        : is6x6
          ? 'openGrid Tile (6x6)'
          : is5x5
            ? 'openGrid Tile (5x5)'
            : is4x4
              ? 'openGrid Tile (4x4)'
              : `openGrid Custom Tile (${tileWidthHoles}x${tileHeightHoles})`;
    description = `Standard openGrid modular tile (${widthMm}×${heightMm}mm) with 28mm pitch.`;
  } else {
    name = is8x8
      ? 'Multiboard Standard Tile (8x8)'
      : is6x6
        ? 'Multiboard Tile (6x6)'
        : is4x4
          ? 'Multiboard Compact Tile (4x4)'
          : `Multiboard Custom Tile (${tileWidthHoles}x${tileHeightHoles})`;
    description = is8x8
      ? 'Standard Multiboard 8x8 core grid tile for wall or under-desk cable management.'
      : is6x6
        ? 'Multiboard 6x6 mid-size grid tile for compact or medium workspaces.'
        : is4x4
          ? 'Multiboard 4x4 compact grid tile for smaller workspaces or tight corners.'
          : `Custom Multiboard ${tileWidthHoles}x${tileHeightHoles} tile (${widthMm}x${heightMm}mm).`;
  }

  const item: BOMItem = {
    id: `bom-tile-${partNumber.toLowerCase()}`,
    name,
    partNumber,
    category: 'tiles',
    categoryLabel: platform === 'opengrid' ? 'openGrid Tile' : 'Tile / Grid',
    quantity: totalTileCount,
    unit: 'tiles',
    description,
    snapsRequired: 0,
    specs: {
      gridHoles: `${tileWidthHoles} x ${tileHeightHoles}`,
      dimensionsMm: `${widthMm} x ${heightMm}`,
      pitchMm: holePitchMm,
      platform,
    },
  };

  return Object.freeze([item]);
}

/**
 * Aggregates placed channels into distinct catalog items grouped by part number and category.
 */
export function aggregateChannels(
  channels: readonly PlacedChannel[],
  pitchMm: number = 25
): readonly BOMItem[] {
  const groups = new Map<string, { channel: PlacedChannel; count: number; categories: Set<ChannelCategory> }>();

  for (const ch of channels) {
    const partNum = getChannelPartNumber(
      ch.kind,
      ch.length,
      ch.widthUnits,
      ch.heightUnits,
      ch.armSpanUnits,
      ch.trunkSpanUnits,
      ch.branchSpanUnits,
      ch.radiusUnits,
      ch.mitreArmA,
      ch.mitreArmB,
      ch.offsetUnits,
      ch.yTrunkUnits,
      ch.yBranchUnits,
      ch.label
    );
    const existing = groups.get(partNum);

    if (existing) {
      existing.count += 1;
      existing.categories.add(ch.category);
    } else {
      groups.set(partNum, {
        channel: ch,
        count: 1,
        categories: new Set([ch.category]),
      });
    }
  }

  const items: BOMItem[] = [];
  for (const [partNumber, data] of groups) {
    const { channel, count, categories } = data;
    const unitLength = getChannelUnitLength(channel);
    const lengthMm = unitLength * pitchMm;
    const snapsPerChannel = getChannelSnapCount(channel);

    items.push({
      id: `bom-chan-${partNumber.toLowerCase()}`,
      name: getChannelDisplayName(
        channel.kind,
        channel.length,
        pitchMm,
        channel.widthUnits,
        channel.heightUnits,
        channel.armSpanUnits,
        channel.trunkSpanUnits,
        channel.branchSpanUnits,
        channel.radiusUnits,
        channel.mitreArmA,
        channel.mitreArmB,
        channel.offsetUnits,
        channel.yTrunkUnits,
        channel.yBranchUnits,
        channel.label
      ),
      partNumber,
      category: 'channels',
      categoryLabel: Array.from(categories).sort().join(', '),
      quantity: count,
      unit: 'pcs',
      description: getChannelDescription(
        channel.kind,
        channel.length,
        channel.radiusUnits,
        channel.mitreArmA,
        channel.mitreArmB,
        channel.offsetUnits,
        channel.yTrunkUnits,
        channel.yBranchUnits,
        channel.label
      ),
      snapsRequired: snapsPerChannel * count,
      specs: {
        kind: channel.kind,
        unitsLength: unitLength,
        lengthMm,
        categories: Array.from(categories).sort().join(', '),
        length: channel.length ?? 2,
        widthUnits: channel.widthUnits ?? 1,
        ...(channel.radiusUnits !== undefined ? { radiusUnits: channel.radiusUnits } : {}),
        ...(channel.armSpanUnits !== undefined ? { armSpanUnits: channel.armSpanUnits } : {}),
        ...(channel.trunkSpanUnits !== undefined ? { trunkSpanUnits: channel.trunkSpanUnits } : {}),
        ...(channel.branchSpanUnits !== undefined ? { branchSpanUnits: channel.branchSpanUnits } : {}),
        ...(channel.label ? { label: channel.label } : {}),
      },
    });
  }

  // Sort items deterministically by part number
  items.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
  return Object.freeze(items);
}

/**
 * Calculates snap connector requirements, adding a specified spare percentage (default 10%) rounded up.
 * Retained for backwards compatibility with tests and consumers.
 */
export function aggregateSnapConnectors(
  channels: readonly PlacedChannel[],
  sparePercent: number = 10,
  platform: GridPlatform = 'multiboard'
): { item: BOMItem; baseCount: number; spareCount: number; totalCount: number } {
  const targetSnapType = platform === 'opengrid' ? 'opengrid_base_snap' : 'threaded_snap';
  const baseCount = channels.reduce((sum, ch) => {
    const mType = ch.mountingType ?? targetSnapType;
    if (mType === 'none') return sum;
    if (platform === 'opengrid') {
      return (mType === 'opengrid_base_snap' || mType === 'opengrid_grip_snap' || mType === 'opengrid_snap')
        ? sum + getChannelSnapCount(ch)
        : sum;
    }
    return mType === targetSnapType ? sum + getChannelSnapCount(ch) : sum;
  }, 0);
  const spareRate = Math.max(0, sparePercent) / 100;
  const spareCount = baseCount > 0 ? Math.ceil(baseCount * spareRate) : 0;
  const totalCount = baseCount + spareCount;

  const item: BOMItem = platform === 'opengrid'
    ? {
        id: 'bom-snaps-opengrid',
        name: 'The Underware channel base snap',
        partNumber: 'OG-SNAP-BASE',
        category: 'mounting',
        categoryLabel: 'openGrid Mounting',
        quantity: totalCount,
        unit: 'pcs',
        description: `Snap connector for openGrid 28mm cells (+${sparePercent}% spare included)`,
        snapsRequired: totalCount,
        specs: {
          baseRequirement: baseCount,
          spareAllowancePercent: `${sparePercent}%`,
          spareQuantity: spareCount,
          totalToPrintOrOrder: totalCount,
        },
      }
    : {
        id: 'bom-snaps-underware',
        name: 'Underware Threaded Snap Connector',
        partNumber: 'UW-SNAP-THRD',
        category: 'mounting',
        categoryLabel: 'Underware Mounting',
        quantity: totalCount,
        unit: 'pcs',
        description: `Threaded mounting snap for Multiboard octagons (+${sparePercent}% spare included)`,
        snapsRequired: totalCount,
        specs: {
          baseRequirement: baseCount,
          spareAllowancePercent: `${sparePercent}%`,
          spareQuantity: spareCount,
          totalToPrintOrOrder: totalCount,
        },
      };

  return { item, baseCount, spareCount, totalCount };
}

/**
 * Aggregates all mounting hardware across channels by mounting system type:
 * - Threaded Snap (+spare%)
 * - openGrid Base Snap (+spare%)
 * - openGrid Grip Snap (+spare%)
 * - Direct Screw (1:1)
 * - Multiconnect (1:1)
 */
export function aggregateMountingHardware(
  channels: readonly PlacedChannel[],
  sparePercent: number = 10,
  pitchMm: number = 25,
  platform: GridPlatform = 'multiboard'
): {
  items: readonly BOMItem[];
  mountCountsByType: Record<MountingType, { base: number; spare: number; total: number }>;
  mountDetails: readonly MountDetail[];
  totalMounts: number;
} {
  const mountCountsByType: Record<MountingType, { base: number; spare: number; total: number }> = {
    threaded_snap: { base: 0, spare: 0, total: 0 },
    opengrid_base_snap: { base: 0, spare: 0, total: 0 },
    opengrid_grip_snap: { base: 0, spare: 0, total: 0 },
    opengrid_snap: { base: 0, spare: 0, total: 0 },
    none: { base: 0, spare: 0, total: 0 },
    direct_snap: { base: 0, spare: 0, total: 0 },
    direct_screw: { base: 0, spare: 0, total: 0 },
    multiconnect: { base: 0, spare: 0, total: 0 },
    standard_snap: { base: 0, spare: 0, total: 0 },
    multipoint_rail: { base: 0, spare: 0, total: 0 },
    wood_screw: { base: 0, spare: 0, total: 0 },
    adhesive: { base: 0, spare: 0, total: 0 },
    magnetic: { base: 0, spare: 0, total: 0 },
  };

  const mountDetails: MountDetail[] = [];
  let totalMounts = 0;
  const defaultMount: MountingType = platform === 'opengrid' ? 'opengrid_base_snap' : 'threaded_snap';

  for (const ch of channels) {
    const mType: MountingType = ch.mountingType ?? defaultMount;

    if (mType === 'none') {
      const channelName = getChannelDisplayName(
        ch.kind,
        ch.length,
        pitchMm,
        ch.widthUnits,
        ch.heightUnits,
        ch.armSpanUnits,
        ch.trunkSpanUnits,
        ch.branchSpanUnits,
        ch.radiusUnits,
        ch.mitreArmA,
        ch.mitreArmB,
        ch.offsetUnits,
        ch.yTrunkUnits,
        ch.yBranchUnits,
        ch.label
      );
      mountDetails.push({
        channelId: ch.id,
        channelName,
        channelKind: ch.kind,
        mountingType: 'none',
        mountCount: 0,
      });
      continue;
    }

    const count = getChannelSnapCount(ch);
    totalMounts += count;

    if (mountCountsByType[mType]) {
      mountCountsByType[mType].base += count;
    }

    const channelName = getChannelDisplayName(
      ch.kind,
      ch.length,
      pitchMm,
      ch.widthUnits,
      ch.heightUnits,
      ch.armSpanUnits,
      ch.trunkSpanUnits,
      ch.branchSpanUnits,
      ch.radiusUnits,
      ch.mitreArmA,
      ch.mitreArmB,
      ch.offsetUnits,
      ch.yTrunkUnits,
      ch.yBranchUnits,
      ch.label
    );

    mountDetails.push({
      channelId: ch.id,
      channelName,
      channelKind: ch.kind,
      mountingType: mType,
      mountCount: count,
    });
  }

  // Calculate spares:
  const spareRate = Math.max(0, sparePercent) / 100;

  // Threaded Snap includes spare percentage
  const snapBase = mountCountsByType.threaded_snap.base;
  const snapSpare = snapBase > 0 ? Math.ceil(snapBase * spareRate) : 0;
  mountCountsByType.threaded_snap.spare = snapSpare;
  mountCountsByType.threaded_snap.total = snapBase + snapSpare;

  // openGrid Legacy Snap
  const ogLegacySnapCount = mountCountsByType.opengrid_snap.base;
  const ogLegacySnapSpare = ogLegacySnapCount > 0 ? Math.ceil(ogLegacySnapCount * spareRate) : 0;
  mountCountsByType.opengrid_snap.spare = ogLegacySnapSpare;
  mountCountsByType.opengrid_snap.total = ogLegacySnapCount + ogLegacySnapSpare;

  // openGrid Base Snap
  const ogBaseSnapCount = mountCountsByType.opengrid_base_snap.base;
  const ogBaseSnapSpare = ogBaseSnapCount > 0 ? Math.ceil(ogBaseSnapCount * spareRate) : 0;
  mountCountsByType.opengrid_base_snap.spare = ogBaseSnapSpare;
  mountCountsByType.opengrid_base_snap.total = ogBaseSnapCount + ogBaseSnapSpare;

  // openGrid Grip Snap
  const ogGripSnapCount = mountCountsByType.opengrid_grip_snap.base;
  const ogGripSnapSpare = ogGripSnapCount > 0 ? Math.ceil(ogGripSnapCount * spareRate) : 0;
  mountCountsByType.opengrid_grip_snap.spare = ogGripSnapSpare;
  mountCountsByType.opengrid_grip_snap.total = ogGripSnapCount + ogGripSnapSpare;

  // Direct Snap (Integrated in 3D printed body): 0% spare, no separate hardware items
  mountCountsByType.direct_snap.spare = 0;
  mountCountsByType.direct_snap.total = mountCountsByType.direct_snap.base;

  // Direct Screw: 0% spare (1:1)
  mountCountsByType.direct_screw.spare = 0;
  mountCountsByType.direct_screw.total = mountCountsByType.direct_screw.base;

  // Multiconnect: 0% spare (1:1)
  mountCountsByType.multiconnect.spare = 0;
  mountCountsByType.multiconnect.total = mountCountsByType.multiconnect.base;

  const items: BOMItem[] = [];

  if (mountCountsByType.threaded_snap.total > 0) {
    items.push({
      id: 'bom-mount-threaded-snap',
      name: 'Underware Threaded Snap',
      partNumber: 'UW-SNAP-THRD',
      category: 'mounting',
      categoryLabel: 'Underware Mounting',
      quantity: mountCountsByType.threaded_snap.total,
      unit: 'pcs',
      description: `Threaded snap for Multiboard holes (${snapBase} base + ${snapSpare} spare +${sparePercent}%)`,
      snapsRequired: mountCountsByType.threaded_snap.total,
      specs: {
        baseRequirement: snapBase,
        spareAllowancePercent: `${sparePercent}%`,
        spareQuantity: snapSpare,
        totalToPrintOrOrder: mountCountsByType.threaded_snap.total,
      },
    });
  }

  if (mountCountsByType.opengrid_snap.total > 0) {
    items.push({
      id: 'bom-mount-opengrid-snap',
      name: 'Underware openGrid Snap',
      partNumber: 'OG-SNAP-UW',
      category: 'mounting',
      categoryLabel: 'Underware Mounting',
      quantity: mountCountsByType.opengrid_snap.total,
      unit: 'pcs',
      description: `Snap connector for openGrid 28mm cells (${ogLegacySnapCount} base + ${ogLegacySnapSpare} spare +${sparePercent}%)`,
      snapsRequired: mountCountsByType.opengrid_snap.total,
      specs: {
        baseRequirement: ogLegacySnapCount,
        spareAllowancePercent: `${sparePercent}%`,
        spareQuantity: ogLegacySnapSpare,
        totalToPrintOrOrder: mountCountsByType.opengrid_snap.total,
      },
    });
  }

  if (mountCountsByType.opengrid_base_snap.total > 0) {
    items.push({
      id: 'bom-mount-opengrid-base-snap',
      name: 'The Underware channel base snap',
      partNumber: 'OG-SNAP-BASE',
      category: 'mounting',
      categoryLabel: 'openGrid Mounting',
      quantity: mountCountsByType.opengrid_base_snap.total,
      unit: 'pcs',
      description: `Underware base snap for openGrid 28mm cells (${ogBaseSnapCount} base + ${ogBaseSnapSpare} spare +${sparePercent}%)`,
      snapsRequired: mountCountsByType.opengrid_base_snap.total,
      specs: {
        baseRequirement: ogBaseSnapCount,
        spareAllowancePercent: `${sparePercent}%`,
        spareQuantity: ogBaseSnapSpare,
        totalToPrintOrOrder: mountCountsByType.opengrid_base_snap.total,
      },
    });
  }

  if (mountCountsByType.opengrid_grip_snap.total > 0) {
    items.push({
      id: 'bom-mount-opengrid-grip-snap',
      name: 'The Underware grip channel snap',
      partNumber: 'OG-SNAP-GRIP',
      category: 'mounting',
      categoryLabel: 'openGrid Mounting',
      quantity: mountCountsByType.opengrid_grip_snap.total,
      unit: 'pcs',
      description: `Underware grip clamp snap for openGrid 28mm cells (${ogGripSnapCount} base + ${ogGripSnapSpare} spare +${sparePercent}%)`,
      snapsRequired: mountCountsByType.opengrid_grip_snap.total,
      specs: {
        baseRequirement: ogGripSnapCount,
        spareAllowancePercent: `${sparePercent}%`,
        spareQuantity: ogGripSnapSpare,
        totalToPrintOrOrder: mountCountsByType.opengrid_grip_snap.total,
      },
    });
  }

  if (mountCountsByType.direct_screw.total > 0) {
    items.push({
      id: 'bom-mount-direct-screw',
      name: 'Direct Screws M3/M4',
      partNumber: 'UW-SCREW-M3M4',
      category: 'mounting',
      categoryLabel: 'Mechanical Fastening',
      quantity: mountCountsByType.direct_screw.total,
      unit: 'pcs',
      description: 'Socket head cap screws for rigid through-mounting (1:1)',
      snapsRequired: mountCountsByType.direct_screw.total,
      specs: {
        baseRequirement: mountCountsByType.direct_screw.base,
        totalToPrintOrOrder: mountCountsByType.direct_screw.total,
      },
    });
  }

  if (mountCountsByType.multiconnect.total > 0) {
    items.push({
      id: 'bom-mount-multiconnect',
      name: 'Multiconnect Dovetail Connector',
      partNumber: 'MC-CONN-DOVE',
      category: 'mounting',
      categoryLabel: 'Multiconnect System',
      quantity: mountCountsByType.multiconnect.total,
      unit: 'pcs',
      description: 'Dovetail slide-in bracket connector for Multiconnect accessories (1:1)',
      snapsRequired: mountCountsByType.multiconnect.total,
      specs: {
        baseRequirement: mountCountsByType.multiconnect.base,
        totalToPrintOrOrder: mountCountsByType.multiconnect.total,
      },
    });
  }

  // Sort mounting items deterministically
  items.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

  return {
    items: Object.freeze(items),
    mountCountsByType,
    mountDetails: Object.freeze(mountDetails),
    totalMounts,
  };
}

// ============================================================================
// 3. BOM Generator Function
// ============================================================================

/**
 * Generates a comprehensive Bill of Materials for a complete board state.
 */
export function generateBOM(
  boardState: BoardState,
  spareSnapPercent: number = 10
): BillOfMaterials {
  const { config, channels, tiles } = boardState;
  const safeConfig = config ?? DEFAULT_BOARD_CONFIG;
  const platform = safeConfig.platform ?? 'multiboard';
  const dims = calculateBoardDimensions(safeConfig);

  const effectiveTiles = tiles && tiles.length > 0 ? tiles : generateTileMatrix(safeConfig);

  // 1. Tiles
  const tileItems = aggregateTiles(safeConfig, effectiveTiles);
  const totalTiles = tileItems.reduce((sum, item) => sum + item.quantity, 0);
  const tileCountByType: Record<string, number> = {};
  for (const item of tileItems) {
    const key = item.partNumber.replace(/^(MB|OG)-TILE-/, '');
    tileCountByType[key] = item.quantity;
  }

  // 2. Channels
  const channelItems = aggregateChannels(channels, safeConfig.holePitchMm);
  const totalChannels = channels.length;

  let totalChannelLengthUnits = 0;
  const channelsByCategory: Record<ChannelCategory, number> = {
    power: 0,
    data: 0,
    video: 0,
    network: 0,
    neutral: 0,
  };

  const channelsByKind: Record<ChannelKind, number> = {
    straight: 0,
    corner: 0,
    junction: 0,
    cross: 0,
    curved: 0,
    y_split: 0,
    diagonal: 0,
    mitred: 0,
    spool: 0,
    socket_holder: 0,
    accessory: 0,
  };

  for (const ch of channels) {
    totalChannelLengthUnits += getChannelUnitLength(ch);
    channelsByCategory[ch.category] = (channelsByCategory[ch.category] || 0) + 1;
    channelsByKind[ch.kind] = (channelsByKind[ch.kind] || 0) + 1;
  }

  const totalChannelLengthMm = totalChannelLengthUnits * safeConfig.holePitchMm;

  // 3. Mounting Hardware
  const mountHardware = aggregateMountingHardware(channels, spareSnapPercent, safeConfig.holePitchMm, platform);
  const snapCounts = platform === 'opengrid'
    ? {
        base: mountHardware.mountCountsByType.opengrid_base_snap.base + mountHardware.mountCountsByType.opengrid_grip_snap.base + mountHardware.mountCountsByType.opengrid_snap.base,
        spare: mountHardware.mountCountsByType.opengrid_base_snap.spare + mountHardware.mountCountsByType.opengrid_grip_snap.spare + mountHardware.mountCountsByType.opengrid_snap.spare,
        total: mountHardware.mountCountsByType.opengrid_base_snap.total + mountHardware.mountCountsByType.opengrid_grip_snap.total + mountHardware.mountCountsByType.opengrid_snap.total,
      }
    : mountHardware.mountCountsByType.threaded_snap;

  // Combine items: tiles, channels, mounting hardware
  const allItems: BOMItem[] = [
    ...tileItems,
    ...channelItems,
    ...mountHardware.items,
  ];

  const summary: BOMSummary = {
    totalTiles,
    tileCountByType,
    totalChannels,
    totalChannelLengthUnits,
    totalChannelLengthMm,
    channelsByCategory: Object.freeze(channelsByCategory),
    channelsByKind: Object.freeze(channelsByKind),
    totalMounts: mountHardware.totalMounts,
    baseSnapCount: snapCounts.base,
    spareSnapPercent,
    spareSnapCount: snapCounts.spare,
    totalSnapCountWithSpares: snapCounts.total,
    mountCountsByType: mountHardware.mountCountsByType,
    mountDetails: mountHardware.mountDetails,
  };

  return {
    generatedAt: new Date().toISOString(),
    boardDimensions: {
      platform,
      cols: safeConfig.cols,
      rows: safeConfig.rows,
      totalHolesX: dims.totalHolesX,
      totalHolesY: dims.totalHolesY,
      totalWidthMm: dims.totalWidthMm,
      totalHeightMm: dims.totalHeightMm,
      holePitchMm: safeConfig.holePitchMm,
    },
    items: Object.freeze(allItems),
    summary,
  };
}

// ============================================================================
// 4. Formatting Utilities (Markdown, CSV, JSON)
// ============================================================================

/**
 * Formats a Bill of Materials into a clean, grouped GitHub-Flavored Markdown table.
 */
export function formatBOMAsMarkdown(bom: BillOfMaterials): string {
  const { summary, items } = bom;
  const lines: string[] = [
    '# Underplan — Bill of Materials (BOM)',
    '',
    `> *Desk: ${bom.boardDimensions.totalWidthMm}×${bom.boardDimensions.totalHeightMm} mm • ${summary.totalTiles} Tiles • ${summary.totalChannels} Channels (${summary.totalChannelLengthMm} mm) • ${summary.totalMounts} Total Mounts*`,
    '> *Indicative planning estimates — verify dimensions, tolerances, and mounting requirements in the official configurator before printing.*',
    '',
    '### UNDERWARE CHANNELS',
    '| Part / Component | Category | Quantity | Required Mounts |',
    '| :--- | :--- | :---: | :---: |',
  ];

  const channelItems = items.filter((i) => i.category === 'channels');
  for (const item of channelItems) {
    const cat = item.categoryLabel || item.category;
    const snaps = item.snapsRequired ? `${item.snapsRequired}` : '-';
    lines.push(`| ${item.name} | ${cat} | **${item.quantity}** ${item.unit} | ${snaps} |`);
  }

  lines.push('');
  lines.push('### MOUNTING SYSTEMS');
  lines.push('| Hardware | Category | Quantity | Notes |');
  lines.push('| :--- | :--- | :---: | :--- |');

  const platform = bom.boardDimensions?.platform ?? 'multiboard';
  const platformName = platform === 'opengrid' ? 'openGrid' : 'Multiboard';
  const platformPitch = platform === 'opengrid' ? '28 mm' : '25 mm';
  const unitLabel = platform === 'opengrid' ? '1 OU' : '1 MU';

  const mountItems = items.filter((i) => i.category === 'mounting');
  for (const item of mountItems) {
    lines.push(`| **${item.name}** | ${item.categoryLabel} | **${item.quantity} ${item.unit}** | ${item.description} |`);
  }

  lines.push('');
  lines.push(`### ${platformName.toUpperCase()} TILES`);
  lines.push('| Tile Module | Form Factor | Quantity | Dimensions |');
  lines.push('| :--- | :--- | :---: | :--- |');

  const tileItems = items.filter((i) => i.category === 'tiles');
  for (const item of tileItems) {
    lines.push(`| ${item.name} | ${item.categoryLabel} | **${item.quantity}** ${item.unit} | ${item.description} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*${platformName} Standard ${platformPitch} (${unitLabel} = ${platformPitch}). Underplan is an open community planning tool and does not represent an official manufacturing authority.*`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Formats a Bill of Materials into a clean RFC-4180 CSV table.
 */
export function formatBOMAsCSV(bom: BillOfMaterials): string {
  const { items } = bom;
  const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const platform = bom.boardDimensions?.platform ?? 'multiboard';
  const platformGridName = platform === 'opengrid' ? 'openGrid Grid' : 'Multiboard Grid';

  const rows = [
    ['Section', 'Part / Component', 'Category', 'Quantity', 'Details / Mounting'].map(escapeCsv).join(','),
  ];

  for (const item of items) {
    const section = item.category === 'channels'
      ? 'Underware Channels'
      : item.category === 'mounting'
        ? 'Mounting Systems'
        : platformGridName;
    const cat = item.categoryLabel || item.category;
    const snaps = item.snapsRequired ? `${item.snapsRequired} mounts` : item.description;

    rows.push([
      escapeCsv(section),
      escapeCsv(item.name),
      escapeCsv(cat),
      escapeCsv(`${item.quantity} ${item.unit}`),
      escapeCsv(snaps),
    ].join(','));
  }

  return rows.join('\n');
}

/**
 * Serializes a Bill of Materials to pretty-printed JSON.
 */
export function formatBOMAsJSON(bom: BillOfMaterials): string {
  return JSON.stringify(bom, null, 2);
}
