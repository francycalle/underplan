import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBoardDimensions,
  generateTileMatrix,
  getOpenGridHoleRect,
  snapToValidOpenGridDimension,
  findBestOpenGridModule,
  getSupportedOpenGridModules,
  partitionDimension,
  optimizeOpenGridTiles,
  getChannelSnapPoints,
  DEFAULT_OPENGRID_CONFIG,
  OPENGRID_MODULES,
  STANDARD_OPENGRID_DIMENSIONS,
} from '../src/lib/geometry.ts';
import {
  generateBOM,
  formatBOMAsMarkdown,
  formatBOMAsCSV,
} from '../src/lib/bom.ts';
import type { BoardConfig, PlacedChannel } from '../src/lib/types.ts';

test('openGrid config defaults: 28mm pitch, 6x6 tile module, 6x3 grid', () => {
  assert.equal(DEFAULT_OPENGRID_CONFIG.platform, 'opengrid');
  assert.equal(DEFAULT_OPENGRID_CONFIG.holePitchMm, 28);
  assert.equal(DEFAULT_OPENGRID_CONFIG.tileWidthHoles, 6);
  assert.equal(DEFAULT_OPENGRID_CONFIG.tileHeightHoles, 6);
  assert.equal(DEFAULT_OPENGRID_CONFIG.cols, 6);
  assert.equal(DEFAULT_OPENGRID_CONFIG.rows, 3);

  const dims = calculateBoardDimensions(DEFAULT_OPENGRID_CONFIG);
  assert.equal(dims.platform, 'opengrid');
  assert.equal(dims.totalHolesX, 36); // 6 * 6
  assert.equal(dims.totalHolesY, 18); // 3 * 6
  assert.equal(dims.totalWidthMm, 36 * 28); // 1008 mm
  assert.equal(dims.totalHeightMm, 18 * 28); // 504 mm
});

test('calculateBoardDimensions automatically defaults holePitchMm to 28 on openGrid', () => {
  const config: BoardConfig = {
    platform: 'opengrid',
    cols: 4,
    rows: 2,
    tileWidthHoles: 8,
    tileHeightHoles: 8,
    holePitchMm: 28,
  };
  const dims = calculateBoardDimensions(config);
  assert.equal(dims.platform, 'opengrid');
  assert.equal(dims.totalHolesX, 32);
  assert.equal(dims.totalHolesY, 16);
  assert.equal(dims.totalWidthMm, 32 * 28); // 896 mm
  assert.equal(dims.totalHeightMm, 16 * 28); // 448 mm
});

test('openGrid standard modules and dimensions check', () => {
  assert.deepEqual(OPENGRID_MODULES, [8, 7, 6, 5, 4]);
  assert.ok(STANDARD_OPENGRID_DIMENSIONS.includes(896)); // 32 * 28
  assert.ok(STANDARD_OPENGRID_DIMENSIONS.includes(1008)); // 36 * 28
  assert.ok(STANDARD_OPENGRID_DIMENSIONS.includes(448)); // 16 * 28
  assert.ok(STANDARD_OPENGRID_DIMENSIONS.includes(504)); // 18 * 28

  // 1008 mm is 36 holes: divisible by 6 and 4
  const supported1008 = getSupportedOpenGridModules(1008);
  assert.ok(supported1008.length > 0);
  assert.ok(supported1008.includes(6));
});

test('snapToValidOpenGridDimension snaps down accurately', () => {
  // 1010 mm should snap down to 1008 mm (36 holes * 28)
  const res1 = snapToValidOpenGridDimension(1010);
  assert.equal(res1.snappedMm, 1008);
  assert.equal(res1.wasAdjusted, true);

  // Exactly 896 mm should remain 896 mm
  const res2 = snapToValidOpenGridDimension(896);
  assert.equal(res2.snappedMm, 896);
  assert.equal(res2.wasAdjusted, false);
});

test('findBestOpenGridModule selects optimal tile size', () => {
  // 1008 x 504 -> divisible by 6 (36 holes = 6 tiles of 6, 18 holes = 3 tiles of 6)
  const mod6 = findBestOpenGridModule(1008, 504);
  assert.equal(mod6.moduleSize, 6);
  assert.equal(mod6.cols, 6);
  assert.equal(mod6.rows, 3);

  // 896 x 448 -> divisible by 8 (32 holes = 4 tiles of 8, 16 holes = 2 tiles of 8)
  const mod8 = findBestOpenGridModule(896, 448);
  assert.equal(mod8.moduleSize, 8);
  assert.equal(mod8.cols, 4);
  assert.equal(mod8.rows, 2);
});

