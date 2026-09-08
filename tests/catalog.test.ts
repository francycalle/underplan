import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getChannelPartNumber,
  getChannelDisplayName,
  getChannelDescription,
  aggregateChannels,
  generateBOM,
} from '../src/lib/bom.ts';
import {
  getCanonicalChannelSpec,
  getChannelFootprint,
  getChannelSnapPoints,
  doChannelsCollide,
  DEFAULT_BOARD_CONFIG,
  generateTileMatrix,
  getCurvedChannelGeometry,
  getYBranchChannelGeometry,
  getChannelUnitLength,
} from '../src/lib/geometry.ts';
import type { PlacedChannel, BoardState } from '../src/lib/types.ts';

// ----------------------------------------------------------------------------
// 1. All 8 Pieces Part Numbers & Naming
// ----------------------------------------------------------------------------

test('Official Underware 2.0: Part numbers for all 8 channel families', () => {
  // 1. Straight
  assert.equal(getChannelPartNumber('straight', 4), 'MB-CHAN-STR-4U');
  assert.equal(getChannelPartNumber('straight', 8, 2, 2), 'MB-CHAN-STR-8U-W2-H2');

  // 2. Corner (L)
  assert.equal(getChannelPartNumber('corner', undefined, 1, 1, 2), 'MB-CHAN-CNR-2X2');
  assert.equal(getChannelPartNumber('corner', undefined, 1, 1, 4), 'MB-CHAN-CNR-4X4');

  // 3. Cross (X)
  assert.equal(getChannelPartNumber('cross'), 'MB-CHAN-CRS-3X3');

  // 4. Junction (T)
  assert.equal(getChannelPartNumber('junction', undefined, 1, 1, undefined, 3, 2), 'MB-CHAN-JNC-3X2');
  assert.equal(getChannelPartNumber('junction', undefined, 1, 1, undefined, 5, 3), 'MB-CHAN-JNC-5X3');

  // 5. Curved (Radial)
  assert.equal(
    getChannelPartNumber('curved', undefined, 1, 1, undefined, undefined, undefined, 2),
    'MB-CHAN-CRV-R2U'
  );
  assert.equal(
    getChannelPartNumber('curved', undefined, 1, 1, undefined, undefined, undefined, 3),
    'MB-CHAN-CRV-R3U'
  );
  assert.equal(
    getChannelPartNumber('curved', undefined, 2, 1, undefined, undefined, undefined, 4),
    'MB-CHAN-CRV-R4U-W2'
  );

  // 6. Y-Split
  assert.equal(
    getChannelPartNumber('y_split', undefined, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 2, 2),
    'MB-CHAN-YSPL-2X2U'
  );
  assert.equal(
    getChannelPartNumber('y_split', undefined, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 4, 2),
    'MB-CHAN-YSPL-4X2U'
  );

  // 7. Diagonal (Jog)
  assert.equal(
    getChannelPartNumber('diagonal', 3, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, 1),
    'MB-CHAN-DIAG-3X1U'
  );
  assert.equal(
    getChannelPartNumber('diagonal', 5, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, 2),
    'MB-CHAN-DIAG-5X2U'
  );

  // 8. Mitred
  assert.equal(
    getChannelPartNumber('mitred', undefined, 1, 1, undefined, undefined, undefined, undefined, 2, 2),
    'MB-CHAN-MTR-2X2U'
  );
  assert.equal(
    getChannelPartNumber('mitred', undefined, 1, 1, undefined, undefined, undefined, undefined, 4, 3),
    'MB-CHAN-MTR-4X3U'
  );
});

test('Official Underware 2.0: Display names and descriptions', () => {
  const nameCurved = getChannelDisplayName('curved', undefined, 25, 1, 1, undefined, undefined, undefined, 3);
  assert.ok(nameCurved.includes('Radial Curved'));
  assert.ok(nameCurved.includes('R3 MU'));
  assert.ok(nameCurved.includes('R75mm'));

  const descCurved = getChannelDescription('curved', undefined, 3);
  assert.ok(descCurved.includes('curved') || descCurved.includes('radius'));

  const nameYSplit = getChannelDisplayName('y_split', undefined, 25, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 2, 2);
  assert.ok(nameYSplit.includes('Y-Split'));
  assert.ok(nameYSplit.includes('2×2 MU'));

  const nameDiag = getChannelDisplayName('diagonal', 4, 25, 1, 1, undefined, undefined, undefined, undefined, undefined, undefined, 1);
  assert.ok(nameDiag.includes('Diagonal Channel'));
  assert.ok(nameDiag.includes('4×1 MU'));

  const nameMitred = getChannelDisplayName('mitred', undefined, 25, 1, 1, undefined, undefined, undefined, undefined, 3, 3);
  assert.ok(nameMitred.includes('Mitered Corner'));
  assert.ok(nameMitred.includes('3×3 MU'));
});

