/**
 * Underplan Geometry & Data Model Types
 * Pure TypeScript definitions for the Multiboard top-down SVG planner.
 */

// ============================================================================
// 1. Core Coordinate & Geometric Types
// ============================================================================

/**
 * Discrete coordinate representing an attachment hole on the Multiboard grid.
 * (0, 0) is the top-left hole of the board.
 * +X extends rightward (columns), +Y extends downward (rows).
 */
export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Continuous coordinate in physical world units (millimeters) or SVG user units.
 * (0, 0) is the top-left corner origin of the physical board.
 */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Axis-aligned bounding box defined in discrete grid hole units or world units.
 */
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Discrete orthogonal rotation angle in degrees (clockwise in SVG Y-down space).
 */
export type Rotation = 0 | 90 | 180 | 270;

// ============================================================================
// 2. Multiboard & Board Configuration
// ============================================================================

/**
 * Standard Multiboard tile form factors.
 * - '8x8': 8 holes x 8 holes (200mm x 200mm standard KeepMaking tile)
 * - '4x4': 4 holes x 4 holes (100mm x 100mm compact tile)
 * - 'custom': user-defined hole dimensions
 */
export type TileSize = '8x8' | '6x6' | '4x4' | 'custom';

/**
 * Representation of an individual Multiboard tile placed in the board matrix.
 */
export interface TileDefinition {
  readonly id: string;
  readonly col: number; // 0-indexed column in the tile matrix
  readonly row: number; // 0-indexed row in the tile matrix
  readonly widthHoles: number; // typically 8 or 4
  readonly heightHoles: number; // typically 8 or 4
  readonly originHoleX: number; // starting hole index X on the board (col * widthHoles)
  readonly originHoleY: number; // starting hole index Y on the board (row * heightHoles)
  readonly type: TileSize;
}

export interface CustomCategory {
  readonly id: string;
  readonly name: string;
  readonly color: string; // hex string e.g. #F59E0B
}

/**
 * Configuration parameters defining the overall board layout and pitch.
 */
export interface BoardConfig {
  /** Number of tile columns across the board (default: 6) */
  readonly cols: number;
  /** Number of tile rows down the board (default: 3) */
  readonly rows: number;
  /** Number of octagon holes per tile column (default: 8) */
  readonly tileWidthHoles: number;
  /** Number of octagon holes per tile row (default: 8) */
  readonly tileHeightHoles: number;
  /** Distance in mm between centers of adjacent octagon holes (standard Multiboard: 25mm) */
  readonly holePitchMm: number;
  /** Optional custom desk width in mm */
  readonly customDeskWidthMm?: number;
  /** Optional custom desk height/depth in mm */
  readonly customDeskHeightMm?: number;
}

/**
 * Computed physical and discrete dimensions of the full board.
 */
export interface BoardDimensions {
  readonly totalCols: number;
  readonly totalRows: number;
  readonly totalHolesX: number; // cols * tileWidthHoles
  readonly totalHolesY: number; // rows * tileHeightHoles
  readonly totalWidthMm: number; // totalHolesX * holePitchMm
  readonly totalHeightMm: number; // totalHolesY * holePitchMm
  readonly customDeskWidthMm?: number;
  readonly customDeskHeightMm?: number;
}

// ============================================================================
// 3. Mounting Systems & Hardware
// ============================================================================

export type MountingCategory = 'underware' | 'multiboard' | 'surface';

export type MountingType =
  // A. Underware mounting (fully implemented)
  | 'threaded_snap'
  | 'direct_screw'
  // B. Multiboard mounting
  | 'multiconnect'
  | 'standard_snap' // planning only
  | 'multipoint_rail' // planning only
  // C. Surface mounting (planning only)
  | 'wood_screw'
  | 'adhesive'
  | 'magnetic';

export type ConnectorMode = 'auto' | 'manual';

export interface MountingOption {
  readonly id: MountingType;
  readonly name: string;
  readonly category: MountingCategory;
  readonly description: string;
  readonly isAvailable: boolean;
  readonly helperText: string;
  readonly defaultSparesPercent: number;
  readonly label: string;
  readonly hardwareName: string;
  readonly notes: string;
  readonly isImplemented: boolean;
}

