/**
 * Underplan Geometry & Interaction Logic
 * Pure functional geometric calculations for Multiboard tiles, channels,
 * footprints, rotations, collision detection, snapping, and boundaries.
 */

import type {
  BoardConfig,
  BoardDimensions,
  BoundingBox,
  ChannelFootprint,
  ChannelKind,
  ChannelProposal,
  CollisionResult,
  GridPoint,
  MountingType,
  PlacementValidity,
  PlacedChannel,
  Rotation,
  SnapPoint,
  TileDefinition,
  WorldPoint,
} from './types';

// ============================================================================
// 1. Constants & Defaults
// ============================================================================

/**
 * Standard default Underplan configuration:
 * 6 columns x 3 rows of standard 8x8 Multiboard tiles (48x24 holes, 1200mm x 600mm).
 * Standard KeepMaking Multiboard pitch: 25mm center-to-center.
 */
export const DEFAULT_BOARD_CONFIG: Readonly<BoardConfig> = Object.freeze({
  cols: 6,
  rows: 3,
  tileWidthHoles: 8,
  tileHeightHoles: 8,
  holePitchMm: 25,
});

/**
 * Valid discrete rotation angles.
 */
export const VALID_ROTATIONS: readonly Rotation[] = Object.freeze([0, 90, 180, 270]);

// ============================================================================
// 2. Board Dimensions & Tile Matrix
// ============================================================================

/**
 * Computes the discrete hole dimensions and physical millimeter dimensions of a board.
 */
export function calculateBoardDimensions(config: BoardConfig = DEFAULT_BOARD_CONFIG): BoardDimensions {
  const totalCols = Math.max(1, Math.floor(config.cols));
  const totalRows = Math.max(1, Math.floor(config.rows));
  const tileWidthHoles = Math.max(1, Math.floor(config.tileWidthHoles));
  const tileHeightHoles = Math.max(1, Math.floor(config.tileHeightHoles));
  const holePitchMm = Math.max(0.1, config.holePitchMm);

  const totalHolesX = totalCols * tileWidthHoles;
  const totalHolesY = totalRows * tileHeightHoles;
  const totalWidthMm = totalHolesX * holePitchMm;
  const totalHeightMm = totalHolesY * holePitchMm;

  return {
    totalCols,
    totalRows,
    totalHolesX,
    totalHolesY,
    totalWidthMm,
    totalHeightMm,
    customDeskWidthMm: config.customDeskWidthMm,
    customDeskHeightMm: config.customDeskHeightMm,
  };
}

/**
 * Multiboard modular tile options (number of holes per side).
 * Standard KeepMaking catalog modules:
 * - 8: 8x8 holes (200mm x 200mm) - Core Standard
 * - 6: 6x6 holes (150mm x 150mm) - Mid Core
 * - 4: 4x4 holes (100mm x 100mm) - Compact Core
 */
export const MULTIBOARD_MODULES = [8, 6, 4] as const;
export type MultiboardModuleSize = typeof MULTIBOARD_MODULES[number];

export interface MultiboardTilingResult {
  readonly moduleSize: MultiboardModuleSize;
  readonly cols: number;
  readonly rows: number;
  readonly totalTiles: number;
  readonly totalHolesX: number;
  readonly totalHolesY: number;
  readonly actualWidthMm: number;
  readonly actualHeightMm: number;
  readonly isExactMatch: boolean;
}

/**
 * Calculates the authentic Multiboard modular grid configuration for given desk dimensions.
 * Evaluates candidate Multiboard modules (8x8, 6x6, 4x4).
 * If forcedModule is specified, uses that module.
 * If auto, picks the module that matches the dimensions evenly (zero remainder)
 * prioritizing larger modules (8 > 6 > 4) for structural rigidity and fewer pieces.
 * 
 * Example: 900mm x 300mm -> 6x6 module gives 6 cols x 2 rows = 12 modules of 6x6 (exact match)!
 */
export function findBestMultiboardModule(
  deskWidthMm: number,
  deskHeightMm: number,
  forcedModule?: MultiboardModuleSize | 'auto',
  holePitchMm: number = 25
): MultiboardTilingResult {
  const safeW = Math.max(100, Math.round(deskWidthMm));
  const safeH = Math.max(100, Math.round(deskHeightMm));

  if (forcedModule && forcedModule !== 'auto' && (MULTIBOARD_MODULES as readonly number[]).includes(forcedModule)) {
    const tileSizeMm = forcedModule * holePitchMm;
    const cols = Math.max(1, Math.min(24, Math.round(safeW / tileSizeMm)));
    const rows = Math.max(1, Math.min(16, Math.round(safeH / tileSizeMm)));
    const totalTiles = cols * rows;
    const totalHolesX = cols * forcedModule;
    const totalHolesY = rows * forcedModule;
    const actualWidthMm = totalHolesX * holePitchMm;
    const actualHeightMm = totalHolesY * holePitchMm;
    const isExactMatch = safeW % tileSizeMm === 0 && safeH % tileSizeMm === 0;

    return {
      moduleSize: forcedModule,
      cols,
      rows,
      totalTiles,
      totalHolesX,
      totalHolesY,
      actualWidthMm,
      actualHeightMm,
      isExactMatch,
    };
  }

  // Auto mode: evaluate modules [8, 6, 4]
  let bestCandidate: MultiboardTilingResult | null = null;
  let lowestError = Infinity;

  for (const mod of MULTIBOARD_MODULES) {
    const tileSizeMm = mod * holePitchMm;
    const remW = safeW % tileSizeMm;
    const remH = safeH % tileSizeMm;
    const cols = Math.max(1, Math.min(24, Math.round(safeW / tileSizeMm)));
    const rows = Math.max(1, Math.min(16, Math.round(safeH / tileSizeMm)));
    const totalTiles = cols * rows;
    const totalHolesX = cols * mod;
    const totalHolesY = rows * mod;
    const actualWidthMm = totalHolesX * holePitchMm;
    const actualHeightMm = totalHolesY * holePitchMm;
    const isExactMatch = remW === 0 && remH === 0;

    // Exact matches always win; if multiple are exact, largest module wins (8 > 6 > 4)
    if (isExactMatch) {
      return {
        moduleSize: mod,
        cols,
        rows,
        totalTiles,
        totalHolesX,
        totalHolesY,
        actualWidthMm,
        actualHeightMm,
        isExactMatch: true,
      };
    }

    const error = Math.abs(safeW - actualWidthMm) + Math.abs(safeH - actualHeightMm);
    if (error < lowestError) {
      lowestError = error;
      bestCandidate = {
        moduleSize: mod,
        cols,
        rows,
        totalTiles,
        totalHolesX,
        totalHolesY,
        actualWidthMm,
        actualHeightMm,
        isExactMatch: false,
      };
    }
  }

  return bestCandidate ?? {
    moduleSize: 8,
    cols: Math.max(1, Math.round(safeW / 200)),
    rows: Math.max(1, Math.round(safeH / 200)),
    totalTiles: Math.max(1, Math.round(safeW / 200)) * Math.max(1, Math.round(safeH / 200)),
    totalHolesX: Math.max(1, Math.round(safeW / 200)) * 8,
    totalHolesY: Math.max(1, Math.round(safeH / 200)) * 8,
    actualWidthMm: Math.max(1, Math.round(safeW / 200)) * 200,
    actualHeightMm: Math.max(1, Math.round(safeH / 200)) * 200,
    isExactMatch: false,
  };
}

/**
 * Calculates the best-fit Multiboard tile columns and rows for a user-specified desk dimension (in mm).
 */
export function computeTilingFromDeskDimensions(
  deskWidthMm: number,
  deskHeightMm: number,
  holePitchMm: number = 25,
  tileWidthHoles: number = 8,
  tileHeightHoles: number = 8
): { cols: number; rows: number } {
  const tileWidthMm = tileWidthHoles * holePitchMm;
  const tileHeightMm = tileHeightHoles * holePitchMm;
  const cols = Math.max(1, Math.min(24, Math.round(deskWidthMm / tileWidthMm)));
  const rows = Math.max(1, Math.min(16, Math.round(deskHeightMm / tileHeightMm)));
  return { cols, rows };
}

/**
 * Generates the full 2D matrix of Multiboard tiles for a given board configuration.
 * Each tile specifies its matrix coordinates (col, row), absolute hole origins, and tile type.
 */
export function generateTileMatrix(config: BoardConfig = DEFAULT_BOARD_CONFIG): readonly TileDefinition[] {
  const tiles: TileDefinition[] = [];
  const { cols, rows, tileWidthHoles, tileHeightHoles } = config;

  const tileType = tileWidthHoles === 8 && tileHeightHoles === 8
    ? '8x8'
    : tileWidthHoles === 6 && tileHeightHoles === 6
      ? '6x6'
      : tileWidthHoles === 4 && tileHeightHoles === 4
        ? '4x4'
        : 'custom';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        id: `tile-${c}-${r}`,
        col: c,
        row: r,
        widthHoles: tileWidthHoles,
        heightHoles: tileHeightHoles,
        originHoleX: c * tileWidthHoles,
        originHoleY: r * tileHeightHoles,
        type: tileType,
      });
    }
  }

  return Object.freeze(tiles);
}

/**
 * Converts an absolute board hole coordinate (x, y) into tile matrix coordinates
 * and local tile hole coordinates.
 */
export function holeToTileCoord(
  point: GridPoint,
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): { tileCol: number; tileRow: number; localHoleX: number; localHoleY: number; isValid: boolean } {
  const { tileWidthHoles, tileHeightHoles } = config;
  const dims = calculateBoardDimensions(config);

  const tileCol = Math.floor(point.x / tileWidthHoles);
  const tileRow = Math.floor(point.y / tileHeightHoles);
  const localHoleX = ((point.x % tileWidthHoles) + tileWidthHoles) % tileWidthHoles;
  const localHoleY = ((point.y % tileHeightHoles) + tileHeightHoles) % tileHeightHoles;

  const isValid =
    point.x >= 0 && point.x < dims.totalHolesX &&
    point.y >= 0 && point.y < dims.totalHolesY;

  return { tileCol, tileRow, localHoleX, localHoleY, isValid };
}