// ----------------------------------------------------------------------------
// 2. Geometry & Footprints for New Channel Types
// ----------------------------------------------------------------------------

test('Curved channels (R2 to R5): footprint and snap points', () => {
  // R2 curved channel: 2x2 bounding box, terminal snaps at (0,0) and (1,1)
  const specR2 = getCanonicalChannelSpec('curved', undefined, 1, 2, 3, 2, 2);
  assert.equal(specR2.width, 2);
  assert.equal(specR2.height, 2);
  assert.equal(specR2.snapIndices.length, 2);
  assert.deepEqual(specR2.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(specR2.snapIndices[1], { x: 1, y: 1 });

  // R3 curved channel
  const specR3 = getCanonicalChannelSpec('curved', undefined, 1, 2, 3, 2, 3);
  assert.equal(specR3.width, 3);
  assert.equal(specR3.height, 3);
  assert.equal(specR3.snapIndices.length, 2);
  assert.deepEqual(specR3.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(specR3.snapIndices[1], { x: 2, y: 2 });

  // R4 curved channel: includes intermediate support snap
  const specR4 = getCanonicalChannelSpec('curved', undefined, 1, 2, 3, 2, 4);
  assert.equal(specR4.width, 4);
  assert.equal(specR4.height, 4);
  assert.ok(specR4.snapIndices.length >= 3);
});

test('Y-Split channels: 3-port geometry and snaps', () => {
  const specY = getCanonicalChannelSpec('y_split', undefined, 1, 2, 3, 2, 2, 2, 2, 1, 2, 2);
  assert.equal(specY.width, 3);
  assert.equal(specY.height, 4); // 2 (branches/junction) + 2 (trunk)
  assert.equal(specY.snapIndices.length, 3); // Left branch, Right branch, Trunk end
  assert.deepEqual(specY.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(specY.snapIndices[1], { x: 2, y: 0 });
  assert.deepEqual(specY.snapIndices[2], { x: 1, y: 3 });
});

test('Diagonal (jog) channels: footprint and snap points', () => {
  const specDiag = getCanonicalChannelSpec('diagonal', 3, 1, 2, 3, 2, 2, 2, 2, 1);
  assert.equal(specDiag.width, 3);
  assert.equal(specDiag.height, 2);
  assert.equal(specDiag.snapIndices.length, 2);
  assert.deepEqual(specDiag.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(specDiag.snapIndices[1], { x: 2, y: 1 });
});

test('Mitred corner channels: 90° geometry with miter diagonal', () => {
  const specMtr = getCanonicalChannelSpec('mitred', undefined, 1, 2, 3, 2, 2, 3, 3);
  assert.equal(specMtr.width, 3);
  assert.equal(specMtr.height, 3);
  assert.equal(specMtr.snapIndices.length, 2);
  assert.deepEqual(specMtr.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(specMtr.snapIndices[1], { x: 2, y: 2 });
});

// ----------------------------------------------------------------------------
// 3. Rotations & Placed Channels Integration
// ----------------------------------------------------------------------------

test('Rotation of curved and Y-split channels', () => {
  const curvedCh: PlacedChannel = {
    id: 'test-curved-1',
    kind: 'curved',
    position: { x: 4, y: 4 },
    rotation: 90,
    category: 'power',
    radiusUnits: 3,
  };

  const fp = getChannelFootprint(curvedCh);
  assert.equal(fp.bounds.width, 3);
  assert.equal(fp.bounds.height, 3);
  assert.equal(fp.bounds.minX, 4);
  assert.equal(fp.bounds.minY, 4);

  const snaps = getChannelSnapPoints(curvedCh);
  assert.equal(snaps.length, 2);
});

test('Collision detection between new Underware channel models', () => {
  const chCurved: PlacedChannel = {
    id: 'ch-curved',
    kind: 'curved',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'power',
    radiusUnits: 3,
  };

  const chStraightOverlapping: PlacedChannel = {
    id: 'ch-str',
    kind: 'straight',
    length: 4,
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'data',
  };

  const chFarAway: PlacedChannel = {
    id: 'ch-far',
    kind: 'mitred',
    position: { x: 10, y: 10 },
    rotation: 0,
    category: 'video',
    mitreArmA: 2,
    mitreArmB: 2,
  };

  assert.equal(doChannelsCollide(chCurved, chStraightOverlapping), true);
  assert.equal(doChannelsCollide(chCurved, chFarAway), false);
});

// ----------------------------------------------------------------------------
// 4. BOM Aggregation with All 8 Underware Pieces
// ----------------------------------------------------------------------------

test('Comprehensive BOM generation with all 8 Underware channel families', () => {
  const allChannels: PlacedChannel[] = [
    { id: '1', kind: 'straight', length: 4, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
    { id: '2', kind: 'corner', armSpanUnits: 2, position: { x: 5, y: 0 }, rotation: 0, category: 'power' },
    { id: '3', kind: 'junction', trunkSpanUnits: 3, branchSpanUnits: 2, position: { x: 8, y: 0 }, rotation: 0, category: 'data' },
    { id: '4', kind: 'cross', position: { x: 12, y: 0 }, rotation: 0, category: 'video' },
    { id: '5', kind: 'curved', radiusUnits: 3, position: { x: 16, y: 0 }, rotation: 0, category: 'network' },
    { id: '6', kind: 'y_split', yTrunkUnits: 2, yBranchUnits: 2, position: { x: 20, y: 0 }, rotation: 0, category: 'power' },
    { id: '7', kind: 'diagonal', length: 3, offsetUnits: 1, position: { x: 24, y: 0 }, rotation: 0, category: 'data' },
    { id: '8', kind: 'mitred', mitreArmA: 3, mitreArmB: 3, position: { x: 28, y: 0 }, rotation: 0, category: 'video' },
  ];

  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    tiles: generateTileMatrix(DEFAULT_BOARD_CONFIG),
    channels: allChannels,
    selectedChannelId: null,
  };

  const bom = generateBOM(boardState, 10);
  assert.equal(bom.summary.totalChannels, 8);
  assert.equal(bom.summary.channelsByKind.straight, 1);
  assert.equal(bom.summary.channelsByKind.corner, 1);
  assert.equal(bom.summary.channelsByKind.junction, 1);
  assert.equal(bom.summary.channelsByKind.cross, 1);
  assert.equal(bom.summary.channelsByKind.curved, 1);
  assert.equal(bom.summary.channelsByKind.y_split, 1);
  assert.equal(bom.summary.channelsByKind.diagonal, 1);
  assert.equal(bom.summary.channelsByKind.mitred, 1);

  // Check that all 8 part numbers exist in BOM items
  const channelItems = aggregateChannels(allChannels, 25);
  assert.equal(channelItems.length, 8);
  const partNumbers = channelItems.map((item) => item.partNumber);
  assert.ok(partNumbers.includes('MB-CHAN-STR-4U'));
  assert.ok(partNumbers.includes('MB-CHAN-CNR-2X2'));
  assert.ok(partNumbers.includes('MB-CHAN-JNC-3X2'));
  assert.ok(partNumbers.includes('MB-CHAN-CRS-3X3'));
  assert.ok(partNumbers.includes('MB-CHAN-CRV-R3U'));
  assert.ok(partNumbers.includes('MB-CHAN-YSPL-2X2U'));
  assert.ok(partNumbers.includes('MB-CHAN-DIAG-3X1U'));
  assert.ok(partNumbers.includes('MB-CHAN-MTR-3X3U'));

  // Ensure threaded snaps are counted with 10% spare
  assert.ok(bom.summary.totalSnapCountWithSpares > bom.summary.baseSnapCount);
});

// ----------------------------------------------------------------------------
// 5. New Accessories: Cable Spool 3x6 & Tessan Socket Holder 6x6
// ----------------------------------------------------------------------------

test('Underware Cable Spool 3x6: footprint, 4 corner snaps, and BOM', () => {
  const spec = getCanonicalChannelSpec('spool');
  assert.equal(spec.width, 3);
  assert.equal(spec.height, 6);
  assert.equal(spec.cells.length, 18); // 3x6 = 18 cells
  assert.equal(spec.snapIndices.length, 4); // 4 corner snaps
  assert.deepEqual(spec.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(spec.snapIndices[1], { x: 2, y: 0 });
  assert.deepEqual(spec.snapIndices[2], { x: 0, y: 5 });
  assert.deepEqual(spec.snapIndices[3], { x: 2, y: 5 });

  const ch: PlacedChannel = {
    id: 'ch-spool-test',
    kind: 'spool',
    position: { x: 2, y: 3 },
    rotation: 0,
    category: 'power',
  };

  const fp = getChannelFootprint(ch);
  assert.equal(fp.cells.length, 18);
  assert.equal(fp.bounds.width, 3);
  assert.equal(fp.bounds.height, 6);
  assert.equal(fp.bounds.minX, 2);
  assert.equal(fp.bounds.minY, 3);

  const snaps = getChannelSnapPoints(ch);
  assert.equal(snaps.length, 4);
  assert.deepEqual(snaps[0], { x: 2, y: 3, channelId: 'ch-spool-test', localIndex: 0, isTerminal: true, mountingType: 'threaded_snap' });
  assert.deepEqual(snaps[1], { x: 4, y: 3, channelId: 'ch-spool-test', localIndex: 1, isTerminal: false, mountingType: 'threaded_snap' });
  assert.deepEqual(snaps[2], { x: 2, y: 8, channelId: 'ch-spool-test', localIndex: 2, isTerminal: false, mountingType: 'threaded_snap' });
  assert.deepEqual(snaps[3], { x: 4, y: 8, channelId: 'ch-spool-test', localIndex: 3, isTerminal: true, mountingType: 'threaded_snap' });

  // 90° rotation test: bounds become 6x3
  const chRot90: PlacedChannel = {
    ...ch,
    rotation: 90,
  };
  const fp90 = getChannelFootprint(chRot90);
  assert.equal(fp90.bounds.width, 6);
  assert.equal(fp90.bounds.height, 3);

  // Catalog naming and unit length
  assert.equal(getChannelPartNumber('spool'), 'UW-SPOOL-3X6');
  assert.ok(getChannelDisplayName('spool').includes('Cable Spool'));
  assert.ok(getChannelDisplayName('spool').includes('3×6 MU'));
  assert.ok(getChannelDisplayName('spool').includes('75×150mm'));
  assert.ok(getChannelDescription('spool').toLowerCase().includes('cable spool') || getChannelDescription('spool').includes('slack management'));
  assert.equal(getChannelUnitLength(ch), 6);
});

test('Tessan USB Multi-Socket Holder 6x6: footprint, 4 corner snaps, and BOM', () => {
  const spec = getCanonicalChannelSpec('socket_holder');
  assert.equal(spec.width, 6);
  assert.equal(spec.height, 6);
  assert.equal(spec.cells.length, 36); // 6x6 = 36 cells
  assert.equal(spec.snapIndices.length, 4); // 4 corner snaps
  assert.deepEqual(spec.snapIndices[0], { x: 0, y: 0 });
  assert.deepEqual(spec.snapIndices[1], { x: 5, y: 0 });
  assert.deepEqual(spec.snapIndices[2], { x: 0, y: 5 });
  assert.deepEqual(spec.snapIndices[3], { x: 5, y: 5 });

  const ch: PlacedChannel = {
    id: 'ch-socket-test',
    kind: 'socket_holder',
    position: { x: 10, y: 5 },
    rotation: 0,
    category: 'power',
  };

  const fp = getChannelFootprint(ch);
  assert.equal(fp.cells.length, 36);
  assert.equal(fp.bounds.width, 6);
  assert.equal(fp.bounds.height, 6);

  const snaps = getChannelSnapPoints(ch);
  assert.equal(snaps.length, 4);

  // Catalog naming and unit length
  assert.equal(getChannelPartNumber('socket_holder'), 'MB-HLDR-TESSAN-6X6');
  assert.ok(getChannelDisplayName('socket_holder').includes('Tessan'));
  assert.ok(getChannelDisplayName('socket_holder').includes('6×6 MU'));
  assert.ok(getChannelDisplayName('socket_holder').includes('150×150mm'));
  assert.ok(getChannelDescription('socket_holder').includes('Tessan'));
  assert.equal(getChannelUnitLength(ch), 6);
});

test('Curved channels: smooth SVG geometry calculation across all 4 rotations', () => {
  for (const rot of [0, 90, 180, 270] as const) {
    const ch: PlacedChannel = {
      id: `test-curved-rot-${rot}`,
      kind: 'curved',
      radiusUnits: 3,
      position: { x: 5, y: 5 },
      rotation: rot,
      category: 'data',
    };

    const geom = getCurvedChannelGeometry(ch, 25, 30);
    assert.equal(geom.rc, 50); // (3 - 1) * 25 = 50
    assert.ok(geom.rOuter > geom.rc); // Outer radius includes channel wall
    assert.ok(geom.rInner < geom.rc); // Inner radius inside channel wall
    assert.ok(geom.rInner > 0);
    assert.ok(geom.ductPath.startsWith('M'));
    assert.ok(geom.ductPath.includes('A'));
    assert.ok(geom.ductPath.includes('L'));
    assert.ok(geom.ductPath.includes('Z'));
    assert.ok(geom.centerLinePath.startsWith('M'));
    assert.ok(geom.centerLinePath.includes('A'));
  }
});

test('BOM generation with spool and socket_holder accessories', () => {
  const channels: PlacedChannel[] = [
    { id: 'spool-1', kind: 'spool', position: { x: 0, y: 0 }, rotation: 0, category: 'data' },
    { id: 'holder-1', kind: 'socket_holder', position: { x: 6, y: 0 }, rotation: 0, category: 'power' },
  ];

  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    tiles: generateTileMatrix(DEFAULT_BOARD_CONFIG),
    channels,
    selectedChannelId: null,
  };

  const bom = generateBOM(boardState, 10);
  assert.equal(bom.summary.totalChannels, 2);
  assert.equal(bom.summary.channelsByKind.spool, 1);
  assert.equal(bom.summary.channelsByKind.socket_holder, 1);

  const items = bom.items.filter((i) => i.category === 'channels');
  assert.equal(items.length, 2);
  const partNums = items.map((i) => i.partNumber);
  assert.ok(partNums.includes('UW-SPOOL-3X6'));
  assert.ok(partNums.includes('MB-HLDR-TESSAN-6X6'));

  // Each accessory has 4 snaps -> 8 base snaps + 10% spare (ceil(8 * 0.1) = 1) -> 9 total snaps
  assert.equal(bom.summary.baseSnapCount, 8);
  assert.equal(bom.summary.spareSnapCount, 1);
  assert.equal(bom.summary.totalSnapCountWithSpares, 9);
});

test('Y-Branch faceted 45-degree CAD geometry and central innesto wedge divider', () => {
  for (const rot of [0, 90, 180, 270] as const) {
    const channel: PlacedChannel = {
      id: `y-chan-${rot}`,
      kind: 'y_split',
      position: { x: 4, y: 4 },
      rotation: rot,
      category: 'data',
      yTrunkUnits: 2,
      yBranchUnits: 2,
    };

    const geom = getYBranchChannelGeometry(channel, 25, 30);
    // Perimeter duct path is a continuous polygonal SVG path with 45° chamfers, straight lines (L) and closure (Z)
    assert.ok(geom.ductPath.startsWith('M'));
    assert.ok(geom.ductPath.includes('L'));
    assert.ok(geom.ductPath.includes('Z'));

    // Dual cable branch centerlines
    assert.ok(geom.leftCenterLinePath.startsWith('M'));
    assert.ok(geom.leftCenterLinePath.includes('L'));
    assert.ok(geom.rightCenterLinePath.startsWith('M'));
    assert.ok(geom.rightCenterLinePath.includes('L'));

    // Central innesto divider wedge / ridge
    assert.ok(geom.innestoPath.startsWith('M'));
    assert.ok(geom.innestoPath.includes('L'));
    assert.ok(geom.innestoPath.includes('Z'));
  }
});

test('Curved radial channel width is exactly equal to straight channel pitch (25mm for 1 MU, 50mm for 2 MU)', () => {
  const channel1MU: PlacedChannel = {
    id: 'crv-1mu',
    kind: 'curved',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'power',
    radiusUnits: 3,
    widthUnits: 1,
  };
  const geom1MU = getCurvedChannelGeometry(channel1MU, 25, 30);
  assert.equal(Number((geom1MU.rOuter - geom1MU.rInner).toFixed(2)), 25);

  const channel2MU: PlacedChannel = {
    id: 'crv-2mu',
    kind: 'curved',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'power',
    radiusUnits: 3,
    widthUnits: 2,
  };
  const geom2MU = getCurvedChannelGeometry(channel2MU, 25, 30);
  assert.equal(Number((geom2MU.rOuter - geom2MU.rInner).toFixed(2)), 50);
});

test('Custom accessory displays strictly in NXN MU without millimeters in BOM', () => {
  const name = getChannelDisplayName('accessory', 3, 25, 6);
  assert.equal(name, 'Custom Accessory 6×3 MU');
  assert.ok(!name.includes('mm'));
});

test('Custom accessory with label displays exact accessory name in BOM (e.g. Cable Loop)', () => {
  const name = getChannelDisplayName('accessory', 3, 25, 3, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'Cable Loop');
  assert.equal(name, 'Cable Loop');

  const channel: PlacedChannel = {
    id: 'acc-loop-1',
    kind: 'accessory',
    position: { x: 1, y: 1 },
    rotation: 0,
    category: 'data',
    widthUnits: 3,
    length: 3,
    label: 'Cable Loop',
  };
  const items = aggregateChannels([channel]);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Cable Loop');
  assert.equal(items[0].partNumber, 'MB-ACC-CABLE-LOOP');
});