export const MOUNTING_OPTIONS: readonly MountingOption[] = Object.freeze([
  {
    id: 'threaded_snap',
    name: 'Threaded Snap',
    label: 'Threaded Snap Multiboard',
    category: 'underware',
    description: 'Standard Underware mounting with threaded ring into Multiboard octagons.',
    hardwareName: 'snap connectors',
    isAvailable: true,
    isImplemented: true,
    helperText: 'Removable mounting into Multiboard octagonal holes. Minimum 2 + 10% spares recommended.',
    notes: 'Removable mounting into Multiboard octagonal holes. Includes +10% spare estimate.',
    defaultSparesPercent: 10,
  },
  {
    id: 'direct_screw',
    name: 'Direct Screw (M3/M4)',
    label: 'Direct Screw M3/M4',
    category: 'underware',
    description: 'Through-hole mechanical fastening with M3/M4 screw on heavy snap or t-nut.',
    hardwareName: 'M3/M4 screws',
    isAvailable: true,
    isImplemented: true,
    helperText: 'Maximum rigidity for heavy channels or high loads. Exact 1:1 count.',
    notes: 'Maximum rigidity for heavy channels or high loads. Exact 1:1 count (no spares).',
    defaultSparesPercent: 0,
  },
  {
    id: 'multiconnect',
    name: 'Multiconnect',
    label: 'Multiconnect Connector',
    category: 'multiboard',
    description: 'Standard Multiconnect dovetail mating system (David D).',
    hardwareName: 'multiconnect connectors',
    isAvailable: true,
    isImplemented: true,
    helperText: 'Quick-slide dovetail mating compatible with Multiconnect brackets and accessories.',
    notes: 'Quick-slide dovetail mating. Exact 1:1 count.',
    defaultSparesPercent: 0,
  },
  {
    id: 'standard_snap',
    name: 'Standard / Flush Snap',
    label: 'Standard / Flush Snap',
    category: 'multiboard',
    description: 'Smooth flush snap for minimal vertical profile.',
    hardwareName: 'flush snaps',
    isAvailable: false,
    isImplemented: false,
    helperText: 'Coming Soon — Low-profile push-fit snap.',
    notes: 'Coming Soon — Low-profile push-fit snap for minimal clearance.',
    defaultSparesPercent: 10,
  },
  {
    id: 'multipoint_rail',
    name: 'Multipoint Rail',
    label: 'Multipoint / Rail',
    category: 'multiboard',
    description: 'Continuous mounting along a linear guide or Multipoint rail.',
    hardwareName: 'multipoint rails',
    isAvailable: false,
    isImplemented: false,
    helperText: 'Coming Soon — Horizontal slide profile.',
    notes: 'Coming Soon — Continuous horizontal slide profile.',
    defaultSparesPercent: 0,
  },
  {
    id: 'wood_screw',
    name: 'Wood Screw',
    label: 'Direct Wood Screw',
    category: 'surface',
    description: 'Direct fastening to desk wood surface without Multiboard.',
    hardwareName: 'wood screws',
    isAvailable: false,
    isImplemented: false,
    helperText: 'Coming Soon — Perimeter mounting on solid wood desks.',
    notes: 'Coming Soon — Direct wood mounting without Multiboard tile.',
    defaultSparesPercent: 0,
  },
  {
    id: 'adhesive',
    name: 'Heavy Duty VHB Tape',
    label: 'Adhesive Strip / VHB',
    category: 'surface',
    description: '3M VHB structural double-sided tape for smooth/glass surfaces.',
    hardwareName: 'adhesive strips',
    isAvailable: false,
    isImplemented: false,
    helperText: 'Coming Soon — Non-destructive mounting for glass or metal desks.',
    notes: 'Coming Soon — Non-destructive adhesive mounting for smooth surfaces.',
    defaultSparesPercent: 0,
  },
  {
    id: 'magnetic',
    name: 'Magnetic Mount',
    label: 'Magnetic Insert',
    category: 'surface',
    description: 'Neodymium magnets embedded into snap sockets.',
    hardwareName: 'magnetic inserts',
    isAvailable: false,
    isImplemented: false,
    helperText: 'Coming Soon — Quick magnetic attach/detach for power strips or switches.',
    notes: 'Coming Soon — Quick magnetic attach/detach.',
    defaultSparesPercent: 0,
  },
]);

// ============================================================================
// 4. Channels & Cable Management Elements
// ============================================================================

/**
 * Supported cable channel geometry kinds:
 * - 'straight': Straight run (I-channel) of arbitrary integer length N
 * - 'corner': 90-degree turn (L-channel)
 * - 'junction': 3-way tee split (T-channel)
 * - 'cross': 4-way intersection (X-channel)
 * - 'curved': Smooth radial quarter-circle bend (radius R2, R3, R4, R5)
 * - 'y_split': 45-degree Y-branch fork
 * - 'diagonal': 45-degree dogleg / jog offset channel
 * - 'mitred': 90-degree square mitered corner
 */
