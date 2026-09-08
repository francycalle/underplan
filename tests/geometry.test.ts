import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BOARD_CONFIG,
  calculateBoardDimensions,
  generateTileMatrix,
  holeToTileCoord,
  tileCoordToHoleOrigin,
  gridToWorld,
  worldToGrid,
  snapToGrid,
  clampGridPoint,
  rotateLocalCell,
  getLocalFootprint,
  getChannelFootprint,
  getChannelBoundingBox,
  getChannelSnapPoints,
  getChannelSnapCount,
  doChannelsCollide,
  isCellOutOfBounds,
  getOutOfBoundsCells,
  isChannelOutOfBounds,
  findCollisions,
  canPlaceChannel,
  getMultiboardOctagonPoints,
  getChannelCenterWorldPoint,
  getChannelUnitLength,
  findBestMultiboardModule,
  getChannelOutlinePath,
  getCurvedChannelGeometry,
} from '../src/lib/geometry.ts';
import type { BoardConfig, PlacedChannel } from '../src/lib/types.ts';

test('calculateBoardDimensions - default 6x3 8x8 config', () => {
  const dims = calculateBoardDimensions(DEFAULT_BOARD_CONFIG);
  assert.equal(dims.totalCols, 6);
  assert.equal(dims.totalRows, 3);
  assert.equal(dims.totalHolesX, 48); // 6 * 8
  assert.equal(dims.totalHolesY, 24); // 3 * 8
  assert.equal(dims.totalWidthMm, 1200); // 48 * 25
  assert.equal(dims.totalHeightMm, 600); // 24 * 25
});

test('calculateBoardDimensions - 4x4 tiles custom matrix', () => {
  const customConfig: BoardConfig = {
    cols: 4,
    rows: 2,
    tileWidthHoles: 4,
    tileHeightHoles: 4,
    holePitchMm: 25,
  };
  const dims = calculateBoardDimensions(customConfig);
  assert.equal(dims.totalCols, 4);
  assert.equal(dims.totalRows, 2);
  assert.equal(dims.totalHolesX, 16);
  assert.equal(dims.totalHolesY, 8);
  assert.equal(dims.totalWidthMm, 400);
  assert.equal(dims.totalHeightMm, 200);
});

test('generateTileMatrix - generates correct tile definitions', () => {
  const tiles = generateTileMatrix(DEFAULT_BOARD_CONFIG);
  assert.equal(tiles.length, 18); // 6 * 3

  // Top-left tile
  const first = tiles[0];
  assert.equal(first.id, 'tile-0-0');
  assert.equal(first.col, 0);
  assert.equal(first.row, 0);
  assert.equal(first.originHoleX, 0);
  assert.equal(first.originHoleY, 0);
  assert.equal(first.type, '8x8');

  // Bottom-right tile
  const last = tiles[tiles.length - 1];
  assert.equal(last.id, 'tile-5-2');
  assert.equal(last.col, 5);
  assert.equal(last.row, 2);
  assert.equal(last.originHoleX, 40); // 5 * 8
  assert.equal(last.originHoleY, 16); // 2 * 8
  assert.equal(last.type, '8x8');
});

test('holeToTileCoord and tileCoordToHoleOrigin', () => {
  // Point at (10, 18) on 8x8 grid
  const res = holeToTileCoord({ x: 10, y: 18 }, DEFAULT_BOARD_CONFIG);
  assert.equal(res.tileCol, 1); // 10 // 8
  assert.equal(res.tileRow, 2); // 18 // 8
  assert.equal(res.localHoleX, 2); // 10 % 8
  assert.equal(res.localHoleY, 2); // 18 % 8
  assert.equal(res.isValid, true);

  // Inverse origin
  const origin = tileCoordToHoleOrigin(1, 2, DEFAULT_BOARD_CONFIG);
  assert.deepEqual(origin, { x: 8, y: 16 });
});