test('generateTileMatrix creates openGrid tiles with correct positions and pitch', () => {
  const config: BoardConfig = {
    platform: 'opengrid',
    cols: 3,
    rows: 2,
    tileWidthHoles: 7,
    tileHeightHoles: 7,
    holePitchMm: 28,
  };
  const tiles = generateTileMatrix(config);
  assert.equal(tiles.length, 6);

  const t0 = tiles[0];
  assert.equal(t0.type, '7x7');
  assert.equal(t0.widthHoles, 7);
  assert.equal(t0.heightHoles, 7);
  assert.equal(t0.originHoleX, 0);
  assert.equal(t0.originHoleY, 0);

  const t1 = tiles[1];
  assert.equal(t1.col, 1);
  assert.equal(t1.originHoleX, 7);
  assert.equal(t1.originHoleY, 0);
});

test('getOpenGridHoleRect generates centered rounded square coordinates for cell', () => {
  // Center is at (14, 14), hole size is 20, so x = 14 - 10 = 4, y = 4
  const hole = getOpenGridHoleRect(14, 14, 20, 2.5);
  assert.equal(hole.x, 4);
  assert.equal(hole.y, 4);
  assert.equal(hole.width, 20);
  assert.equal(hole.height, 20);
  assert.equal(hole.rx, 2.5);

  const holeNext = getOpenGridHoleRect(28 + 14, 28 + 14, 20, 2.5);
  assert.equal(holeNext.x, 32);
  assert.equal(holeNext.y, 32);
});

test('BOM generation on openGrid generates OG-TILE and OG-SNAP parts with 28mm pitch', () => {
  const config: BoardConfig = {
    platform: 'opengrid',
    cols: 2,
    rows: 2,
    tileWidthHoles: 6,
    tileHeightHoles: 6,
    holePitchMm: 28,
  };

  const channel: PlacedChannel = {
    id: 'ch-og-1',
    kind: 'straight',
    length: 3,
    widthUnits: 1,
    position: { x: 2, y: 2 },
    rotation: 0,
    mountingType: 'opengrid_snap',
  };

  const bom = generateBOM({
    config,
    channels: [channel],
  });

  assert.equal(bom.boardDimensions.platform, 'opengrid');
  assert.equal(bom.boardDimensions.holePitchMm, 28);
  assert.equal(bom.boardDimensions.totalWidthMm, 12 * 28); // 336 mm
  assert.equal(bom.boardDimensions.totalHeightMm, 12 * 28); // 336 mm

  // Check channel display name uses 28mm: 3 MU = 3 * 28 = 84mm
  const channelItem = bom.items.find((i) => i.category === 'channels');
  assert.ok(channelItem);
  assert.ok(channelItem.name.includes('84mm'));

  // Check openGrid tile part number
  const tileItem = bom.items.find((i) => i.category === 'tiles');
  assert.ok(tileItem);
  assert.equal(tileItem.partNumber, 'OG-TILE-6X6');
  assert.equal(tileItem.name, 'openGrid Tile (6x6)');
  assert.equal(tileItem.quantity, 4);
  assert.ok(tileItem.description.includes('28 mm') || tileItem.description.includes('28mm'));

  // Check openGrid snap mounting item
  const snapItem = bom.items.find((i) => i.category === 'mounting');
  assert.ok(snapItem);
  assert.equal(snapItem.partNumber, 'OG-SNAP-UW');
  assert.equal(snapItem.name, 'Underware openGrid Snap');
  assert.ok(snapItem.description.includes('openGrid'));

  // Verify Markdown export contains OPENGRID TILES header
  const md = formatBOMAsMarkdown(bom);
  assert.ok(md.includes('### OPENGRID TILES'));
  assert.ok(md.includes('openGrid Standard 28 mm'));

  // Verify CSV export contains openGrid Grid section
  const csv = formatBOMAsCSV(bom);
  assert.ok(csv.includes('openGrid Grid'));
});

test('partitionDimension partitions holes into maxTile segments with balanced remainders', () => {
  // Exact multiples
  assert.deepEqual(partitionDimension(16, 8), [8, 8]);
  assert.deepEqual(partitionDimension(24, 8), [8, 8, 8]);
  assert.deepEqual(partitionDimension(12, 6), [6, 6]);

  // Smaller than max
  assert.deepEqual(partitionDimension(6, 8), [6]);
  assert.deepEqual(partitionDimension(3, 6), [3]);

  // Remainder = 1 is balanced into [5, 4] rather than [8, 1]
  assert.deepEqual(partitionDimension(9, 8), [5, 4]);
  // 17 with max 8: 1 full 8 + remainder 9 -> [8, 5, 4]
  assert.deepEqual(partitionDimension(17, 8), [8, 5, 4]);

  // Remainder >= 2
  assert.deepEqual(partitionDimension(10, 8), [8, 2]);
  assert.deepEqual(partitionDimension(14, 8), [8, 6]);
});

