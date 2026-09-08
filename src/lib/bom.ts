import type {
  BillOfMaterials,
  BoardConfig,
  BoardState,
  BOMItem,
  BOMSummary,
  ChannelCategory,
  ChannelKind,
  MountDetail,
  MountingType,
  PlacedChannel,
} from './types.ts';
import {
  calculateBoardDimensions,
  DEFAULT_BOARD_CONFIG,
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
      const trunk = yTrunkUnits ?? 2;
      const branch = yBranchUnits ?? 2;
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
  const dimTag = w > 1 || h > 1 ? ` · W${w}/H${h}` : '';

  switch (kind) {
    case 'straight': {
      const len = Math.max(1, Math.floor(length ?? 2));
      const mm = len * pitchMm;
      return `Straight Channel (I-Channel) ${len} MU${dimTag} (${mm}mm)`;
    }
    case 'corner': {
      const span = armSpanUnits ?? 2;
      const mm = span * pitchMm;
      return `90° Corner (L-Channel) ${span}×${span} MU${dimTag} (${mm}×${mm}mm)`;
    }
    case 'junction': {
      const trunk = trunkSpanUnits ?? 3;
      const branch = branchSpanUnits ?? 2;
      return `T-Junction ${trunk}×${branch} MU${dimTag} (${trunk * pitchMm}×${branch * pitchMm}mm)`;
    }
    case 'cross':
      return `4-Way Cross (X-Channel) 3×3 MU${dimTag} (75×75mm)`;
    case 'curved': {
      const rad = radiusUnits ?? 2;
      const mm = rad * pitchMm;
      return `Radial Curved (Curved) R${rad} MU${dimTag} (R${mm}mm)`;
    }
    case 'y_split': {
      const trunk = yTrunkUnits ?? 2;
      const branch = yBranchUnits ?? 2;
      return `Y-Split (Fork) ${trunk}×${branch} MU${dimTag}`;
    }
    case 'diagonal': {
      const len = Math.max(2, Math.floor(length ?? 3));
      const off = offsetUnits ?? 1;
      return `Diagonal Channel (Jog 45°) ${len}×${off} MU${dimTag} (${len * pitchMm}mm)`;
    }
    case 'mitred': {
      const armA = mitreArmA ?? 2;
      const armB = mitreArmB ?? 2;
      return `Mitered Corner (Mitred) ${armA}×${armB} MU${dimTag} (${armA * pitchMm}×${armB * pitchMm}mm)`;
    }
    case 'spool':
      return 'Cable Spool 3×6 MU (75×150mm)';
    case 'socket_holder':
      return 'Tessan Multi-Socket Holder 6×6 MU (150×150mm)';
    case 'accessory': {
      if (label && label.trim()) {
        return label.trim();
      }
      const w = widthUnits ?? 6;
      const h = length ?? 3;
      return `Custom Accessory ${w}×${h} MU`;
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
      const t = yTrunkUnits ?? 2;
      const b = yBranchUnits ?? 2;
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
 * Aggregates all Multiboard tiles required for the board layout.
 */
export function aggregateTiles(config: BoardConfig): readonly BOMItem[] {
  const { cols, rows, tileWidthHoles, tileHeightHoles, holePitchMm } = config;
  const totalTileCount = cols * rows;

  if (totalTileCount <= 0) return [];

  const is8x8 = tileWidthHoles === 8 && tileHeightHoles === 8;
  const is6x6 = tileWidthHoles === 6 && tileHeightHoles === 6;
  const is4x4 = tileWidthHoles === 4 && tileHeightHoles === 4;

  const partNumber = is8x8
    ? 'MB-TILE-8X8'
    : is6x6
      ? 'MB-TILE-6X6'
      : is4x4
        ? 'MB-TILE-4X4'
        : `MB-TILE-${tileWidthHoles}X${tileHeightHoles}`;
  const widthMm = tileWidthHoles * holePitchMm;
  const heightMm = tileHeightHoles * holePitchMm;
  const name = is8x8
    ? 'Multiboard Standard Tile (8x8)'
    : is6x6
      ? 'Multiboard Tile (6x6)'
      : is4x4
        ? 'Multiboard Compact Tile (4x4)'
        : `Multiboard Custom Tile (${tileWidthHoles}x${tileHeightHoles})`;

  const item: BOMItem = {
    id: `bom-tile-${partNumber.toLowerCase()}`,
    name,
    partNumber,
    category: 'tiles',
    categoryLabel: 'Tile / Grid',
    quantity: totalTileCount,
    unit: 'tiles',
    description: `Standard Multiboard modular tile (${widthMm}×${heightMm}mm)`,
    snapsRequired: 0,
    specs: {
      gridHoles: `${tileWidthHoles} x ${tileHeightHoles}`,
      dimensionsMm: `${widthMm} x ${heightMm}`,
      matrixLayout: `${cols} cols x ${rows} rows`,
      pitchMm: holePitchMm,
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
  sparePercent: number = 10
): { item: BOMItem; baseCount: number; spareCount: number; totalCount: number } {
  const baseCount = channels.reduce((sum, ch) => {
    const mType = ch.mountingType ?? 'threaded_snap';
    return mType === 'threaded_snap' ? sum + getChannelSnapCount(ch) : sum;
  }, 0);
  const spareRate = Math.max(0, sparePercent) / 100;
  const spareCount = baseCount > 0 ? Math.ceil(baseCount * spareRate) : 0;
  const totalCount = baseCount + spareCount;

  const item: BOMItem = {
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
 * - Direct Screw (1:1)
 * - Multiconnect (1:1)
 */
export function aggregateMountingHardware(
  channels: readonly PlacedChannel[],
  sparePercent: number = 10,
  pitchMm: number = 25
): {
  items: readonly BOMItem[];
  mountCountsByType: Record<MountingType, { base: number; spare: number; total: number }>;
  mountDetails: readonly MountDetail[];
  totalMounts: number;
} {
  const mountCountsByType: Record<MountingType, { base: number; spare: number; total: number }> = {
    threaded_snap: { base: 0, spare: 0, total: 0 },
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

  for (const ch of channels) {
    const mType: MountingType = ch.mountingType ?? 'threaded_snap';
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
  // Threaded Snap includes spare percentage
  const snapBase = mountCountsByType.threaded_snap.base;
  const spareRate = Math.max(0, sparePercent) / 100;
  const snapSpare = snapBase > 0 ? Math.ceil(snapBase * spareRate) : 0;
  mountCountsByType.threaded_snap.spare = snapSpare;
  mountCountsByType.threaded_snap.total = snapBase + snapSpare;

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
      name: 'Multiconnect Connector (Dovetail)',
      partNumber: 'MC-CONN-SLIDE',
      category: 'mounting',
      categoryLabel: 'Multiboard Mounting',
      quantity: mountCountsByType.multiconnect.total,
      unit: 'pcs',
      description: 'Dovetail slide connector for Multiconnect accessories (1:1)',
      snapsRequired: mountCountsByType.multiconnect.total,
      specs: {
        baseRequirement: mountCountsByType.multiconnect.base,
        totalToPrintOrOrder: mountCountsByType.multiconnect.total,
      },
    });
  }

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
 * Generates the complete Bill of Materials from a board state.
 *
 * @param boardState Current state of the planner board
 * @param spareSnapPercent Percentage of extra snap connectors to include (default: 10)
 */
export function generateBOM(
  boardState: BoardState,
  spareSnapPercent: number = 10
): BillOfMaterials {
  const { config, channels } = boardState;
  const safeConfig = config ?? DEFAULT_BOARD_CONFIG;
  const dims = calculateBoardDimensions(safeConfig);

  // 1. Tiles
  const tileItems = aggregateTiles(safeConfig);
  const totalTiles = safeConfig.cols * safeConfig.rows;
  const tileTypeKey = `${safeConfig.tileWidthHoles}x${safeConfig.tileHeightHoles}`;
  const tileCountByType: Record<string, number> = {
    [tileTypeKey]: totalTiles,
  };

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
  const mountHardware = aggregateMountingHardware(channels, spareSnapPercent, safeConfig.holePitchMm);
  const snapCounts = mountHardware.mountCountsByType.threaded_snap;

  // Combine items: tiles, channels, mounting hardware
  const allItems: BOMItem[] = [...tileItems, ...channelItems, ...mountHardware.items];

  const summary: BOMSummary = {
    totalTiles,
    tileCountByType,
    totalChannels,
    totalChannelLengthUnits,
    totalChannelLengthMm,
    channelsByCategory,
    channelsByKind,
    baseSnapCount: snapCounts.base,
    spareSnapPercent,
    spareSnapCount: snapCounts.spare,
    totalSnapCountWithSpares: snapCounts.total,
    totalMounts: mountHardware.totalMounts,
    mountCountsByType: mountHardware.mountCountsByType,
    mountDetails: mountHardware.mountDetails,
  };

  return {
    generatedAt: new Date().toISOString(),
    boardDimensions: {
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

  const mountItems = items.filter((i) => i.category === 'mounting');
  for (const item of mountItems) {
    lines.push(`| **${item.name}** | ${item.categoryLabel} | **${item.quantity} ${item.unit}** | ${item.description} |`);
  }

  lines.push('');
  lines.push('### MULTIBOARD TILES');
  lines.push('| Tile Module | Form Factor | Quantity | Dimensions |');
  lines.push('| :--- | :--- | :---: | :--- |');

  const tileItems = items.filter((i) => i.category === 'tiles');
  for (const item of tileItems) {
    lines.push(`| ${item.name} | ${item.categoryLabel} | **${item.quantity}** ${item.unit} | ${item.description} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Multiboard Standard 25 mm (1 MU = 25 mm). Underplan is an open community planning tool and does not represent an official manufacturing authority.*');
  lines.push('');
  return lines.join('\n');
}

/**
 * Formats a Bill of Materials into a clean RFC-4180 CSV table.
 */
export function formatBOMAsCSV(bom: BillOfMaterials): string {
  const { items } = bom;
  const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

  const rows = [
    ['Section', 'Part / Component', 'Category', 'Quantity', 'Details / Mounting'].map(escapeCsv).join(','),
  ];

  for (const item of items) {
    const section = item.category === 'channels'
      ? 'Underware Channels'
      : item.category === 'mounting'
        ? 'Mounting Systems'
        : 'Multiboard Grid';
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