export type ChannelKind =
  | 'straight'
  | 'corner'
  | 'junction'
  | 'cross'
  | 'curved'
  | 'y_split'
  | 'diagonal'
  | 'mitred'
  | 'spool'
  | 'socket_holder'
  | 'accessory';

/**
 * Definition of a user-customizable modular accessory (e.g. 6x3 "PRESA Tessan")
 */
export interface CustomAccessoryDefinition {
  readonly id: string;
  readonly name: string;
  readonly widthMU: number;
  readonly heightMU: number;
  readonly color?: string;
}

/**
 * Functional cable categorization for telemetry, coloring, and organization.
 * Supports built-in defaults or user-defined custom categories.
 */
export type ChannelCategory = string;

/**
 * Channel metadata and definition template.
 */
export interface ChannelTemplate {
  readonly kind: ChannelKind;
  readonly defaultLength?: number;
  readonly name: string;
  readonly description: string;
  readonly basePartNumber: string;
}

/**
 * A channel instance placed onto the Multiboard grid with full parametric controls.
 */
export interface PlacedChannel {
  readonly id: string;
  readonly kind: ChannelKind;
  /** Length in Multiboard Units (MU) for straight kind (e.g. 1 to 16) */
  readonly length?: number;
  /** Position of the channel's top-left anchor in hole grid coordinates (0-indexed) */
  readonly position: GridPoint;
  /** Clockwise rotation angle */
  readonly rotation: Rotation;
  /** Cable management category */
  readonly category: ChannelCategory;
  /** Optional user label or circuit identifier */
  readonly label?: string;
  /** Optional custom snap spacing override (number of units between snaps) */
  readonly customSnapSpacing?: number;

  // --- Parametric Extensions ---
  /** Width in Multiboard Units (MU), default: 1 (25mm) or 2 (50mm) */
  readonly widthUnits?: number;
  /** Height / profile depth in Multiboard Units (MU), default: 1 (25mm) or 2 (50mm) */
  readonly heightUnits?: number;
  /** Arm span in MU for corner L-channels (e.g. 2 for 2x2, 3 for 3x3) */
  readonly armSpanUnits?: number;
  /** Primary trunk span in MU for T-junctions (default: 3) */
  readonly trunkSpanUnits?: number;
  /** Branch span in MU for T-junctions (default: 2) */
  readonly branchSpanUnits?: number;
  /** Radial curve radius in MU for curved channels (e.g. 2, 3, 4, 5 MU = 50, 75, 100, 125mm) */
  readonly radiusUnits?: number;
  /** Arm A length in MU for mitred corner (e.g. 2 to 8 MU) */
  readonly mitreArmA?: number;
  /** Arm B length in MU for mitred corner (e.g. 2 to 8 MU) */
  readonly mitreArmB?: number;
  /** Lateral jog offset in MU for diagonal channels (e.g. 1 to 3 MU) */
  readonly offsetUnits?: number;
  /** Explicit diagonal span vector (dx, dy in MU) for direct point-to-point diagonal channels */
  readonly diagonalVector?: { readonly dx: number; readonly dy: number };
  /** Trunk length in MU for Y-split channels (default: 2) */
  readonly yTrunkUnits?: number;
  /** Branch length in MU for Y-split channels (default: 2) */
  readonly yBranchUnits?: number;

  // --- Mounting Extensions ---
  /** Chosen mounting hardware system */
  readonly mountingType?: MountingType;
  /** Attachment strategy: 'auto' (algorithmic) or 'manual' (custom selected points) */
  readonly connectorMode?: 'auto' | 'manual';
  /** Explicit attachment points when connectorMode is 'manual' (in local coordinates relative to channel origin) */
  readonly customMountPoints?: readonly GridPoint[];
}

/**
 * Proposal generated by the Measure & Create Channel tool.
 */
export interface ChannelProposal {
  readonly pointA: GridPoint;
  readonly pointB: GridPoint;
  readonly spanMU: number;
  readonly spanMm: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly alignment: 'horizontal' | 'vertical' | 'diagonal';
  readonly suggestedKind: ChannelKind;
  readonly suggestedLength: number;
  readonly suggestedRotation: Rotation;
  readonly suggestedPosition: GridPoint;
  readonly diagonalVector?: { readonly dx: number; readonly dy: number };
  readonly widthUnits: number;
  readonly heightUnits: number;
  readonly mountingType: MountingType;
  readonly minMounts: number;
  readonly recommendedMounts: number;
  readonly isDirectlyCompatible: boolean;
  readonly statusNote?: string;
  readonly isValidPlacement: boolean;
  readonly channel?: PlacedChannel;
  readonly distanceUnits?: number;
  readonly distanceMm?: number;
  readonly recommendedKind?: ChannelKind;
  readonly recommendedLength?: number;
  readonly hasObstacles?: boolean;
}