/**
 * Returns the top-left hole origin of a specific tile in the matrix.
 */
export function tileCoordToHoleOrigin(
  tileCol: number,
  tileRow: number,
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): GridPoint {
  return {
    x: tileCol * config.tileWidthHoles,
    y: tileRow * config.tileHeightHoles,
  };
}

// ============================================================================
// 3. Coordinate Snapping & Conversions
// ============================================================================

/**
 * Converts a discrete grid hole coordinate to physical world units (mm) or SVG canvas units.
 */
export function gridToWorld(point: GridPoint, pitchMm: number = 25): WorldPoint {
  return {
    x: point.x * pitchMm,
    y: point.y * pitchMm,
  };
}

/**
 * Converts continuous physical coordinates (mm or SVG pixels) to the nearest discrete grid hole.
 */
export function worldToGrid(point: WorldPoint, pitchMm: number = 25): GridPoint {
  const safePitch = pitchMm > 0 ? pitchMm : 25;
  return {
    x: Math.round(point.x / safePitch),
    y: Math.round(point.y / safePitch),
  };
}

/**
 * Snaps arbitrary continuous coordinates to the nearest discrete hole center in world units.
 */
export function snapToGrid(point: WorldPoint, pitchMm: number = 25): WorldPoint {
  const safePitch = pitchMm > 0 ? pitchMm : 25;
  return {
    x: Math.round(point.x / safePitch) * safePitch,
    y: Math.round(point.y / safePitch) * safePitch,
  };
}

/**
 * Clamps a grid coordinate within the board boundaries.
 */
export function clampGridPoint(point: GridPoint, config: BoardConfig = DEFAULT_BOARD_CONFIG): GridPoint {
  const dims = calculateBoardDimensions(config);
  return {
    x: Math.max(0, Math.min(dims.totalHolesX - 1, point.x)),
    y: Math.max(0, Math.min(dims.totalHolesY - 1, point.y)),
  };
}

// ============================================================================
// 4. Rotations & Footprint Calculations
// ============================================================================

/**
 * Rotates a discrete coordinate clockwise within a bounding box of size (sourceWidth x sourceHeight).
 *
 * Mathematical Transformation Matrix for Clockwise Rotation in SVG (Y-down):
 * - 0°:   (x, y)
 * - 90°:  (sourceHeight - 1 - y, x)             [New size: sourceHeight x sourceWidth]
 * - 180°: (sourceWidth - 1 - x, sourceHeight - 1 - y) [New size: sourceWidth x sourceHeight]
 * - 270°: (y, sourceWidth - 1 - x)             [New size: sourceHeight x sourceWidth]
 */
export function rotateLocalCell(
  cell: GridPoint,
  sourceWidth: number,
  sourceHeight: number,
  rotation: Rotation
): GridPoint {
  switch (rotation) {
    case 0:
      return { x: cell.x, y: cell.y };
    case 90:
      return { x: sourceHeight - 1 - cell.y, y: cell.x };
    case 180:
      return { x: sourceWidth - 1 - cell.x, y: sourceHeight - 1 - cell.y };
    case 270:
      return { x: cell.y, y: sourceWidth - 1 - cell.x };
    default: {
      const normalizedRot = ((((rotation as number) % 360) + 360) % 360) as Rotation;
      if (normalizedRot === 0 || normalizedRot === 90 || normalizedRot === 180 || normalizedRot === 270) {
        return rotateLocalCell(cell, sourceWidth, sourceHeight, normalizedRot);
      }
      return { x: cell.x, y: cell.y };
    }
  }
}

/**
 * Rotates a continuous coordinate point within a bounding box of size (sourceWidth x sourceHeight).
 */
export function rotateLocalContinuousPoint(
  pt: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
  rotation: Rotation
): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x: pt.x, y: pt.y };
    case 90:
      return { x: sourceHeight - 1 - pt.y, y: pt.x };
    case 180:
      return { x: sourceWidth - 1 - pt.x, y: sourceHeight - 1 - pt.y };
    case 270:
      return { x: pt.y, y: sourceWidth - 1 - pt.x };
    default:
      return { x: pt.x, y: pt.y };
  }
}

/**
 * Internal helper to retrieve the canonical unrotated (0°) cells, width, and height for a channel kind.
 */
/**
 * Internal helper to retrieve the canonical unrotated (0°) cells, width, and height for a channel kind.
 * Supports full parametric specifications for Underware components in Multiboard Units (MU).
 */