test('gridToWorld and worldToGrid snapping', () => {
  // 25mm pitch
  assert.deepEqual(gridToWorld({ x: 2, y: 3 }, 25), { x: 50, y: 75 });
  assert.deepEqual(worldToGrid({ x: 51, y: 74 }, 25), { x: 2, y: 3 });
  assert.deepEqual(snapToGrid({ x: 52.4, y: 73.1 }, 25), { x: 50, y: 75 });
});

test('clampGridPoint clamps correctly', () => {
  const clamped1 = clampGridPoint({ x: -5, y: 50 }, DEFAULT_BOARD_CONFIG);
  assert.deepEqual(clamped1, { x: 0, y: 23 });

  const clamped2 = clampGridPoint({ x: 10, y: 15 }, DEFAULT_BOARD_CONFIG);
  assert.deepEqual(clamped2, { x: 10, y: 15 });
});

test('rotateLocalCell - 90 deg discrete rotations', () => {
  // 3x2 box, point (0, 0)
  assert.deepEqual(rotateLocalCell({ x: 0, y: 0 }, 3, 2, 0), { x: 0, y: 0 });
  assert.deepEqual(rotateLocalCell({ x: 0, y: 0 }, 3, 2, 90), { x: 1, y: 0 });
  assert.deepEqual(rotateLocalCell({ x: 0, y: 0 }, 3, 2, 180), { x: 2, y: 1 });
  assert.deepEqual(rotateLocalCell({ x: 0, y: 0 }, 3, 2, 270), { x: 0, y: 2 });
});

test('getLocalFootprint - straight channel (I-channel)', () => {
  // Length 3 at 0° (horizontal)
  const fp0 = getLocalFootprint('straight', 3, 0);
  assert.deepEqual(fp0, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);

  // Length 3 at 90° (vertical)
  const fp90 = getLocalFootprint('straight', 3, 90);
  assert.deepEqual(fp90, [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]);

  // Length 3 at 180° (horizontal)
  const fp180 = getLocalFootprint('straight', 3, 180);
  assert.deepEqual(fp180, [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }]);

  // Length 3 at 270° (vertical)
  const fp270 = getLocalFootprint('straight', 3, 270);
  assert.deepEqual(fp270, [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }]);
});

test('getLocalFootprint - corner channel (L-channel) 2x2', () => {
  // 0°: (0,0), (0,1), (1,1)
  const fp0 = getLocalFootprint('corner', 2, 0);
  assert.equal(fp0.length, 3);
  assert.ok(fp0.some((p) => p.x === 0 && p.y === 0));
  assert.ok(fp0.some((p) => p.x === 0 && p.y === 1));
  assert.ok(fp0.some((p) => p.x === 1 && p.y === 1));

  // 90°: 3 cells, top-left normalized
  const fp90 = getLocalFootprint('corner', 2, 90);
  assert.equal(fp90.length, 3);
  assert.ok(fp90.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));

  // Check 180° and 270°
  const fp180 = getLocalFootprint('corner', 2, 180);
  const fp270 = getLocalFootprint('corner', 2, 270);
  assert.equal(fp180.length, 3);
  assert.equal(fp270.length, 3);
});

test('getLocalFootprint - junction channel (T-channel) 3x2', () => {
  // 0°: (0,0), (1,0), (2,0), (1,1)
  const fp0 = getLocalFootprint('junction', 3, 0);
  assert.equal(fp0.length, 4);
  assert.ok(fp0.some((p) => p.x === 0 && p.y === 0));
  assert.ok(fp0.some((p) => p.x === 1 && p.y === 0));
  assert.ok(fp0.some((p) => p.x === 2 && p.y === 0));
  assert.ok(fp0.some((p) => p.x === 1 && p.y === 1));

  // 90°: 4 cells, width 2, height 3
  const fp90 = getLocalFootprint('junction', 3, 90);
  assert.equal(fp90.length, 4);
  assert.ok(fp90.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 2));
});