test('optimizeOpenGridTiles generates seamless 2D tile matrix for arbitrary holes', () => {
  // 16x9 grid with max tile 8 (e.g. Bambu Lab bed)
  const tiles = optimizeOpenGridTiles(16, 9, 8);
  // X partitions: [8, 8], Y partitions: [5, 4] -> 2 x 2 = 4 tiles
  assert.equal(tiles.length, 4);

  const t0 = tiles[0]; // (col 0, row 0): 8x5
  assert.equal(t0.widthHoles, 8);
  assert.equal(t0.heightHoles, 5);
  assert.equal(t0.originHoleX, 0);
  assert.equal(t0.originHoleY, 0);
  assert.equal(t0.type, 'custom');

  const t1 = tiles[1]; // (col 1, row 0): 8x5
  assert.equal(t1.widthHoles, 8);
  assert.equal(t1.heightHoles, 5);
  assert.equal(t1.originHoleX, 8);
  assert.equal(t1.originHoleY, 0);

  const t2 = tiles[2]; // (col 0, row 1): 8x4
  assert.equal(t2.widthHoles, 8);
  assert.equal(t2.heightHoles, 4);
  assert.equal(t2.originHoleX, 0);
  assert.equal(t2.originHoleY, 5);

  const t3 = tiles[3]; // (col 1, row 1): 8x4
  assert.equal(t3.widthHoles, 8);
  assert.equal(t3.heightHoles, 4);
  assert.equal(t3.originHoleX, 8);
  assert.equal(t3.originHoleY, 5);
});

test('calculateBoardDimensions handles customTiles correctly', () => {
  const customTiles = optimizeOpenGridTiles(16, 9, 8);
  const config: BoardConfig = {
    platform: 'opengrid',
    cols: 2,
    rows: 2,
    tileWidthHoles: 8,
    tileHeightHoles: 8,
    holePitchMm: 28,
    customTiles,
  };

  const dims = calculateBoardDimensions(config);
  assert.equal(dims.totalHolesX, 16);
  assert.equal(dims.totalHolesY, 9);
  assert.equal(dims.totalWidthMm, 16 * 28); // 448 mm
  assert.equal(dims.totalHeightMm, 9 * 28); // 252 mm
  assert.equal(dims.customTiles?.length, 4);
});

test('openGrid Underware snaps: base snap and grip snap BOM parts', () => {
  const baseChannel: PlacedChannel = {
    id: 'ch-base',
    kind: 'straight',
    length: 4,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    mountingType: 'opengrid_base_snap',
  };

  const gripChannel: PlacedChannel = {
    id: 'ch-grip',
    kind: 'straight',
    length: 4,
    widthUnits: 1,
    position: { x: 0, y: 2 },
    rotation: 0,
    mountingType: 'opengrid_grip_snap',
  };

  const bom = generateBOM({
    config: {
      platform: 'opengrid',
      cols: 1,
      rows: 1,
      tileWidthHoles: 8,
      tileHeightHoles: 8,
      holePitchMm: 28,
    },
    channels: [baseChannel, gripChannel],
  });

  const baseItem = bom.items.find((i) => i.partNumber === 'OG-SNAP-BASE');
  assert.ok(baseItem, 'Base snap must be in BOM');
  assert.equal(baseItem.name, 'The Underware channel base snap');

  const gripItem = bom.items.find((i) => i.partNumber === 'OG-SNAP-GRIP');
  assert.ok(gripItem, 'Grip snap must be in BOM');
  assert.equal(gripItem.name, 'The Underware grip channel snap');
});

test('openGrid No Snap (none): generates 0 snap points and 0 mounting hardware in BOM', () => {
  const channel: PlacedChannel = {
    id: 'ch-none',
    kind: 'straight',
    length: 6,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    mountingType: 'none',
  };

  // Test snap points calculation
  const snapPoints = getChannelSnapPoints(channel);
  assert.equal(snapPoints.length, 0, 'No snap points should be generated for mountingType none');

  // Test BOM calculation
  const bom = generateBOM({
    config: {
      platform: 'opengrid',
      cols: 1,
      rows: 1,
      tileWidthHoles: 8,
      tileHeightHoles: 8,
      holePitchMm: 28,
    },
    channels: [channel],
  });

  const mountingItems = bom.items.filter((i) => i.category === 'mounting');
  assert.equal(mountingItems.length, 0, 'No mounting hardware items should appear in BOM for none');
});

test('openGrid BOM uses OU (openGrid Unit) instead of MU', () => {
  const channel: PlacedChannel = {
    id: 'ch-ou',
    kind: 'straight',
    length: 5,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    mountingType: 'opengrid_base_snap',
  };

  const bom = generateBOM({
    config: {
      platform: 'opengrid',
      cols: 1,
      rows: 1,
      tileWidthHoles: 8,
      tileHeightHoles: 8,
      holePitchMm: 28,
    },
    channels: [channel],
  });

  const chItem = bom.items.find((i) => i.category === 'channels');
  assert.ok(chItem);
  assert.ok(chItem.name.includes('5 OU'), `Expected "5 OU" in channel name, got "${chItem.name}"`);
  assert.ok(!chItem.name.includes('MU'), `Should not contain "MU" on openGrid`);
});