export function getCanonicalChannelSpec(
  kind: ChannelKind,
  length?: number,
  widthUnits: number = 1,
  armSpanUnits: number = 2,
  trunkSpanUnits: number = 3,
  branchSpanUnits: number = 2,
  radiusUnits: number = 2,
  mitreArmA: number = 2,
  mitreArmB: number = 2,
  offsetUnits: number = 1,
  yTrunkUnits: number = 2,
  _yBranchUnits: number = 2,
  diagonalVector?: { dx: number; dy: number }
): { cells: readonly GridPoint[]; width: number; height: number; snapIndices: readonly GridPoint[] } {
  switch (kind) {
    case 'straight': {
      const len = Math.max(1, Math.floor(length ?? 2));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < len; x++) {
          cells.push({ x, y });
        }
      }

      // Snap points for straight channel (in MU):
      // Scaled across all parallel width tracks (e.g. y = 0 and y = 1 for 2 MU width)
      const snapPoints: GridPoint[] = [];
      for (let y = 0; y < w; y++) {
        if (len === 1) {
          snapPoints.push({ x: 0, y });
        } else if (len === 2) {
          snapPoints.push({ x: 0, y }, { x: 1, y });
        } else {
          snapPoints.push({ x: 0, y });
          for (let i = 2; i < len - 1; i += 2) {
            snapPoints.push({ x: i, y });
          }
          snapPoints.push({ x: len - 1, y });
        }
      }

      return {
        cells: Object.freeze(cells),
        width: len,
        height: w,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'corner': {
      // 90° Turn (L-channel) with parametric arm span (2x2, 3x3, 4x4 MU) and scalable width (1 or 2 MU):
      const span = Math.max(2, Math.min(6, Math.floor(armSpanUnits || 2)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      // Vertical arm from (0, 0) down to (w - 1, span - 1)
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < span; y++) {
          cells.push({ x, y });
        }
      }
      // Horizontal arm from (w, span - w) to (span - 1, span - 1)
      for (let x = w; x < span; x++) {
        for (let y = span - w; y < span; y++) {
          cells.push({ x, y });
        }
      }

      // Mount snaps at terminal ports scaled across all width tracks
      const snapPoints: GridPoint[] = [];
      // Top port (y = 0):
      for (let x = 0; x < w; x++) {
        snapPoints.push({ x, y: 0 });
      }
      // Right port (x = span - 1):
      for (let y = span - w; y < span; y++) {
        snapPoints.push({ x: span - 1, y });
      }
      // Large span elbow support snaps
      if (span >= 4) {
        for (let x = 0; x < w; x++) {
          snapPoints.push({ x, y: span - 1 });
        }
      }

      return {
        cells: Object.freeze(cells),
        width: span,
        height: span,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'junction': {
      // 3-way Split (T-channel) with parametric trunk, branch, and width (1 or 2 MU):
      const trunk = Math.max(3, Math.min(8, Math.floor(trunkSpanUnits || 3)));
      const branch = Math.max(2, Math.min(6, Math.floor(branchSpanUnits || 2)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      // Top horizontal trunk
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < trunk; x++) {
          cells.push({ x, y });
        }
      }
      // Center branch extending down
      const centerX = Math.floor((trunk - w) / 2);
      for (let y = w; y < branch; y++) {
        for (let x = centerX; x < centerX + w; x++) {
          cells.push({ x, y });
        }
      }

      // Mount snaps at the 3 terminal ports across all width tracks
      const snapPoints: GridPoint[] = [];
      // Left port:
      for (let y = 0; y < w; y++) {
        snapPoints.push({ x: 0, y });
      }
      // Right port:
      for (let y = 0; y < w; y++) {
        snapPoints.push({ x: trunk - 1, y });
      }
      // Center branch bottom port:
      for (let x = centerX; x < centerX + w; x++) {
        snapPoints.push({ x, y: branch - 1 });
      }
      if (trunk >= 5) {
        for (let y = 0; y < w; y++) {
          snapPoints.push({ x: centerX, y });
        }
      }

      return {
        cells: Object.freeze(cells),
        width: trunk,
        height: branch,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'cross': {
      // 4-way Intersection (X-channel):
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      if (w === 1) {
        const cells: GridPoint[] = [
          { x: 1, y: 0 }, // North port
          { x: 0, y: 1 }, // West port
          { x: 1, y: 1 }, // Center crossing
          { x: 2, y: 1 }, // East port
          { x: 1, y: 2 }, // South port
        ];
        const snapPoints: GridPoint[] = [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ];
        return {
          cells: Object.freeze(cells),
          width: 3,
          height: 3,
          snapIndices: Object.freeze(snapPoints),
        };
      } else {
        // 4x4 footprint for 2 MU wide cross intersection
        const cells: GridPoint[] = [];
        for (let y = 0; y < 4; y++) {
          cells.push({ x: 1, y }, { x: 2, y });
        }
        for (const x of [0, 3]) {
          cells.push({ x, y: 1 }, { x, y: 2 });
        }
        const snapPoints: GridPoint[] = [
          { x: 1, y: 0 }, { x: 2, y: 0 }, // North
          { x: 0, y: 1 }, { x: 0, y: 2 }, // West
          { x: 3, y: 1 }, { x: 3, y: 2 }, // East
          { x: 1, y: 3 }, { x: 2, y: 3 }, // South
        ];
        return {
          cells: Object.freeze(cells),
          width: 4,
          height: 4,
          snapIndices: Object.freeze(snapPoints),
        };
      }
    }

    case 'curved': {
      // Smooth radial quarter-circle bend (radius 2, 3, 4, 5 MU) with scalable width:
      const radius = Math.max(2, Math.min(8, Math.floor(radiusUnits || 2)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      const visited = new Set<string>();

      // Sample quarter-circle arc from (0, 0) bending to (radius - 1, radius - 1)
      const steps = Math.max(20, radius * 8);
      for (let i = 0; i <= steps; i++) {
        const phi = (i / steps) * (Math.PI / 2);
        const cx = (radius - 1) * (1 - Math.cos(phi));
        const cy = (radius - 1) * Math.sin(phi);
        for (let dw = 0; dw < w; dw++) {
          const x = Math.min(radius - 1, Math.max(0, Math.round(cx + dw * Math.cos(phi))));
          const y = Math.min(radius - 1, Math.max(0, Math.round(cy - dw * Math.sin(phi))));
          const key = `${x},${y}`;
          if (!visited.has(key)) {
            visited.add(key);
            cells.push({ x, y });
          }
        }
      }

      // Terminal snap points across all width tracks at both ends
      const snapPoints: GridPoint[] = [];
      for (let dw = 0; dw < w; dw++) {
        snapPoints.push({ x: dw, y: 0 });
        snapPoints.push({ x: radius - 1, y: radius - 1 - dw });
      }
      if (radius >= 4) {
        const midIdx = Math.floor(cells.length / 2);
        if (cells[midIdx]) {
          snapPoints.push(cells[midIdx]);
        }
      }

      return {
        cells: Object.freeze(cells),
        width: radius,
        height: radius,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'y_split': {
      // 45° Y-junction fork: 2 branches at top converging into trunk downwards
      const trunk = Math.max(1, Math.min(6, Math.floor(yTrunkUnits || 2)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      const snapPoints: GridPoint[] = [];

      if (w === 1) {
        // Left branch port (1 MU wide at x=0)
        cells.push({ x: 0, y: 0 });
        // Right branch port (1 MU wide at x=2)
        cells.push({ x: 2, y: 0 });
        // Central junction point (1 MU wide at x=1)
        cells.push({ x: 1, y: 1 });

        // Trunk extending downwards (1 MU wide at x=1)
        for (let t = 1; t <= trunk; t++) {
          cells.push({ x: 1, y: 1 + t });
        }

        const totalH = 2 + trunk;
        snapPoints.push(
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 1, y: totalH - 1 }
        );

        return {
          cells: Object.freeze(cells),
          width: 3,
          height: totalH,
          snapIndices: Object.freeze(snapPoints),
        };
      } else {
        // w === 2: Each branch and the trunk are 2 MU wide, snapping to dual parallel holes
        // Left branch: x in [0, 1]
        // Trunk: x in [2, 3]
        // Right branch: x in [4, 5]
        // Total width = 6 MU

        // Row 0: Top inlet mouth entries
        cells.push({ x: 0, y: 0 }, { x: 1, y: 0 });
        cells.push({ x: 4, y: 0 }, { x: 5, y: 0 });

        // Row 1: Diagonal fork runs converging toward trunk
        cells.push({ x: 1, y: 1 }, { x: 2, y: 1 });
        cells.push({ x: 3, y: 1 }, { x: 4, y: 1 });

        // Row 2: Central junction top of trunk
        cells.push({ x: 2, y: 2 }, { x: 3, y: 2 });

        // Trunk extending downwards (2 MU wide at x in [2, 3])
        for (let t = 1; t <= trunk; t++) {
          cells.push({ x: 2, y: 2 + t }, { x: 3, y: 2 + t });
        }

        const totalH = 3 + trunk;
        // Mount snaps at terminal ports (2 snaps per 2 MU port):
        // Left mouth:
        snapPoints.push({ x: 0, y: 0 }, { x: 1, y: 0 });
        // Right mouth:
        snapPoints.push({ x: 4, y: 0 }, { x: 5, y: 0 });
        // Trunk bottom:
        snapPoints.push({ x: 2, y: totalH - 1 }, { x: 3, y: totalH - 1 });

        return {
          cells: Object.freeze(cells),
          width: 6,
          height: totalH,
          snapIndices: Object.freeze(snapPoints),
        };
      }
    }

    case 'diagonal': {
      // If direct point-to-point diagonal vector is specified (e.g. from pen measure tool):
      if (diagonalVector) {
        const { dx, dy } = diagonalVector;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const steps = Math.max(1, Math.max(absDx, absDy));
        const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));

        const minLocalX = Math.min(0, dx);
        const minLocalY = Math.min(0, dy);
        const startX = -minLocalX;
        const startY = -minLocalY;
        const endX = dx - minLocalX;
        const endY = dy - minLocalY;

        const cells: GridPoint[] = [];
        const visited = new Set<string>();

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.round(startX + t * (endX - startX));
          const cy = Math.round(startY + t * (endY - startY));

          for (let dw = 0; dw < w; dw++) {
            const px = cx + (absDy >= absDx ? dw : 0);
            const py = cy + (absDx > absDy ? dw : 0);
            const key = `${px},${py}`;
            if (!visited.has(key)) {
              visited.add(key);
              cells.push({ x: px, y: py });
            }
          }
        }

        const snapPoints: GridPoint[] = [];
        for (let dw = 0; dw < w; dw++) {
          const sx = startX + (absDy >= absDx ? dw : 0);
          const sy = startY + (absDx > absDy ? dw : 0);
          const ex = endX + (absDy >= absDx ? dw : 0);
          const ey = endY + (absDx > absDy ? dw : 0);
          snapPoints.push({ x: sx, y: sy });
          snapPoints.push({ x: ex, y: ey });
        }

        if (steps >= 4) {
          const midT = 0.5;
          const mx = Math.round(startX + midT * (endX - startX));
          const my = Math.round(startY + midT * (endY - startY));
          for (let dw = 0; dw < w; dw++) {
            snapPoints.push({
              x: mx + (absDy >= absDx ? dw : 0),
              y: my + (absDx > absDy ? dw : 0),
            });
          }
        }

        return {
          cells: Object.freeze(cells),
          width: absDx + w,
          height: absDy + w,
          snapIndices: Object.freeze(snapPoints),
        };
      }

      // Existing 45° jog/offset channel: shifts lateral position by offsetUnits over length MU
      const len = Math.max(2, Math.min(10, Math.floor(length ?? 3)));
      const offset = Math.max(1, Math.min(4, Math.floor(offsetUnits || 1)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];
      const midX = Math.floor(len / 2);

      for (let dw = 0; dw < w; dw++) {
        for (let x = 0; x < len; x++) {
          if (x < midX) {
            cells.push({ x, y: dw });
          } else if (x === midX) {
            for (let y = 0; y <= offset; y++) {
              cells.push({ x, y: y + dw });
            }
          } else {
            cells.push({ x, y: offset + dw });
          }
        }
      }

      const snapPoints: GridPoint[] = [];
      for (let dw = 0; dw < w; dw++) {
        snapPoints.push({ x: 0, y: dw });
        snapPoints.push({ x: len - 1, y: offset + dw });
      }
      if (len >= 5) {
        for (let dw = 0; dw < w; dw++) {
          snapPoints.push({ x: midX, y: dw });
        }
      }

      return {
        cells: Object.freeze(cells),
        width: len,
        height: offset + w,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'mitred': {
      // 90° mitered corner with distinct 45° seam and scalable width (1 or 2 MU):
      const armA = Math.max(2, Math.min(8, Math.floor(mitreArmA || 2)));
      const armB = Math.max(2, Math.min(8, Math.floor(mitreArmB || 2)));
      const w = Math.max(1, Math.min(2, Math.floor(widthUnits || 1)));
      const cells: GridPoint[] = [];

      // Vertical arm B from (0, 0) down to (w - 1, armB - 1)
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < armB; y++) {
          cells.push({ x, y });
        }
      }
      // Horizontal arm A from (w, armB - w) to (armA - 1, armB - 1)
      for (let x = w; x < armA; x++) {
        for (let y = armB - w; y < armB; y++) {
          cells.push({ x, y });
        }
      }

      const snapPoints: GridPoint[] = [];
      for (let x = 0; x < w; x++) {
        snapPoints.push({ x, y: 0 });
      }
      for (let y = armB - w; y < armB; y++) {
        snapPoints.push({ x: armA - 1, y });
      }
      if (armA >= 4 || armB >= 4) {
        for (let x = 0; x < w; x++) {
          snapPoints.push({ x, y: armB - 1 });
        }
      }

      return {
        cells: Object.freeze(cells),
        width: armA,
        height: armB,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'spool': {
      // Underware Cable Spool 3x6 MU (75x150 mm)
      const w = 3;
      const h = 6;
      const cells: GridPoint[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          cells.push({ x, y });
        }
      }
      // 4 corner snap points
      const snapPoints: GridPoint[] = [
        { x: 0, y: 0 },
        { x: w - 1, y: 0 },
        { x: 0, y: h - 1 },
        { x: w - 1, y: h - 1 },
      ];
      return {
        cells: Object.freeze(cells),
        width: w,
        height: h,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'socket_holder': {
      // Tessan USB Multi-Socket Holder 6x6 MU (150x150 mm)
      const size = 6;
      const cells: GridPoint[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          cells.push({ x, y });
        }
      }
      // 4 corner snap points
      const snapPoints: GridPoint[] = [
        { x: 0, y: 0 },
        { x: size - 1, y: 0 },
        { x: 0, y: size - 1 },
        { x: size - 1, y: size - 1 },
      ];
      return {
        cells: Object.freeze(cells),
        width: size,
        height: size,
        snapIndices: Object.freeze(snapPoints),
      };
    }

    case 'accessory': {
      // User-defined custom modular accessory of size W x H MU (e.g. 6x3, 4x2, etc.)
      const w = Math.max(1, Math.floor(widthUnits || 6));
      const h = Math.max(1, Math.floor(length || 3));
      const cells: GridPoint[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          cells.push({ x, y });
        }
      }
      // 4 corner snaps (or fewer if 1x1)
      const snapPoints: GridPoint[] = [];
      if (w === 1 && h === 1) {
        snapPoints.push({ x: 0, y: 0 });
      } else {
        snapPoints.push({ x: 0, y: 0 });
        if (w > 1) snapPoints.push({ x: w - 1, y: 0 });
        if (h > 1) snapPoints.push({ x: 0, y: h - 1 });
        if (w > 1 && h > 1) snapPoints.push({ x: w - 1, y: h - 1 });
      }
      return {
        cells: Object.freeze(cells),
        width: w,
        height: h,
        snapIndices: Object.freeze(snapPoints),
      };
    }
  }
}

/**
 * Returns the local occupied grid cells for a channel kind, length, and rotation,
 * relative to the channel's top-left origin (0, 0).
 */
export function getLocalFootprint(
  kind: ChannelKind,
  length?: number,
  rotation: Rotation = 0,
  widthUnits?: number,
  armSpanUnits?: number,
  trunkSpanUnits?: number,
  branchSpanUnits?: number,
  radiusUnits?: number,
  mitreArmA?: number,
  mitreArmB?: number,
  offsetUnits?: number,
  yTrunkUnits?: number,
  yBranchUnits?: number,
  diagonalVector?: { dx: number; dy: number }
): readonly GridPoint[] {
  const spec = getCanonicalChannelSpec(
    kind,
    length,
    widthUnits ?? 1,
    armSpanUnits ?? 2,
    trunkSpanUnits ?? 3,
    branchSpanUnits ?? 2,
    radiusUnits ?? 2,
    mitreArmA ?? 2,
    mitreArmB ?? 2,
    offsetUnits ?? 1,
    yTrunkUnits ?? 2,
    yBranchUnits ?? 2,
    diagonalVector
  );
  const rotated = spec.cells.map((cell) =>
    rotateLocalCell(cell, spec.width, spec.height, rotation)
  );

  // Normalize so that minX = 0 and minY = 0 (top-left aligned local coordinate space)
  const minX = Math.min(...rotated.map((p) => p.x));
  const minY = Math.min(...rotated.map((p) => p.y));

  return Object.freeze(
    rotated.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
    }))
  );
}

/**
 * Computes an axis-aligned bounding box from a collection of discrete grid points.
 */
export function calculateBoundingBox(points: readonly GridPoint[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Calculates the complete footprint (occupied board holes and bounding box)
 * for a placed channel given its position, rotation, and parametric dimensions.
 */
export function getChannelFootprint(channel: PlacedChannel): ChannelFootprint {
  const localCells = getLocalFootprint(
    channel.kind,
    channel.length,
    channel.rotation,
    channel.widthUnits,
    channel.armSpanUnits,
    channel.trunkSpanUnits,
    channel.branchSpanUnits,
    channel.radiusUnits,
    channel.mitreArmA,
    channel.mitreArmB,
    channel.offsetUnits,
    channel.yTrunkUnits,
    channel.yBranchUnits,
    channel.diagonalVector
  );
  const posX = Math.round(channel.position.x);
  const posY = Math.round(channel.position.y);

  const absoluteCells: GridPoint[] = localCells.map((c) => ({
    x: posX + c.x,
    y: posY + c.y,
  }));

  const bounds = calculateBoundingBox(absoluteCells);

  return {
    channelId: channel.id,
    cells: Object.freeze(absoluteCells),
    bounds,
  };
}

/**
 * Returns the axis-aligned bounding box of a placed channel in hole grid coordinates.
 */
export function getChannelBoundingBox(channel: PlacedChannel): BoundingBox {
  return getChannelFootprint(channel).bounds;
}

// ============================================================================
// 5. Snap Connectors & Mounting Point Calculations
// ============================================================================

/**
 * Calculates the absolute Multiboard attachment snap positions for a placed channel.
 * Accounts for mounting system type (Threaded Snap, Direct Screw, Multiconnect)
 * and manual contextual mount editing overrides.
 */
export function getChannelSnapPoints(channel: PlacedChannel): readonly SnapPoint[] {
  const posX = Math.round(channel.position.x);
  const posY = Math.round(channel.position.y);
  const mType: MountingType = channel.mountingType ?? 'threaded_snap';

  // If manual connector mode is active and user specified custom mount points, use them directly
  if (channel.connectorMode === 'manual' && channel.customMountPoints && channel.customMountPoints.length > 0) {
    return Object.freeze(
      channel.customMountPoints.map((p, index) => ({
        x: posX + p.x,
        y: posY + p.y,
        channelId: channel.id,
        localIndex: index,
        isTerminal: index === 0 || index === (channel.customMountPoints?.length ?? 1) - 1,
        mountingType: mType,
      }))
    );
  }

  const spec = getCanonicalChannelSpec(
    channel.kind,
    channel.length,
    channel.widthUnits,
    channel.armSpanUnits,
    channel.trunkSpanUnits,
    channel.branchSpanUnits,
    channel.radiusUnits,
    channel.mitreArmA,
    channel.mitreArmB,
    channel.offsetUnits,
    channel.yTrunkUnits,
    channel.yBranchUnits,
    channel.diagonalVector
  );

  let localSnaps: readonly GridPoint[] = spec.snapIndices;

  // Mounting system-specific automatic placement rules:
  if (mType === 'direct_screw') {
    // Direct screw: 2 terminal anchor screws at ends
    if (spec.snapIndices.length >= 2) {
      localSnaps = [spec.snapIndices[0], spec.snapIndices[spec.snapIndices.length - 1]];
    }
  } else if (mType === 'multiconnect') {
    // Multiconnect dovetail: central socket for short pieces, ends for long pieces
    const len = channel.length ?? 2;
    if (channel.kind === 'straight' && len <= 3) {
      localSnaps = [{ x: Math.floor(len / 2), y: 0 }];
    } else if (spec.snapIndices.length >= 2) {
      localSnaps = [spec.snapIndices[0], spec.snapIndices[spec.snapIndices.length - 1]];
    }
  } else if (channel.kind === 'straight' && channel.customSnapSpacing && channel.customSnapSpacing > 0) {
    // Custom spacing override for straight channel
    const len = Math.max(1, Math.floor(channel.length ?? 2));
    const w = Math.max(1, Math.min(2, Math.floor(channel.widthUnits || 1)));
    const spacing = Math.max(1, Math.floor(channel.customSnapSpacing));
    const custom: GridPoint[] = [];
    for (let y = 0; y < w; y++) {
      custom.push({ x: 0, y });
      for (let i = spacing; i < len - 1; i += spacing) {
        custom.push({ x: i, y });
      }
      if (len > 1) {
        custom.push({ x: len - 1, y });
      }
    }
    localSnaps = custom;
  }

  // Rotate snap points with the channel
  const rotatedSnaps = localSnaps.map((cell) =>
    rotateLocalCell(cell, spec.width, spec.height, channel.rotation)
  );

  // Normalize by bounding box origin if rotated
  const localFootprintRaw = spec.cells.map((cell) =>
    rotateLocalCell(cell, spec.width, spec.height, channel.rotation)
  );
  const minX = Math.min(...localFootprintRaw.map((p) => p.x));
  const minY = Math.min(...localFootprintRaw.map((p) => p.y));

  return Object.freeze(
    rotatedSnaps.map((p, index) => {
      const normalizedX = p.x - minX;
      const normalizedY = p.y - minY;
      const isTerminal = index === 0 || index === rotatedSnaps.length - 1;

      return {
        x: posX + normalizedX,
        y: posY + normalizedY,
        channelId: channel.id,
        localIndex: index,
        isTerminal,
        mountingType: mType,
      };
    })
  );
}

/**
 * Returns the total count of snap connectors required to mount a given channel.
 */
export function getChannelSnapCount(channel: PlacedChannel): number {
  return getChannelSnapPoints(channel).length;
}

// ============================================================================
// 6. Collision & Out-of-Bounds Detection
// ============================================================================

/**
 * Formats a grid point into a string key for fast Set/Map lookups.
 */
export function gridPointKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

/**
 * Checks whether two grid points represent the exact same coordinate.
 */
export function arePointsEqual(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Tests whether two axis-aligned bounding boxes overlap (Broadphase collision test).
 */
export function doBoxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

/**
 * Tests whether two placed channels collide / occupy overlapping holes on the grid.
 * Employs a 2-stage collision pipeline:
 * 1. Broadphase: AABB bounding box overlap rejection
 * 2. Narrowphase: Exact discrete grid cell set intersection
 */
export function doChannelsCollide(ch1: PlacedChannel, ch2: PlacedChannel): boolean {
  if (ch1.id === ch2.id) return false;

  const fp1 = getChannelFootprint(ch1);
  const fp2 = getChannelFootprint(ch2);

  // 1. Broadphase rejection
  if (!doBoxesOverlap(fp1.bounds, fp2.bounds)) {
    return false;
  }

  // 2. Narrowphase exact cell check
  const set1 = new Set<string>();
  for (const c of fp1.cells) {
    set1.add(gridPointKey(c));
  }

  for (const c of fp2.cells) {
    if (set1.has(gridPointKey(c))) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a specific grid cell is outside the valid board matrix hole boundaries.
 */
export function isCellOutOfBounds(point: GridPoint, config: BoardConfig = DEFAULT_BOARD_CONFIG): boolean {
  const dims = calculateBoardDimensions(config);
  return point.x < 0 || point.x >= dims.totalHolesX || point.y < 0 || point.y >= dims.totalHolesY;
}

/**
 * Returns all cells of a channel that lie outside the valid board boundaries.
 */
export function getOutOfBoundsCells(
  channel: PlacedChannel,
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): readonly GridPoint[] {
  const fp = getChannelFootprint(channel);
  return Object.freeze(fp.cells.filter((cell) => isCellOutOfBounds(cell, config)));
}

/**
 * Tests whether any part of a channel lies outside the board boundaries.
 */
export function isChannelOutOfBounds(
  channel: PlacedChannel,
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): boolean {
  const fp = getChannelFootprint(channel);
  const dims = calculateBoardDimensions(config);

  // Fast bounding box check first
  if (
    fp.bounds.minX < 0 ||
    fp.bounds.minY < 0 ||
    fp.bounds.maxX >= dims.totalHolesX ||
    fp.bounds.maxY >= dims.totalHolesY
  ) {
    return true;
  }

  return false;
}

/**
 * Analyzes an entire array of channels on the board, identifying all collisions
 * and overlapping grid coordinates.
 */
export function findCollisions(channels: readonly PlacedChannel[]): CollisionResult {
  const cellOccupancy = new Map<string, { cell: GridPoint; channelIds: string[] }>();
  const collidingPairsSet = new Set<string>();
  const collidingPairs: [string, string][] = [];
  const overlapCellsMap = new Map<string, GridPoint>();

  for (const channel of channels) {
    const fp = getChannelFootprint(channel);
    for (const cell of fp.cells) {
      const key = gridPointKey(cell);
      const existing = cellOccupancy.get(key);
      if (existing) {
        existing.channelIds.push(channel.id);
        overlapCellsMap.set(key, cell);

        // Record pair collisions
        for (const otherId of existing.channelIds) {
          if (otherId !== channel.id) {
            const pairKey = [otherId, channel.id].sort().join('::');
            if (!collidingPairsSet.has(pairKey)) {
              collidingPairsSet.add(pairKey);
              collidingPairs.push([otherId, channel.id]);
            }
          }
        }
      } else {
        cellOccupancy.set(key, { cell, channelIds: [channel.id] });
      }
    }
  }

  return {
    hasCollision: collidingPairs.length > 0,
    collidingChannelIds: Object.freeze(collidingPairs),
    overlapCells: Object.freeze(Array.from(overlapCellsMap.values())),
  };
}

/**
 * Tests whether a candidate channel can be safely placed at its designated position/rotation
 * without colliding with existing channels or exceeding the board boundaries.
 */
export function canPlaceChannel(
  candidate: PlacedChannel,
  existingChannels: readonly PlacedChannel[],
  config: BoardConfig = DEFAULT_BOARD_CONFIG
): PlacementValidity {
  // 1. Boundary check
  const outOfBoundsCells = getOutOfBoundsCells(candidate, config);
  const isOutOfBounds = outOfBoundsCells.length > 0;

  // 2. Collision check against existing channels (excluding itself if editing)
  const candidateFp = getChannelFootprint(candidate);
  const candidateCellKeys = new Set(candidateFp.cells.map(gridPointKey));

  const collidingIds = new Set<string>();
  const collidingCells: GridPoint[] = [];

  for (const existing of existingChannels) {
    if (existing.id === candidate.id) continue;

    const existingFp = getChannelFootprint(existing);
    if (!doBoxesOverlap(candidateFp.bounds, existingFp.bounds)) {
      continue;
    }

    for (const cell of existingFp.cells) {
      const key = gridPointKey(cell);
      if (candidateCellKeys.has(key)) {
        collidingIds.add(existing.id);
        collidingCells.push(cell);
      }
    }
  }

  const hasCollisions = collidingIds.size > 0;
  const isValid = !isOutOfBounds && !hasCollisions;

  return {
    isValid,
    isOutOfBounds,
    outOfBoundsCells,
    hasCollisions,
    collidingWithIds: Object.freeze(Array.from(collidingIds)),
    collidingCells: Object.freeze(collidingCells),
  };
}

// ============================================================================
// 7. SVG Rendering & Visual Path Helpers
// ============================================================================

/**
 * Computes the SVG polygon vertex points for an authentic Multiboard regular octagon hole.
 * Chamfers are oriented at 45° with flat horizontal top/bottom and vertical sides.
 *
 * @param cx Center X in SVG pixels
 * @param cy Center Y in SVG pixels
 * @param radius Radius in SVG pixels from center to vertex (default: 8.0)
 */
export function getMultiboardOctagonPoints(cx: number, cy: number, radius: number = 8.0): string {
  // Standard regular octagon vertices rotated 22.5° so edges are horizontal/vertical
  const points: string[] = [];
  const angleStep = Math.PI / 4; // 45 degrees
  const offsetAngle = Math.PI / 8; // 22.5 degrees

  for (let i = 0; i < 8; i++) {
    const angle = i * angleStep + offsetAngle;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return points.join(' ');
}

/**
 * Returns the center coordinate of a channel in physical world mm (or canvas pixels).
 * Useful for positioning labels, telemetry badges, or selection highlights.
 */
export function getChannelCenterWorldPoint(channel: PlacedChannel, pitchMm: number = 25): WorldPoint {
  const fp = getChannelFootprint(channel);
  const centerX = (fp.bounds.minX + fp.bounds.maxX) / 2;
  const centerY = (fp.bounds.minY + fp.bounds.maxY) / 2;
  return {
    x: centerX * pitchMm,
    y: centerY * pitchMm,
  };
}

/**
 * Calculates the total length of a channel in standard grid units.
 * - Straight: length
 * - Corner: 2 units
 * - Junction: 3 units
 * - Cross: 3 units
 */
export function getChannelUnitLength(channel: PlacedChannel): number {
  switch (channel.kind) {
    case 'straight':
      return Math.max(1, Math.floor(channel.length ?? 2));
    case 'corner':
      return channel.armSpanUnits ?? 2;
    case 'junction':
      return channel.trunkSpanUnits ?? 3;
    case 'cross':
      return 3;
    case 'curved':
      return channel.radiusUnits ?? 2;
    case 'y_split':
      return (channel.yTrunkUnits ?? 2) + (channel.widthUnits && channel.widthUnits > 1 ? 2 : 1);
    case 'diagonal':
      return Math.max(1, Math.floor(channel.length ?? 3));
    case 'mitred':
      return Math.max(channel.mitreArmA ?? 2, channel.mitreArmB ?? 2);
    case 'spool':
      return 6;
    case 'socket_holder':
      return 6;
    case 'accessory':
      return Math.max(channel.widthUnits ?? 6, channel.length ?? 3);
  }
}

/**
 * Computes exact smooth SVG curved path data, center, ports, radii, and sweep flags
 * for radial curved channels (curved) for any rotation (0°, 90°, 180°, 270°).
 * Includes tangent collar extensions (pitch/2) at both ports so the channel spans
 * the complete MU grid units and connects flush without gaps to attached straight runs.
 */
export function getCurvedChannelGeometry(
  channel: PlacedChannel,
  pitchMm: number = 25,
  margin: number = 30
): {
  center: WorldPoint;
  p1: WorldPoint;
  p2: WorldPoint;
  rc: number;
  rOuter: number;
  rInner: number;
  sweepFlag: number;
  ductPath: string;
  centerLinePath: string;
  collarLen: number;
  p1CenterLip: WorldPoint;
  p2CenterLip: WorldPoint;
} {
  const radius = Math.max(2, Math.min(8, Math.floor(channel.radiusUnits || 2)));
  const rot = channel.rotation;

  // Canonical points in grid coordinates
  const cCan: GridPoint = { x: radius - 1, y: 0 };
  const p1Can: GridPoint = { x: 0, y: 0 };
  const p2Can: GridPoint = { x: radius - 1, y: radius - 1 };

  // Rotate in local bounding box
  const cRot = rotateLocalCell(cCan, radius, radius, rot);
  const p1Rot = rotateLocalCell(p1Can, radius, radius, rot);
  const p2Rot = rotateLocalCell(p2Can, radius, radius, rot);

  const posX = Math.round(channel.position.x);
  const posY = Math.round(channel.position.y);

  // Convert to SVG coordinates
  const center: WorldPoint = {
    x: margin + (posX + cRot.x) * pitchMm,
    y: margin + (posY + cRot.y) * pitchMm,
  };
  const p1: WorldPoint = {
    x: margin + (posX + p1Rot.x) * pitchMm,
    y: margin + (posY + p1Rot.y) * pitchMm,
  };
  const p2: WorldPoint = {
    x: margin + (posX + p2Rot.x) * pitchMm,
    y: margin + (posY + p2Rot.y) * pitchMm,
  };

  const rc = (radius - 1) * pitchMm;
  const w = Math.max(1, Math.min(2, Math.floor(channel.widthUnits || 1)));

  let rOuter: number;
  let rInner: number;

  if (w === 1) {
    rOuter = rc + pitchMm / 2;
    rInner = Math.max(2, rc - pitchMm / 2);
  } else {
    // 2 MU wide: spans outer hole track (rc) with +12.5mm and adjacent inner track (rc - pitchMm) with -12.5mm
    rOuter = rc + pitchMm / 2;
    rInner = Math.max(2, rc - pitchMm - pitchMm / 2);
  }

  const v1 = { x: p1.x - center.x, y: p1.y - center.y };
  const v2 = { x: p2.x - center.x, y: p2.y - center.y };

  const u1 = { x: v1.x / rc, y: v1.y / rc };
  const u2 = { x: v2.x / rc, y: v2.y / rc };

  // 2D cross product to determine arc direction in SVG Y-down space
  const crossZ = v1.x * v2.y - v1.y * v2.x;
  const sweepFlag = crossZ > 0 ? 1 : 0;

  const p1Outer = { x: center.x + rOuter * u1.x, y: center.y + rOuter * u1.y };
  const p1Inner = { x: center.x + rInner * u1.x, y: center.y + rInner * u1.y };
  const p2Outer = { x: center.x + rOuter * u2.x, y: center.y + rOuter * u2.y };
  const p2Inner = { x: center.x + rInner * u2.x, y: center.y + rInner * u2.y };

  // Tangent vectors heading OUTWARD from the curve into the adjacent Multiboard cells:
  const dp = { x: p2.x - p1.x, y: p2.y - p1.y };
  const candT1A = { x: -u1.y, y: u1.x };
  const dot1A = candT1A.x * dp.x + candT1A.y * dp.y;
  const t1 = dot1A < 0 ? candT1A : { x: u1.y, y: -u1.x };

  const candT2A = { x: -u2.y, y: u2.x };
  const dot2A = candT2A.x * dp.x + candT2A.y * dp.y;
  const t2 = dot2A > 0 ? candT2A : { x: u2.y, y: -u2.x };

  // Tangent collar length: extends by half pitch (12.5mm) so the port meets the boundary of the MU cell
  const collarLen = pitchMm / 2;

  // Port 1 lip points (extended outward to cell boundary):
  const p1OuterLip = { x: p1Outer.x + t1.x * collarLen, y: p1Outer.y + t1.y * collarLen };
  const p1InnerLip = { x: p1Inner.x + t1.x * collarLen, y: p1Inner.y + t1.y * collarLen };
  const p1CenterLip = { x: p1.x + t1.x * collarLen, y: p1.y + t1.y * collarLen };

  // Port 2 lip points (extended outward to cell boundary):
  const p2OuterLip = { x: p2Outer.x + t2.x * collarLen, y: p2Outer.y + t2.y * collarLen };
  const p2InnerLip = { x: p2Inner.x + t2.x * collarLen, y: p2Inner.y + t2.y * collarLen };
  const p2CenterLip = { x: p2.x + t2.x * collarLen, y: p2.y + t2.y * collarLen };

  const ductPath = `M ${p1OuterLip.x.toFixed(2)} ${p1OuterLip.y.toFixed(2)} L ${p1Outer.x.toFixed(2)} ${p1Outer.y.toFixed(2)} A ${rOuter.toFixed(2)} ${rOuter.toFixed(2)} 0 0 ${sweepFlag} ${p2Outer.x.toFixed(2)} ${p2Outer.y.toFixed(2)} L ${p2OuterLip.x.toFixed(2)} ${p2OuterLip.y.toFixed(2)} L ${p2InnerLip.x.toFixed(2)} ${p2InnerLip.y.toFixed(2)} L ${p2Inner.x.toFixed(2)} ${p2Inner.y.toFixed(2)} A ${rInner.toFixed(2)} ${rInner.toFixed(2)} 0 0 ${1 - sweepFlag} ${p1Inner.x.toFixed(2)} ${p1Inner.y.toFixed(2)} L ${p1InnerLip.x.toFixed(2)} ${p1InnerLip.y.toFixed(2)} Z`;
  
  const line1 = `M ${p1CenterLip.x.toFixed(2)} ${p1CenterLip.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${rc.toFixed(2)} ${rc.toFixed(2)} 0 0 ${sweepFlag} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p2CenterLip.x.toFixed(2)} ${p2CenterLip.y.toFixed(2)}`;
  let centerLinePath = line1;
  if (w === 2 && rc - pitchMm > 0) {
    const rc2 = rc - pitchMm;
    const p1Track2 = { x: center.x + rc2 * u1.x, y: center.y + rc2 * u1.y };
    const p2Track2 = { x: center.x + rc2 * u2.x, y: center.y + rc2 * u2.y };
    const p1Lip2 = { x: p1Track2.x + t1.x * collarLen, y: p1Track2.y + t1.y * collarLen };
    const p2Lip2 = { x: p2Track2.x + t2.x * collarLen, y: p2Track2.y + t2.y * collarLen };
    const line2 = `M ${p1Lip2.x.toFixed(2)} ${p1Lip2.y.toFixed(2)} L ${p1Track2.x.toFixed(2)} ${p1Track2.y.toFixed(2)} A ${rc2.toFixed(2)} ${rc2.toFixed(2)} 0 0 ${sweepFlag} ${p2Track2.x.toFixed(2)} ${p2Track2.y.toFixed(2)} L ${p2Lip2.x.toFixed(2)} ${p2Lip2.y.toFixed(2)}`;
    centerLinePath = `${line1} ${line2}`;
  }

  return {
    center,
    p1,
    p2,
    rc,
    rOuter,
    rInner,
    sweepFlag,
    ductPath,
    centerLinePath,
    collarLen,
    p1CenterLip,
    p2CenterLip,
  };
}

/**
 * Computes smooth radial curved conduit geometry for Y-split channels,
 * featuring smooth dual branching conduits and a central divider crotch (innesto centrale).
 */
export function getYBranchChannelGeometry(
  channel: PlacedChannel,
  pitchMm: number = 25,
  margin: number = 30
): {
  ductPath: string;
  leftCenterLinePath: string;
  rightCenterLinePath: string;
  innestoPath: string;
} {
  const trunkUnits = Math.max(1, Math.min(6, Math.floor(channel.yTrunkUnits || 2)));
  const w = Math.max(1, Math.min(2, Math.floor(channel.widthUnits || 1)));
  const rot = channel.rotation;
  const boundW = w === 1 ? 3 : 6;
  const totalH = (w === 1 ? 2 : 3) + trunkUnits;

  const posX = Math.round(channel.position.x);
  const posY = Math.round(channel.position.y);

  // Helper to convert canonical mm coordinate to SVG coordinates with rotation
  function transformPt(canMmX: number, canMmY: number): { x: number; y: number } {
    const holeX = canMmX / pitchMm;
    const holeY = canMmY / pitchMm;
    const rotated = rotateLocalContinuousPoint({ x: holeX, y: holeY }, boundW, totalH, rot);
    return {
      x: margin + (posX + rotated.x) * pitchMm,
      y: margin + (posY + rotated.y) * pitchMm,
    };
  }

  const trunkBottomY = (totalH - 0.5) * pitchMm;

  if (w === 1) {
    // 1 MU Spigoloso (45° faceted CAD geometry matching physical Underware 2.0 piece)
    // Mouth width: 25mm (1 MU)
    const p1 = transformPt(-0.5 * pitchMm, -0.5 * pitchMm); // Left mouth top-left
    const p2 = transformPt(0.5 * pitchMm, -0.5 * pitchMm);  // Left mouth top-right
    const p3 = transformPt(0.5 * pitchMm, 0.25 * pitchMm);  // Left inner vertical collar
    const p4 = transformPt(1.0 * pitchMm, 0.75 * pitchMm);  // V-crotch apex (sharp 90° V)
    const p5 = transformPt(1.5 * pitchMm, 0.25 * pitchMm);  // Right inner vertical collar bottom
    const p6 = transformPt(1.5 * pitchMm, -0.5 * pitchMm);  // Right mouth top-left
    const p7 = transformPt(2.5 * pitchMm, -0.5 * pitchMm);  // Right mouth top-right
    const p8 = transformPt(2.5 * pitchMm, 0.25 * pitchMm);  // Right outer vertical collar
    const p9 = transformPt(1.5 * pitchMm, 1.25 * pitchMm);  // Trunk right shoulder (45° chamfer from p8)
    const p10 = transformPt(1.5 * pitchMm, trunkBottomY);   // Trunk bottom-right
    const p11 = transformPt(0.5 * pitchMm, trunkBottomY);   // Trunk bottom-left
    const p12 = transformPt(0.5 * pitchMm, 1.25 * pitchMm); // Trunk left shoulder
    const p13 = transformPt(-0.5 * pitchMm, 0.25 * pitchMm);// Left outer vertical collar bottom (45° chamfer to p12)

    const ductPath = [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      `L ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`,
      `L ${p6.x.toFixed(2)} ${p6.y.toFixed(2)}`,
      `L ${p7.x.toFixed(2)} ${p7.y.toFixed(2)}`,
      `L ${p8.x.toFixed(2)} ${p8.y.toFixed(2)}`,
      `L ${p9.x.toFixed(2)} ${p9.y.toFixed(2)}`,
      `L ${p10.x.toFixed(2)} ${p10.y.toFixed(2)}`,
      `L ${p11.x.toFixed(2)} ${p11.y.toFixed(2)}`,
      `L ${p12.x.toFixed(2)} ${p12.y.toFixed(2)}`,
      `L ${p13.x.toFixed(2)} ${p13.y.toFixed(2)}`,
      `Z`,
    ].join(' ');

    // 45° faceted cable routing centerlines
    const cl_l0 = transformPt(0, -0.5 * pitchMm);
    const cl_l1 = transformPt(0, 0.25 * pitchMm);
    const cl_l2 = transformPt(1.0 * pitchMm, 1.25 * pitchMm);
    const cl_t = transformPt(1.0 * pitchMm, trunkBottomY);

    const leftCenterLinePath = [
      `M ${cl_l0.x.toFixed(2)} ${cl_l0.y.toFixed(2)}`,
      `L ${cl_l1.x.toFixed(2)} ${cl_l1.y.toFixed(2)}`,
      `L ${cl_l2.x.toFixed(2)} ${cl_l2.y.toFixed(2)}`,
      `L ${cl_t.x.toFixed(2)} ${cl_t.y.toFixed(2)}`,
    ].join(' ');

    const cl_r0 = transformPt(2.0 * pitchMm, -0.5 * pitchMm);
    const cl_r1 = transformPt(2.0 * pitchMm, 0.25 * pitchMm);

    const rightCenterLinePath = [
      `M ${cl_r0.x.toFixed(2)} ${cl_r0.y.toFixed(2)}`,
      `L ${cl_r1.x.toFixed(2)} ${cl_r1.y.toFixed(2)}`,
      `L ${cl_l2.x.toFixed(2)} ${cl_l2.y.toFixed(2)}`,
      `L ${cl_t.x.toFixed(2)} ${cl_t.y.toFixed(2)}`,
    ].join(' ');

    // 45° CAD V-ridge accent seam
    const vApex = transformPt(1.0 * pitchMm, 0.75 * pitchMm);
    const vBase = transformPt(1.0 * pitchMm, 1.25 * pitchMm);
    const vLeft = transformPt(1.0 * pitchMm - 3, 1.05 * pitchMm);
    const vRight = transformPt(1.0 * pitchMm + 3, 1.05 * pitchMm);
    const innestoPath = `M ${vApex.x.toFixed(2)} ${vApex.y.toFixed(2)} L ${vLeft.x.toFixed(2)} ${vLeft.y.toFixed(2)} L ${vBase.x.toFixed(2)} ${vBase.y.toFixed(2)} L ${vRight.x.toFixed(2)} ${vRight.y.toFixed(2)} Z`;

    return {
      ductPath,
      leftCenterLinePath,
      rightCenterLinePath,
      innestoPath,
    };
  } else {
    // 2 MU Spigoloso (45° faceted CAD geometry matching physical Underware 2.0 piece)
    // Each mouth is strictly 50mm wide (2 MU), spanning 2 adjacent Multiboard hole columns
    const p1 = transformPt(-0.5 * pitchMm, -0.5 * pitchMm); // Left mouth top-left
    const p2 = transformPt(1.5 * pitchMm, -0.5 * pitchMm);  // Left mouth top-right (50mm wide)
    const p3 = transformPt(1.5 * pitchMm, 0.35 * pitchMm);  // Left inner vertical collar
    const p4 = transformPt(2.5 * pitchMm, 1.35 * pitchMm);  // V-crotch apex (sharp 90° V)
    const p5 = transformPt(3.5 * pitchMm, 0.35 * pitchMm);  // Right inner vertical collar bottom
    const p6 = transformPt(3.5 * pitchMm, -0.5 * pitchMm);  // Right mouth top-left
    const p7 = transformPt(5.5 * pitchMm, -0.5 * pitchMm);  // Right mouth top-right (50mm wide)
    const p8 = transformPt(5.5 * pitchMm, 0.35 * pitchMm);  // Right outer vertical collar
    const p9 = transformPt(3.5 * pitchMm, 2.35 * pitchMm);  // Trunk right shoulder (45° chamfer from p8)
    const p10 = transformPt(3.5 * pitchMm, trunkBottomY);   // Trunk bottom-right (50mm wide)
    const p11 = transformPt(1.5 * pitchMm, trunkBottomY);   // Trunk bottom-left
    const p12 = transformPt(1.5 * pitchMm, 2.35 * pitchMm); // Trunk left shoulder
    const p13 = transformPt(-0.5 * pitchMm, 0.35 * pitchMm);// Left outer vertical collar bottom (45° chamfer to p12)

    const ductPath = [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      `L ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`,
      `L ${p6.x.toFixed(2)} ${p6.y.toFixed(2)}`,
      `L ${p7.x.toFixed(2)} ${p7.y.toFixed(2)}`,
      `L ${p8.x.toFixed(2)} ${p8.y.toFixed(2)}`,
      `L ${p9.x.toFixed(2)} ${p9.y.toFixed(2)}`,
      `L ${p10.x.toFixed(2)} ${p10.y.toFixed(2)}`,
      `L ${p11.x.toFixed(2)} ${p11.y.toFixed(2)}`,
      `L ${p12.x.toFixed(2)} ${p12.y.toFixed(2)}`,
      `L ${p13.x.toFixed(2)} ${p13.y.toFixed(2)}`,
      `Z`,
    ].join(' ');

    // Dual 45° faceted cable routing centerlines for the 2 tracks
    // Left branch: Outer Track (hole 0) & Inner Track (hole 1)
    const l0_start = transformPt(0, -0.5 * pitchMm);
    const l0_bend1 = transformPt(0, 0.35 * pitchMm);
    const l0_bend2 = transformPt(2.0 * pitchMm, 2.35 * pitchMm);
    const l0_end = transformPt(2.0 * pitchMm, trunkBottomY);

    const l1_start = transformPt(1.0 * pitchMm, -0.5 * pitchMm);
    const l1_bend1 = transformPt(1.0 * pitchMm, 0.35 * pitchMm);
    const l1_bend2 = transformPt(2.5 * pitchMm, 1.85 * pitchMm);
    const l1_end = transformPt(2.5 * pitchMm, trunkBottomY);

    const leftCenterLinePath = [
      `M ${l0_start.x.toFixed(2)} ${l0_start.y.toFixed(2)} L ${l0_bend1.x.toFixed(2)} ${l0_bend1.y.toFixed(2)} L ${l0_bend2.x.toFixed(2)} ${l0_bend2.y.toFixed(2)} L ${l0_end.x.toFixed(2)} ${l0_end.y.toFixed(2)}`,
      `M ${l1_start.x.toFixed(2)} ${l1_start.y.toFixed(2)} L ${l1_bend1.x.toFixed(2)} ${l1_bend1.y.toFixed(2)} L ${l1_bend2.x.toFixed(2)} ${l1_bend2.y.toFixed(2)} L ${l1_end.x.toFixed(2)} ${l1_end.y.toFixed(2)}`,
    ].join(' ');

    // Right branch: Outer Track (hole 5) & Inner Track (hole 4)
    const r5_start = transformPt(5.0 * pitchMm, -0.5 * pitchMm);
    const r5_bend1 = transformPt(5.0 * pitchMm, 0.35 * pitchMm);
    const r5_bend2 = transformPt(3.0 * pitchMm, 2.35 * pitchMm);
    const r5_end = transformPt(3.0 * pitchMm, trunkBottomY);

    const r4_start = transformPt(4.0 * pitchMm, -0.5 * pitchMm);
    const r4_bend1 = transformPt(4.0 * pitchMm, 0.35 * pitchMm);
    const r4_bend2 = transformPt(2.5 * pitchMm, 1.85 * pitchMm);
    const r4_end = transformPt(2.5 * pitchMm, trunkBottomY);

    const rightCenterLinePath = [
      `M ${r5_start.x.toFixed(2)} ${r5_start.y.toFixed(2)} L ${r5_bend1.x.toFixed(2)} ${r5_bend1.y.toFixed(2)} L ${r5_bend2.x.toFixed(2)} ${r5_bend2.y.toFixed(2)} L ${r5_end.x.toFixed(2)} ${r5_end.y.toFixed(2)}`,
      `M ${r4_start.x.toFixed(2)} ${r4_start.y.toFixed(2)} L ${r4_bend1.x.toFixed(2)} ${r4_bend1.y.toFixed(2)} L ${r4_bend2.x.toFixed(2)} ${r4_bend2.y.toFixed(2)} L ${r4_end.x.toFixed(2)} ${r4_end.y.toFixed(2)}`,
    ].join(' ');

    // 2 MU 45° CAD V-ridge accent seam
    const vApex2 = transformPt(2.5 * pitchMm, 1.35 * pitchMm);
    const vBase2 = transformPt(2.5 * pitchMm, 2.0 * pitchMm);
    const vLeft2 = transformPt(2.5 * pitchMm - 5, 1.7 * pitchMm);
    const vRight2 = transformPt(2.5 * pitchMm + 5, 1.7 * pitchMm);
    const innestoPath = `M ${vApex2.x.toFixed(2)} ${vApex2.y.toFixed(2)} L ${vLeft2.x.toFixed(2)} ${vLeft2.y.toFixed(2)} L ${vBase2.x.toFixed(2)} ${vBase2.y.toFixed(2)} L ${vRight2.x.toFixed(2)} ${vRight2.y.toFixed(2)} Z`;

    return {
      ductPath,
      leftCenterLinePath,
      rightCenterLinePath,
      innestoPath,
    };
  }
}

/**
 * Calculates smooth SVG conduit geometry for a point-to-point diagonal channel.
 * Guarantees nominal perpendicular channel width of strictly 25mm (pitchMm) for widthUnits=1
 * or 50mm for widthUnits=2, flush with standard Multiboard channel mouths.
 */
export function getDiagonalChannelGeometry(
  channel: PlacedChannel,
  pitchMm: number = 25,
  margin: number = 30
): {
  ductPath: string;
  centerLinePath: string;
  p1: WorldPoint;
  p2: WorldPoint;
} {
  const posX = Math.round(channel.position.x);
  const posY = Math.round(channel.position.y);
  const dx = channel.diagonalVector?.dx ?? (channel.length ?? 3);
  const dy = channel.diagonalVector?.dy ?? (channel.offsetUnits ?? 1);

  const p1: WorldPoint = {
    x: margin + posX * pitchMm,
    y: margin + posY * pitchMm,
  };
  const p2: WorldPoint = {
    x: margin + (posX + dx) * pitchMm,
    y: margin + (posY + dy) * pitchMm,
  };

  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const len = Math.sqrt(vx * vx + vy * vy) || 1;
  const ux = vx / len;
  const uy = vy / len;
  const nx = -uy;
  const ny = ux;

  // Perpendicular width is strictly 25mm (pitchMm) for widthUnits=1 or 50mm for widthUnits=2
  const channelWidth = channel.widthUnits && channel.widthUnits > 1 ? 2 * pitchMm : pitchMm;
  const halfW = channelWidth / 2;

  // Extension past terminal hole centers so hole is inside the mouth
  const ext = halfW;

  const c1 = { x: p1.x - ext * ux + halfW * nx, y: p1.y - ext * uy + halfW * ny };
  const c2 = { x: p2.x + ext * ux + halfW * nx, y: p2.y + ext * uy + halfW * ny };
  const c3 = { x: p2.x + ext * ux - halfW * nx, y: p2.y + ext * uy - halfW * ny };
  const c4 = { x: p1.x - ext * ux - halfW * nx, y: p1.y - ext * uy - halfW * ny };

  const ductPath = `M ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} L ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} L ${c3.x.toFixed(2)} ${c3.y.toFixed(2)} L ${c4.x.toFixed(2)} ${c4.y.toFixed(2)} Z`;
  const centerLinePath = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;

  return {
    ductPath,
    centerLinePath,
    p1,
    p2,
  };
}

// ============================================================================
// 10. Measure & Suggest Channel Engine
// ============================================================================

/**
 * Evaluates a span defined by two discrete Multiboard octagon points
 * and computes a channel suggestion, alignment, mounting requirements, and validity.
 */
export function measurePointsAndSuggestChannel(
  pointA: GridPoint,
  pointB: GridPoint,
  existingChannels: readonly PlacedChannel[],
  boardConfig: BoardConfig = DEFAULT_BOARD_CONFIG,
  preferredDiagonalKind?: 'diagonal' | 'corner'
): ChannelProposal {
  const dx = Math.abs(pointB.x - pointA.x);
  const dy = Math.abs(pointB.y - pointA.y);

  let alignment: 'horizontal' | 'vertical' | 'diagonal';
  if (dy === 0) {
    alignment = 'horizontal';
  } else if (dx === 0) {
    alignment = 'vertical';
  } else {
    alignment = 'diagonal';
  }

  const pitchMm = boardConfig.holePitchMm ?? 25;
  let spanMU: number;
  let suggestedKind: ChannelKind = 'straight';
  let suggestedLength = 2;
  let suggestedRotation: Rotation = 0;
  let suggestedPosition: GridPoint = { ...pointA };
  let diagonalVector: { dx: number; dy: number } | undefined = undefined;
  let isDirectlyCompatible = true;
  let statusNote: string | undefined;

  if (alignment === 'horizontal') {
    spanMU = dx + 1;
    suggestedLength = spanMU;
    suggestedRotation = 0;
    suggestedPosition = {
      x: Math.min(pointA.x, pointB.x),
      y: pointA.y,
    };
  } else if (alignment === 'vertical') {
    spanMU = dy + 1;
    suggestedLength = spanMU;
    suggestedRotation = 90;
    suggestedPosition = {
      x: pointA.x,
      y: Math.min(pointA.y, pointB.y),
    };
  } else {
    // Diagonal span:
    const euclideanDist = Math.sqrt(dx * dx + dy * dy);
    spanMU = Math.max(2, Math.round(euclideanDist));

    if (preferredDiagonalKind === 'corner') {
      suggestedKind = 'corner';
      suggestedLength = Math.max(dx + 1, dy + 1);
      suggestedRotation = 0;
      isDirectlyCompatible = false;
      statusNote = '90° L-Shaped Routing';
      suggestedPosition = {
        x: Math.min(pointA.x, pointB.x),
        y: Math.min(pointA.y, pointB.y),
      };
    } else {
      // Direct diagonal conduit with nominal 25mm section
      suggestedKind = 'diagonal';
      suggestedLength = spanMU;
      suggestedRotation = 0;
      isDirectlyCompatible = true;
      statusNote = 'Direct Diagonal Channel (nominal width 25mm)';

      const pStart = pointA.x <= pointB.x ? pointA : pointB;
      const pEnd = pointA.x <= pointB.x ? pointB : pointA;
      suggestedPosition = { ...pStart };
      diagonalVector = { dx: pEnd.x - pStart.x, dy: pEnd.y - pStart.y };
    }
  }

  const spanMm = spanMU * pitchMm;
  const minMounts = 2;
  const recommendedMounts = Math.max(2, 2 + Math.floor(Math.max(0, spanMU - 3) / 4));

  const candidateChannel: PlacedChannel = {
    id: 'proposal-candidate',
    kind: suggestedKind,
    length: suggestedLength,
    position: suggestedPosition,
    rotation: suggestedRotation,
    category: 'power',
    widthUnits: 1,
    heightUnits: 1,
    armSpanUnits: suggestedKind === 'corner' ? Math.max(2, Math.min(4, Math.max(dx + 1, dy + 1))) : undefined,
    diagonalVector,
    mountingType: 'threaded_snap',
  };

  const validity = canPlaceChannel(candidateChannel, existingChannels, boardConfig);

  return {
    pointA,
    pointB,
    spanMU,
    spanMm,
    deltaX: dx,
    deltaY: dy,
    alignment,
    suggestedKind,
    suggestedLength,
    suggestedRotation,
    suggestedPosition,
    diagonalVector,
    widthUnits: 1,
    heightUnits: 1,
    mountingType: 'threaded_snap',
    minMounts,
    recommendedMounts,
    isDirectlyCompatible,
    statusNote,
    isValidPlacement: validity.isValid,
    channel: candidateChannel,
    distanceUnits: spanMU,
    distanceMm: spanMm,
    recommendedKind: suggestedKind,
    recommendedLength: suggestedLength,
    hasObstacles: !validity.isValid,
  };
}

/**
 * Calculates optimal zoom and pan coordinates to cleanly fit the Multiboard into the canvas viewport.
 */
export function fitBoardToViewport(
  config: BoardConfig,
  viewportWidth: number,
  viewportHeight: number
): { zoom: number; pan: { x: number; y: number } } {
  const dims = calculateBoardDimensions(config);
  const pitch = config.holePitchMm ?? 25;
  const boardWidthPx = dims.totalHolesX * pitch;
  const boardHeightPx = dims.totalHolesY * pitch;

  const padding = 120;
  const availW = Math.max(200, viewportWidth - padding);
  const availH = Math.max(200, viewportHeight - padding);

  const scaleX = availW / boardWidthPx;
  const scaleY = availH / boardHeightPx;
  const rawZoom = Math.min(scaleX, scaleY, 1.8);
  const zoom = Math.max(0.3, Math.min(2.5, Number(rawZoom.toFixed(2))));

  const scaledW = boardWidthPx * zoom;
  const scaledH = boardHeightPx * zoom;

  const panX = Math.round((viewportWidth - scaledW) / 2 - 50 * zoom);
  const panY = Math.round((viewportHeight - scaledH) / 2 - 50 * zoom);

  return { zoom, pan: { x: panX, y: panY } };
}

/**
 * Traces and generates an SVG path 'd' string representing the unified outer outline
 * of a channel's occupied grid cells, eliminating internal cell overlaps.
 */
export function getChannelOutlinePath(
  channel: PlacedChannel,
  pitchMm: number = 25,
  margin: number = 30
): string {
  const footprint = getChannelFootprint(channel);
  if (!footprint.cells || footprint.cells.length === 0) return '';

  const cellSet = new Set(footprint.cells.map((c) => `${c.x},${c.y}`));

  interface DirectedEdge {
    fromKey: string;
    toKey: string;
    fromPt: { x: number; y: number };
    toPt: { x: number; y: number };
  }

  const edgesFrom: Map<string, DirectedEdge[]> = new Map();

  function addEdge(fromX: number, fromY: number, toX: number, toY: number) {
    const fromKey = `${fromX},${fromY}`;
    const toKey = `${toX},${toY}`;
    const edge: DirectedEdge = {
      fromKey,
      toKey,
      fromPt: { x: fromX / 2, y: fromY / 2 },
      toPt: { x: toX / 2, y: toY / 2 },
    };
    const list = edgesFrom.get(fromKey) || [];
    list.push(edge);
    edgesFrom.set(fromKey, list);
  }

  for (const cell of footprint.cells) {
    const { x, y } = cell;

    // Top edge: if no neighbor at (x, y - 1)
    if (!cellSet.has(`${x},${y - 1}`)) {
      addEdge(2 * x - 1, 2 * y - 1, 2 * x + 1, 2 * y - 1);
    }
    // Right edge: if no neighbor at (x + 1, y)
    if (!cellSet.has(`${x + 1},${y}`)) {
      addEdge(2 * x + 1, 2 * y - 1, 2 * x + 1, 2 * y + 1);
    }
    // Bottom edge: if no neighbor at (x, y + 1)
    if (!cellSet.has(`${x},${y + 1}`)) {
      addEdge(2 * x + 1, 2 * y + 1, 2 * x - 1, 2 * y + 1);
    }
    // Left edge: if no neighbor at (x - 1, y)
    if (!cellSet.has(`${x - 1},${y}`)) {
      addEdge(2 * x - 1, 2 * y + 1, 2 * x - 1, 2 * y - 1);
    }
  }

  const pathCommands: string[] = [];

  while (edgesFrom.size > 0) {
    const startKey = edgesFrom.keys().next().value;
    if (!startKey) break;

    const startEdges = edgesFrom.get(startKey);
    if (!startEdges || startEdges.length === 0) {
      edgesFrom.delete(startKey);
      continue;
    }

    const firstEdge = startEdges.pop()!;
    if (startEdges.length === 0) edgesFrom.delete(startKey);

    const loopPoints: { x: number; y: number }[] = [firstEdge.fromPt, firstEdge.toPt];
    let currentKey = firstEdge.toKey;

    let safety = 1000;
    while (currentKey !== startKey && safety-- > 0) {
      const nextEdges = edgesFrom.get(currentKey);
      if (!nextEdges || nextEdges.length === 0) {
        edgesFrom.delete(currentKey);
        break;
      }
      const nextEdge = nextEdges.pop()!;
      if (nextEdges.length === 0) edgesFrom.delete(currentKey);

      loopPoints.push(nextEdge.toPt);
      currentKey = nextEdge.toKey;
    }

    if (loopPoints.length >= 3) {
      const simplified: { x: number; y: number }[] = [];
      const N = loopPoints.length - 1;
      for (let i = 0; i < N; i++) {
        const prev = loopPoints[(i - 1 + N) % N];
        const curr = loopPoints[i];
        const next = loopPoints[(i + 1) % N];

        const isCollinearX = prev.x === curr.x && curr.x === next.x;
        const isCollinearY = prev.y === curr.y && curr.y === next.y;
        if (!isCollinearX && !isCollinearY) {
          simplified.push(curr);
        }
      }

      const ptsToRender = simplified.length >= 3 ? simplified : loopPoints.slice(0, -1);
      const svgPts = ptsToRender.map((pt) => ({
        sx: margin + pt.x * pitchMm,
        sy: margin + pt.y * pitchMm,
      }));

      const d =
        `M ${svgPts[0].sx.toFixed(1)} ${svgPts[0].sy.toFixed(1)} ` +
        svgPts
          .slice(1)
          .map((p) => `L ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`)
          .join(' ') +
        ' Z';
      pathCommands.push(d);
    }
  }

  return pathCommands.join(' ');
}