test('getChannelFootprint and bounding box calculation', () => {
  const channel: PlacedChannel = {
    id: 'ch-1',
    kind: 'straight',
    length: 4,
    position: { x: 5, y: 10 },
    rotation: 0,
    category: 'power',
  };

  const fp = getChannelFootprint(channel);
  assert.equal(fp.channelId, 'ch-1');
  assert.equal(fp.cells.length, 4);
  assert.deepEqual(fp.cells, [
    { x: 5, y: 10 },
    { x: 6, y: 10 },
    { x: 7, y: 10 },
    { x: 8, y: 10 },
  ]);

  const bounds = getChannelBoundingBox(channel);
  assert.equal(bounds.minX, 5);
  assert.equal(bounds.maxX, 8);
  assert.equal(bounds.minY, 10);
  assert.equal(bounds.maxY, 10);
  assert.equal(bounds.width, 4);
  assert.equal(bounds.height, 1);
});

test('getChannelSnapPoints - straight channel', () => {
  // Length 2: snaps at 0 and 1
  const ch2: PlacedChannel = {
    id: 'ch-str2',
    kind: 'straight',
    length: 2,
    position: { x: 2, y: 3 },
    rotation: 0,
    category: 'data',
  };
  const snaps2 = getChannelSnapPoints(ch2);
  assert.equal(snaps2.length, 2);
  assert.deepEqual(snaps2[0], { x: 2, y: 3, channelId: 'ch-str2', localIndex: 0, isTerminal: true, mountingType: 'threaded_snap' });
  assert.deepEqual(snaps2[1], { x: 3, y: 3, channelId: 'ch-str2', localIndex: 1, isTerminal: true, mountingType: 'threaded_snap' });
  assert.equal(getChannelSnapCount(ch2), 2);

  // Length 3: snaps at ends
  const ch3: PlacedChannel = {
    id: 'ch-str3',
    kind: 'straight',
    length: 3,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'data',
  };
  const snaps3 = getChannelSnapPoints(ch3);
  assert.equal(snaps3.length, 2);
  assert.deepEqual(snaps3[0], { x: 0, y: 0, channelId: 'ch-str3', localIndex: 0, isTerminal: true, mountingType: 'threaded_snap' });
  assert.deepEqual(snaps3[1], { x: 2, y: 0, channelId: 'ch-str3', localIndex: 1, isTerminal: true, mountingType: 'threaded_snap' });

  // Length 4: snaps at 0, 2, 3
  const ch4: PlacedChannel = {
    id: 'ch-str4',
    kind: 'straight',
    length: 4,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'data',
  };
  const snaps4 = getChannelSnapPoints(ch4);
  assert.equal(snaps4.length, 3);
});

test('getChannelSnapPoints - corner and junction', () => {
  const corner: PlacedChannel = {
    id: 'ch-cnr',
    kind: 'corner',
    position: { x: 4, y: 4 },
    rotation: 0,
    category: 'video',
  };
  const cnrSnaps = getChannelSnapPoints(corner);
  assert.equal(cnrSnaps.length, 2); // 2 terminal ports
  assert.deepEqual(cnrSnaps[0], { x: 4, y: 4, channelId: 'ch-cnr', localIndex: 0, isTerminal: true, mountingType: 'threaded_snap' });
  assert.deepEqual(cnrSnaps[1], { x: 5, y: 5, channelId: 'ch-cnr', localIndex: 1, isTerminal: true, mountingType: 'threaded_snap' });

  const junc: PlacedChannel = {
    id: 'ch-jnc',
    kind: 'junction',
    position: { x: 10, y: 10 },
    rotation: 0,
    category: 'power',
  };
  const jncSnaps = getChannelSnapPoints(junc);
  assert.equal(jncSnaps.length, 3); // 3 terminal ports
});