/**
 * Calculated footprint of a placed channel, listing all occupied discrete grid cells.
 */
export interface ChannelFootprint {
  readonly channelId: string;
  readonly cells: readonly GridPoint[];
  readonly bounds: BoundingBox;
}

// ============================================================================
// 5. Snap Connectors & Mounting Points
// ============================================================================

/**
 * Calculated attachment point where a Multiboard snap connector inserts into an octagon hole.
 */
export interface SnapPoint {
  /** Absolute grid X coordinate on the board */
  readonly x: number;
  /** Absolute grid Y coordinate on the board */
  readonly y: number;
  /** ID of the channel this snap attaches to */
  readonly channelId?: string;
  /** Local index of this snap on the channel (0-indexed) */
  readonly localIndex: number;
  /** Whether this snap is located at a channel terminal/port end */
  readonly isTerminal: boolean;
  /** Associated mounting hardware type */
  readonly mountingType?: MountingType;
}

// ============================================================================
// 6. Collision, Bounds, and Placement Validity
// ============================================================================

/**
 * Result of collision detection across multiple channels on the board.
 */
export interface CollisionResult {
  readonly hasCollision: boolean;
  /** Pairs of channel IDs that collide with each other */
  readonly collidingChannelIds: readonly [string, string][];
  /** Grid cells that are occupied by multiple channels simultaneously */
  readonly overlapCells: readonly GridPoint[];
}

/**
 * Comprehensive placement check for a candidate channel.
 */
export interface PlacementValidity {
  /** True if the candidate is fully inside bounds and does not collide with any other channel */
  readonly isValid: boolean;
  /** True if one or more occupied cells fall outside [0..totalHolesX-1, 0..totalHolesY-1] */
  readonly isOutOfBounds: boolean;
  readonly outOfBoundsCells: readonly GridPoint[];
  /** True if one or more occupied cells collide with existing channels */
  readonly hasCollisions: boolean;
  readonly collidingWithIds: readonly string[];
  readonly collidingCells: readonly GridPoint[];
}

// ============================================================================
// 6. Board State
// ============================================================================

/**
 * Complete immutable state representation for the SVG planner canvas.
 */
export interface BoardState {
  readonly config: BoardConfig;
  readonly tiles: readonly TileDefinition[];
  readonly channels: readonly PlacedChannel[];
  readonly selectedChannelId?: string | null;
}

export type BOMItemCategory = 'tiles' | 'channels' | 'snaps' | 'mounting' | 'hardware';

export interface MountDetail {
  readonly channelId: string;
  readonly channelName: string;
  readonly channelKind: ChannelKind;
  readonly mountingType: MountingType;
  readonly mountCount: number;
}

/**
 * Line item in the generated Bill of Materials.
 */
export interface BOMItem {
  readonly id: string;
  readonly name: string;
  readonly partNumber: string;
  readonly category: BOMItemCategory;
  readonly categoryLabel?: string;
  readonly quantity: number;
  readonly unit: string; // e.g., 'pcs', 'tiles'
  readonly description: string;
  readonly snapsRequired?: number;
  readonly specs?: Record<string, string | number>;
}

/**
 * Summary telemetry metrics for the BOM.
 */
export interface BOMSummary {
  readonly totalTiles: number;
  readonly tileCountByType: Record<string, number>;
  readonly totalChannels: number;
  readonly totalChannelLengthUnits: number;
  readonly totalChannelLengthMm: number;
  readonly channelsByCategory: Record<ChannelCategory, number>;
  readonly channelsByKind: Record<ChannelKind, number>;
  readonly baseSnapCount: number;
  readonly spareSnapPercent: number; // e.g. 10
  readonly spareSnapCount: number; // ceil(baseSnapCount * 0.10)
  readonly totalSnapCountWithSpares: number; // baseSnapCount + spareSnapCount
  readonly totalMounts: number;
  readonly mountCountsByType: Record<MountingType, { base: number; spare: number; total: number }>;
  readonly mountDetails: readonly MountDetail[];
}

/**
 * Complete Bill of Materials document for printing / ordering.
 */
export interface BillOfMaterials {
  readonly generatedAt: string; // ISO 8601 string
  readonly boardDimensions: {
    readonly cols: number;
    readonly rows: number;
    readonly totalHolesX: number;
    readonly totalHolesY: number;
    readonly totalWidthMm: number;
    readonly totalHeightMm: number;
    readonly holePitchMm: number;
  };
  readonly items: readonly BOMItem[];
  readonly summary: BOMSummary;
}
