import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBoardDimensions,
  DEFAULT_BOARD_CONFIG,
  doChannelsCollide,
  findCollisions,
  isChannelOutOfBounds,
  getOutOfBoundsCells,
  canPlaceChannel,
  getChannelFootprint,
  getChannelSnapPoints,
  getMultiboardOctagonPoints,
} from '../src/lib/geometry.ts';
import {
  generateBOM,
  formatBOMAsCSV,
  formatBOMAsMarkdown,
  formatBOMAsJSON,
  aggregateSnapConnectors,
} from '../src/lib/bom.ts';
import { DEMO_CHANNELS } from '../src/data/demoLayout.ts';
import type { PlacedChannel, BoardState } from '../src/lib/types.ts';

// ----------------------------------------------------------------------------
// AC-1 & AC-3: Board Dimensions & Multiboard Standard 25mm Lattice
// ----------------------------------------------------------------------------
test('AC-1 & AC-3: Default Multiboard 6x3 configuration matches KeepMaking 25mm standard', () => {
  const dims = calculateBoardDimensions(DEFAULT_BOARD_CONFIG);
  assert.equal(dims.totalCols, 6);
  assert.equal(dims.totalRows, 3);
  assert.equal(dims.totalHolesX, 48); // 6 * 8 holes
  assert.equal(dims.totalHolesY, 24); // 3 * 8 holes
  assert.equal(dims.totalWidthMm, 1200); // 48 * 25mm
  assert.equal(dims.totalHeightMm, 600); // 24 * 25mm

  // Octagon generation produces 8 coordinates
  const octagonPoints = getMultiboardOctagonPoints(25, 25, 8.0);
  const coords = octagonPoints.split(' ');
  assert.equal(coords.length, 8, 'Octagon must have exactly 8 vertices');
});