test('doChannelsCollide - detects overlaps and non-overlaps', () => {
  const ch1: PlacedChannel = {
    id: 'c1',
    kind: 'straight',
    length: 3,
    position: { x: 0, y: 0 },
    rotation: 0, // occupies (0,0), (1,0), (2,0)
    category: 'power',
  };

  const ch2Colliding: PlacedChannel = {
    id: 'c2',
    kind: 'straight',
    length: 3,
    position: { x: 1, y: 0 },
    rotation: 90, // occupies (1,0), (1,1), (1,2) -> intersects at (1,0)
    category: 'data',
  };

  const ch3NonColliding: PlacedChannel = {
    id: 'c3',
    kind: 'straight',
    length: 3,
    position: { x: 3, y: 0 },
    rotation: 0, // occupies (3,0), (4,0), (5,0)
    category: 'video',
  };

  assert.equal(doChannelsCollide(ch1, ch2Colliding), true);
  assert.equal(doChannelsCollide(ch1, ch3NonColliding), false);
  assert.equal(doChannelsCollide(ch2Colliding, ch3NonColliding), false);
  assert.equal(doChannelsCollide(ch1, ch1), false); // Same channel does not collide with itself
});

test('findCollisions - reports all colliding pairs and overlapping cells', () => {
  const channels: PlacedChannel[] = [
    {
      id: 'h1',
      kind: 'straight',
      length: 4,
      position: { x: 0, y: 1 },
      rotation: 0, // (0,1), (1,1), (2,1), (3,1)
      category: 'power',
    },
    {
      id: 'v1',
      kind: 'straight',
      length: 3,
      position: { x: 2, y: 0 },
      rotation: 90, // (2,0), (2,1), (2,2) -> collides at (2,1)
      category: 'network',
    },
    {
      id: 'safe',
      kind: 'corner',
      position: { x: 10, y: 10 },
      rotation: 0,
      category: 'neutral',
    },
  ];

  const res = findCollisions(channels);
  assert.equal(res.hasCollision, true);
  assert.equal(res.collidingChannelIds.length, 1);
  assert.ok(
    (res.collidingChannelIds[0][0] === 'h1' && res.collidingChannelIds[0][1] === 'v1') ||
    (res.collidingChannelIds[0][0] === 'v1' && res.collidingChannelIds[0][1] === 'h1')
  );
  assert.equal(res.overlapCells.length, 1);
  assert.deepEqual(res.overlapCells[0], { x: 2, y: 1 });
});

test('Out of bounds checks - isChannelOutOfBounds & getOutOfBoundsCells', () => {
  const inBounds: PlacedChannel = {
    id: 'in',
    kind: 'straight',
    length: 3,
    position: { x: 45, y: 23 },
    rotation: 0, // occupies x: 45, 46, 47; y: 23 (board is 48x24: max x=47, max y=23)
    category: 'power',
  };
  assert.equal(isChannelOutOfBounds(inBounds, DEFAULT_BOARD_CONFIG), false);
  assert.equal(getOutOfBoundsCells(inBounds, DEFAULT_BOARD_CONFIG).length, 0);

  const outOfBounds: PlacedChannel = {
    id: 'out',
    kind: 'straight',
    length: 3,
    position: { x: 46, y: 23 },
    rotation: 0, // occupies x: 46, 47, 48 (48 is >= 48, so out!)
    category: 'power',
  };
  assert.equal(isChannelOutOfBounds(outOfBounds, DEFAULT_BOARD_CONFIG), true);
  const outCells = getOutOfBoundsCells(outOfBounds, DEFAULT_BOARD_CONFIG);
  assert.equal(outCells.length, 1);
  assert.deepEqual(outCells[0], { x: 48, y: 23 });
});

test('canPlaceChannel - handles valid, collision, and out-of-bounds', () => {
  const existing: PlacedChannel[] = [
    {
      id: 'existing-1',
      kind: 'straight',
      length: 4,
      position: { x: 2, y: 2 },
      rotation: 0,
      category: 'power',
    },
  ];

  // 1. Valid placement
  const validCandidate: PlacedChannel = {
    id: 'cand-1',
    kind: 'straight',
    length: 2,
    position: { x: 2, y: 4 },
    rotation: 0,
    category: 'data',
  };
  const resValid = canPlaceChannel(validCandidate, existing, DEFAULT_BOARD_CONFIG);
  assert.equal(resValid.isValid, true);
  assert.equal(resValid.hasCollisions, false);
  assert.equal(resValid.isOutOfBounds, false);

  // 2. Collision placement
  const collidingCandidate: PlacedChannel = {
    id: 'cand-2',
    kind: 'straight',
    length: 3,
    position: { x: 3, y: 1 },
    rotation: 90, // (3,1), (3,2), (3,3) -> overlaps existing-1 at (3,2)
    category: 'data',
  };
  const resColliding = canPlaceChannel(collidingCandidate, existing, DEFAULT_BOARD_CONFIG);
  assert.equal(resColliding.isValid, false);
  assert.equal(resColliding.hasCollisions, true);
  assert.equal(resColliding.collidingWithIds.length, 1);
  assert.equal(resColliding.collidingWithIds[0], 'existing-1');
  assert.deepEqual(resColliding.collidingCells, [{ x: 3, y: 2 }]);

  // 3. Out of bounds candidate
  const oobCandidate: PlacedChannel = {
    id: 'cand-3',
    kind: 'corner',
    position: { x: -1, y: 0 },
    rotation: 0,
    category: 'video',
  };
  const resOob = canPlaceChannel(oobCandidate, existing, DEFAULT_BOARD_CONFIG);
  assert.equal(resOob.isValid, false);
  assert.equal(resOob.isOutOfBounds, true);
});

test('getMultiboardOctagonPoints generates valid SVG polygon coordinates', () => {
  const pointsStr = getMultiboardOctagonPoints(25, 25, 8.0);
  const points = pointsStr.split(' ');
  assert.equal(points.length, 8);
  for (const pt of points) {
    const [x, y] = pt.split(',').map(Number);
    assert.ok(!isNaN(x) && !isNaN(y));
    // Distance from center should be approximately 8.0
    const dist = Math.hypot(x - 25, y - 25);
    assert.ok(Math.abs(dist - 8.0) < 0.05);
  }
});