// ----------------------------------------------------------------------------
// AC-4: Channel Footprints, Dimensions & Rotations
// ----------------------------------------------------------------------------
test('AC-4: Channel footprint calculations for Straight, Corner, and Junction', () => {
  // Straight 2-unit at (0, 0), rot 0
  const s2: PlacedChannel = {
    id: 's2',
    kind: 'straight',
    length: 2,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const fpS2 = getChannelFootprint(s2);
  assert.equal(fpS2.cells.length, 2);
  assert.deepEqual(fpS2.cells, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  assert.equal(fpS2.bounds.width, 2);
  assert.equal(fpS2.bounds.height, 1);

  // Straight 2-unit rotated 90°
  const s2Rot: PlacedChannel = { ...s2, rotation: 90 };
  const fpS2Rot = getChannelFootprint(s2Rot);
  assert.equal(fpS2Rot.cells.length, 2);
  assert.deepEqual(fpS2Rot.cells, [{ x: 0, y: 0 }, { x: 0, y: 1 }]);
  assert.equal(fpS2Rot.bounds.width, 1);
  assert.equal(fpS2Rot.bounds.height, 2);

  // Corner 2x2 footprint
  const c: PlacedChannel = {
    id: 'c1',
    kind: 'corner',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'data',
  };
  const fpC = getChannelFootprint(c);
  assert.equal(fpC.cells.length, 3);
  assert.equal(fpC.bounds.width, 2);
  assert.equal(fpC.bounds.height, 2);

  // Junction 3x2 footprint
  const j: PlacedChannel = {
    id: 'j1',
    kind: 'junction',
    position: { x: 5, y: 5 },
    rotation: 0,
    category: 'video',
  };
  const fpJ = getChannelFootprint(j);
  assert.equal(fpJ.cells.length, 4);
  assert.equal(fpJ.bounds.width, 3);
  assert.equal(fpJ.bounds.height, 2);
});

// ----------------------------------------------------------------------------
// AC-5: Collision & Validation Engine
// ----------------------------------------------------------------------------
test('AC-5: Collision detection, Out-of-bounds warning, and Valid placement', () => {
  const ch1: PlacedChannel = {
    id: 'ch1',
    kind: 'straight',
    length: 3,
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'power',
  };
  const chOverlap: PlacedChannel = {
    id: 'ch2',
    kind: 'straight',
    length: 2,
    position: { x: 3, y: 2 }, // overlaps on cell (3, 2)
    rotation: 0,
    category: 'data',
  };
  const chApart: PlacedChannel = {
    id: 'ch3',
    kind: 'straight',
    length: 2,
    position: { x: 2, y: 5 }, // completely separate
    rotation: 0,
    category: 'network',
  };

  assert.equal(doChannelsCollide(ch1, chOverlap), true, 'Channels sharing cell (3,2) must collide');
  assert.equal(doChannelsCollide(ch1, chApart), false, 'Separated channels must not collide');

  const collisions = findCollisions([ch1, chOverlap, chApart]);
  assert.equal(collisions.hasCollision, true);
  assert.equal(collisions.collidingChannelIds.length, 1);
  assert.equal(collisions.overlapCells.length, 2, 'Two cells (3,2) and (4,2) overlap');
  assert.deepEqual(collisions.overlapCells, [{ x: 3, y: 2 }, { x: 4, y: 2 }]);

  // Out of bounds check: placed at edge (46, 0) length 3 extends to 48, max is 47
  const chOOB: PlacedChannel = {
    id: 'ch-oob',
    kind: 'straight',
    length: 3,
    position: { x: 46, y: 0 },
    rotation: 0,
    category: 'neutral',
  };
  assert.equal(isChannelOutOfBounds(chOOB, DEFAULT_BOARD_CONFIG), true);
  const oobCells = getOutOfBoundsCells(chOOB, DEFAULT_BOARD_CONFIG);
  assert.equal(oobCells.length, 1);
  assert.deepEqual(oobCells[0], { x: 48, y: 0 });

  // canPlaceChannel validity checks
  const validityColliding = canPlaceChannel(chOverlap, [ch1], DEFAULT_BOARD_CONFIG);
  assert.equal(validityColliding.hasCollisions, true);
  assert.equal(validityColliding.isValid, false);

  const validityOOB = canPlaceChannel(chOOB, [], DEFAULT_BOARD_CONFIG);
  assert.equal(validityOOB.isOutOfBounds, true);
  assert.equal(validityOOB.isValid, false);

  const validityValid = canPlaceChannel(chApart, [ch1], DEFAULT_BOARD_CONFIG);
  assert.equal(validityValid.isValid, true);
  assert.equal(validityValid.hasCollisions, false);
  assert.equal(validityValid.isOutOfBounds, false);
});

// ----------------------------------------------------------------------------
// AC-6 & AC-7: Dynamic Bill of Materials & +10% Spare Rule
// ----------------------------------------------------------------------------
test('AC-6 & AC-7: Dynamic BOM calculation with +10% spare rounded up', () => {
  const channels: PlacedChannel[] = [
    { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' }, // 2 snaps
    { id: '2', kind: 'straight', length: 4, position: { x: 0, y: 2 }, rotation: 0, category: 'power' }, // 3 snaps
    { id: '3', kind: 'corner', position: { x: 5, y: 5 }, rotation: 0, category: 'data' },             // 2 snaps
    { id: '4', kind: 'junction', position: { x: 10, y: 10 }, rotation: 0, category: 'video' },        // 3 snaps
  ];

  // Base snaps = 2 + 3 + 2 + 3 = 10 snaps
  // 10% of 10 = 1.0 -> ceil(1.0) = 1 spare snap
  // Total with spares = 11 snaps
  const snapResult = aggregateSnapConnectors(channels, 10);
  assert.equal(snapResult.baseCount, 10);
  assert.equal(snapResult.spareCount, 1);
  assert.equal(snapResult.totalCount, 11);

  // Test odd count spare rounding: 7 base snaps -> 10% = 0.7 -> ceil(0.7) = 1 spare
  const oddChannels = channels.slice(0, 3); // 2 + 3 + 2 = 7 snaps
  const oddSnapResult = aggregateSnapConnectors(oddChannels, 10);
  assert.equal(oddSnapResult.baseCount, 7);
  assert.equal(oddSnapResult.spareCount, 1);
  assert.equal(oddSnapResult.totalCount, 8);

  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    channels,
    selectedChannelId: null,
  };
  const bom = generateBOM(boardState);
  assert.equal(bom.summary.totalChannels, 4);
  assert.equal(bom.summary.totalTiles, 18);
  assert.equal(bom.summary.baseSnapCount, 10);
  assert.equal(bom.summary.spareSnapCount, 1);
  assert.equal(bom.summary.totalSnapCountWithSpares, 11);
  assert.equal(bom.summary.channelsByCategory.power, 2);
  assert.equal(bom.summary.channelsByCategory.data, 1);
  assert.equal(bom.summary.channelsByCategory.video, 1);
});

// ----------------------------------------------------------------------------
// AC-8: CSV & Text Format Export
// ----------------------------------------------------------------------------
test('AC-8: CSV export RFC-4180 conformity and Markdown formatted output', () => {
  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    channels: [
      { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
    ],
    selectedChannelId: null,
  };
  const bom = generateBOM(boardState);
  const csv = formatBOMAsCSV(bom);

  // Verify CSV headers
  assert.ok(csv.startsWith('"Section","Part / Component","Category","Quantity","Details / Mounting"'));
  
  // Verify CSV line items include tile, channel, and mounting hardware
  assert.ok(csv.includes('Multiboard Standard Tile (8x8)'));
  assert.ok(csv.includes('Straight Channel'));
  assert.ok(csv.includes('Underware Threaded Snap'));

  // Verify Markdown formatting contains summary and itemized table
  const md = formatBOMAsMarkdown(bom);
  assert.ok(md.includes('Bill of Materials (BOM)'));
  assert.ok(md.includes('Multiboard Standard Tile (8x8)'));
  assert.ok(md.includes('+10%'));

  // Verify JSON output
  const json = formatBOMAsJSON(bom);
  const parsed = JSON.parse(json);
  assert.equal(parsed.summary.totalTiles, 18);
});

// ----------------------------------------------------------------------------
// AC-9: Demo Layout Quality & Constraints Verification
// ----------------------------------------------------------------------------
test('AC-9: Demo layout satisfies all MVP portfolio constraints', () => {
  assert.ok(DEMO_CHANNELS.length >= 6, 'Demo layout must have sufficient channels');

  // Verify longer horizontal main channel exists (length >= 4)
  const longChannels = DEMO_CHANNELS.filter((c) => c.kind === 'straight' && (c.length ?? 0) >= 4);
  assert.ok(longChannels.length >= 1, 'Must have at least one longer horizontal main channel');

  // Verify at least one L-turn
  const lTurns = DEMO_CHANNELS.filter((c) => c.kind === 'corner');
  assert.ok(lTurns.length >= 1, 'Must have at least one L-turn');

  // Verify at least one T-junction
  const tJunctions = DEMO_CHANNELS.filter((c) => c.kind === 'junction');
  assert.ok(tJunctions.length >= 1, 'Must have at least one T-junction');

  // Verify at least two categories
  const categories = new Set(DEMO_CHANNELS.map((c) => c.category));
  assert.ok(categories.size >= 2, 'Must have at least two distinct categories');

  // Verify zero collisions in demo layout
  const demoCollisions = findCollisions(DEMO_CHANNELS);
  assert.equal(demoCollisions.hasCollision, false, 'Demo layout must have ZERO collisions');

  // Verify zero out-of-bounds in demo layout
  for (const ch of DEMO_CHANNELS) {
    assert.equal(
      isChannelOutOfBounds(ch, DEFAULT_BOARD_CONFIG),
      false,
      `Channel ${ch.id} in demo layout must be within board bounds`
    );
  }

  // Verify nonzero BOM counts
  const demoBOM = generateBOM({
    config: DEFAULT_BOARD_CONFIG,
    channels: DEMO_CHANNELS,
    selectedChannelId: null,
  });
  assert.ok(demoBOM.summary.totalChannels > 0);
  assert.ok(demoBOM.summary.baseSnapCount > 0);
  assert.ok(demoBOM.summary.totalSnapCountWithSpares > demoBOM.summary.baseSnapCount);
});

// ----------------------------------------------------------------------------
// AC-2: Empty State & Zero-Channel Lifecycle
// ----------------------------------------------------------------------------
test('AC-2: Empty state initializes cleanly with 0 channels and valid tile matrix', () => {
  const emptyBoardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    channels: [],
    selectedChannelId: null,
  };

  const emptyCollisions = findCollisions(emptyBoardState.channels);
  assert.equal(emptyCollisions.hasCollision, false);
  assert.equal(emptyCollisions.collidingChannelIds.length, 0);

  const emptyBOM = generateBOM(emptyBoardState);
  assert.equal(emptyBOM.summary.totalChannels, 0);
  assert.equal(emptyBOM.summary.baseSnapCount, 0);
  assert.equal(emptyBOM.summary.spareSnapCount, 0);
  assert.equal(emptyBOM.summary.totalSnapCountWithSpares, 0);
  assert.equal(emptyBOM.summary.totalTiles, 18);
  assert.equal(emptyBOM.items.length, 1); // Only the tiles BOM item
  assert.equal(emptyBOM.items[0].category, 'tiles');

  const emptyMarkdown = formatBOMAsMarkdown(emptyBOM);
  assert.ok(emptyMarkdown.includes('Multiboard Standard Tile (8x8)'));
  assert.ok(!emptyMarkdown.includes('Straight Channel'));
});

// ----------------------------------------------------------------------------
// AC-4 (Extended): 4-Way Cross Footprint & Snap Requirements
// ----------------------------------------------------------------------------
test('AC-4 (Extended): Cross channel 4-way intersection geometry', () => {
  const crossChannel: PlacedChannel = {
    id: 'cross-1',
    kind: 'cross',
    position: { x: 10, y: 10 },
    rotation: 0,
    category: 'neutral',
  };

  const fp = getChannelFootprint(crossChannel);
  assert.equal(fp.cells.length, 5, 'Cross channel occupies 5 grid holes (+ shape)');
  assert.equal(fp.bounds.width, 3);
  assert.equal(fp.bounds.height, 3);

  const snaps = getChannelSnapPoints(crossChannel);
  assert.equal(snaps.length, 4, 'Cross channel has 4 snap connector points');
});

// ----------------------------------------------------------------------------
// AC-10: Domain Disclaimers & Unofficial Transparency
// ----------------------------------------------------------------------------
test('AC-10: Domain disclaimers and transparent assumptions present in generated output', () => {
  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    channels: DEMO_CHANNELS,
    selectedChannelId: null,
  };
  const bom = generateBOM(boardState);
  const md = formatBOMAsMarkdown(bom);

  // Must contain clear statement that it is based on KeepMaking Multiboard standards
  assert.ok(md.includes('Multiboard'));
  assert.ok(md.includes('25 mm'));
  // Must document +10% spare rule for 3D printing
  assert.ok(md.includes('+10%') || md.includes('spare') || md.includes('scorta'));
  // Must contain unofficial prototype disclaimer
  assert.ok(md.includes('Indicative planning estimates') || md.includes('Stime di pianificazione indicative') || md.includes('Underplan'));
});