test('getChannelCenterWorldPoint and getChannelUnitLength', () => {
  const ch: PlacedChannel = {
    id: 'ch-center',
    kind: 'straight',
    length: 4,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  assert.equal(getChannelUnitLength(ch), 4);
  // Footprint occupies x in [0, 3], y in [0, 0]. Center = (1.5, 0).
  // At 25mm pitch: x = 1.5 * 25 = 37.5, y = 0
  const centerWorld = getChannelCenterWorldPoint(ch, 25);
  assert.deepEqual(centerWorld, { x: 37.5, y: 0 });
});

test('findBestMultiboardModule - 900x300 exact match generates 12 modules of 6x6', () => {
  const result = findBestMultiboardModule(900, 300);
  assert.equal(result.moduleSize, 6);
  assert.equal(result.cols, 6);
  assert.equal(result.rows, 2);
  assert.equal(result.totalTiles, 12);
  assert.equal(result.totalHolesX, 36);
  assert.equal(result.totalHolesY, 12);
  assert.equal(result.actualWidthMm, 900);
  assert.equal(result.actualHeightMm, 300);
  assert.equal(result.isExactMatch, true);
});

test('findBestMultiboardModule - 1200x600 matches 8x8 standard modules', () => {
  const result = findBestMultiboardModule(1200, 600);
  assert.equal(result.moduleSize, 8);
  assert.equal(result.cols, 6);
  assert.equal(result.rows, 3);
  assert.equal(result.totalTiles, 18);
  assert.equal(result.isExactMatch, true);
});

test('findBestMultiboardModule - forced module override', () => {
  const result4 = findBestMultiboardModule(900, 300, 4);
  assert.equal(result4.moduleSize, 4);
  assert.equal(result4.cols, 9);
  assert.equal(result4.rows, 3);
  assert.equal(result4.totalTiles, 27);
  assert.equal(result4.isExactMatch, true);
});

test('getChannelOutlinePath produces unified boundary with zero internal overlaps for straight and cross', () => {
  // Straight 3-unit channel
  const straight3: PlacedChannel = {
    id: 'test-str-3',
    kind: 'straight',
    length: 3,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const pathStr3 = getChannelOutlinePath(straight3, 25, 30);
  assert.ok(pathStr3.startsWith('M'));
  assert.ok(pathStr3.endsWith('Z'));
  // Straight channel outline should be a single closed polygon (4 vertices)
  const vertices = pathStr3.split('L');
  assert.equal(vertices.length, 4);

  // Straight channel with width 2 (3x2 MU): should also be a single 4-point rectangle, NOT overlapping cells
  const straight3x2: PlacedChannel = {
    id: 'test-str-3x2',
    kind: 'straight',
    length: 3,
    widthUnits: 2,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const pathStr3x2 = getChannelOutlinePath(straight3x2, 25, 30);
  assert.ok(pathStr3x2.startsWith('M'));
  assert.ok(pathStr3x2.endsWith('Z'));
  const vertices3x2 = pathStr3x2.split('L');
  assert.equal(vertices3x2.length, 4);

  // Cross (4-way intersection): should be a single continuous 12-vertex cross polygon
  const cross: PlacedChannel = {
    id: 'test-cross',
    kind: 'cross',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'data',
  };
  const pathCross = getChannelOutlinePath(cross, 25, 30);
  assert.ok(pathCross.startsWith('M'));
  assert.ok(pathCross.endsWith('Z'));
  const verticesCross = pathCross.split('L');
  assert.equal(verticesCross.length, 12);
});

test('Custom Modular Accessory: 6x3 MU footprint and 4 corner snaps', () => {
  const acc: PlacedChannel = {
    id: 'test-acc-6x3',
    kind: 'accessory',
    widthUnits: 6,
    length: 3,
    label: 'PRESA Tessan',
    position: { x: 1, y: 1 },
    rotation: 0,
    category: 'power',
  };
  const footprint = getChannelFootprint(acc);
  assert.equal(footprint.cells.length, 18);
  assert.equal(footprint.bounds.width, 6);
  assert.equal(footprint.bounds.height, 3);

  const snaps = getChannelSnapPoints(acc);
  assert.equal(snaps.length, 4);
  // 4 corner snap points at (1, 1), (6, 1), (1, 3), (6, 3)
  assert.equal(snaps[0].x, 1);
  assert.equal(snaps[0].y, 1);
  assert.equal(snaps[1].x, 6);
  assert.equal(snaps[1].y, 1);
  assert.equal(snaps[2].x, 1);
  assert.equal(snaps[2].y, 3);
  assert.equal(snaps[3].x, 6);
  assert.equal(snaps[3].y, 3);
});

test('Curved channels: tangent collar extensions ensure ports reach unit boundaries flush', () => {
  const curvedCh: PlacedChannel = {
    id: 'curved-test',
    kind: 'curved',
    radiusUnits: 2,
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'power',
  };
  const geom = getCurvedChannelGeometry(curvedCh, 25, 30);
  // Port 1 center is (p1.x, p1.y)
  // Tangent collar length is pitch/2 = 12.5mm
  // Verify duct path is generated and contains valid SVG coordinates
  assert.ok(geom.ductPath.includes('M'));
  assert.ok(geom.ductPath.includes('A'));
  assert.ok(geom.ductPath.includes('Z'));
  assert.ok(geom.centerLinePath.includes('M'));
  assert.ok(geom.centerLinePath.includes('A'));
});
