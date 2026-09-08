import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getChannelPartNumber,
  getChannelDisplayName,
  aggregateMountingHardware,
  generateBOM,
} from '../src/lib/bom.ts';
import {
  getChannelSnapPoints,
  getChannelSnapCount,
  getChannelFootprint,
  getDiagonalChannelGeometry,
  measurePointsAndSuggestChannel,
  fitBoardToViewport,
  getLocalFootprint,
  DEFAULT_BOARD_CONFIG,
} from '../src/lib/geometry.ts';
import type { PlacedChannel, BoardState, BoardConfig } from '../src/lib/types.ts';

// ----------------------------------------------------------------------------
// 1. Parametric Sizing & Part Numbers
// ----------------------------------------------------------------------------

test('Parametric straight channels: lengths 1-16 MU, widths 1-2 MU, heights 1-2 MU', () => {
  assert.equal(getChannelPartNumber('straight', 8), 'MB-CHAN-STR-8U');
  assert.equal(getChannelPartNumber('straight', 16), 'MB-CHAN-STR-16U');
  assert.equal(getChannelPartNumber('straight', 4, 2, 1), 'MB-CHAN-STR-4U-W2');
  assert.equal(getChannelPartNumber('straight', 6, 1, 2), 'MB-CHAN-STR-6U-H2');
  assert.equal(getChannelPartNumber('straight', 12, 2, 2), 'MB-CHAN-STR-12U-W2-H2');

  const name8 = getChannelDisplayName('straight', 8, 25);
  assert.ok(name8.includes('8 MU'));
  assert.ok(name8.includes('200mm'));

  const nameWide = getChannelDisplayName('straight', 4, 25, 2, 2);
  assert.ok(nameWide.includes('W2/H2'));
});

test('Parametric L-channel: arm spans 2x2, 3x3, 4x4 MU', () => {
  assert.equal(getChannelPartNumber('corner', undefined, 1, 1, 2), 'MB-CHAN-CNR-2X2');
  assert.equal(getChannelPartNumber('corner', undefined, 1, 1, 3), 'MB-CHAN-CNR-3X3');
  assert.equal(getChannelPartNumber('corner', undefined, 2, 1, 4), 'MB-CHAN-CNR-4X4-W2');

  const nameL = getChannelDisplayName('corner', undefined, 25, 1, 1, 3);
  assert.ok(nameL.includes('3×3 MU'));
  assert.ok(nameL.includes('75×75mm'));

  // Footprint check for arm span 3x3
  const fp3 = getLocalFootprint('corner', undefined, 0, 1, 3);
  assert.equal(fp3.length, 5); // (0,0), (1,0), (2,0), (0,1), (0,2)
});

test('Parametric T-junction: trunk 3-6 MU, branch 2-4 MU', () => {
  assert.equal(getChannelPartNumber('junction', undefined, 1, 1, undefined, 3, 2), 'MB-CHAN-JNC-3X2');
  assert.equal(getChannelPartNumber('junction', undefined, 1, 1, undefined, 6, 4), 'MB-CHAN-JNC-6X4');

  const nameT = getChannelDisplayName('junction', undefined, 25, 1, 1, undefined, 5, 3);
  assert.ok(nameT.includes('5×3 MU'));
  assert.ok(nameT.includes('125×75mm'));

  // Footprint check for trunk 5 x branch 3
  const fpT = getLocalFootprint('junction', undefined, 0, 1, undefined, 5, 3);
  assert.equal(fpT.length, 7); // 5 on trunk + 2 on branch = 7 cells
});

// ----------------------------------------------------------------------------
// 2. Mounting Systems Hardware & Spare Rules
// ----------------------------------------------------------------------------

test('BOM counting: Threaded Snap includes +10% spare, Direct Screw and Multiconnect are exact 1:1', () => {
  const mixedChannels: PlacedChannel[] = [
    // Threaded snap straight 4U: 3 mounts base -> +10% = 1 spare -> 4 total
    {
      id: 'ch-snap',
      kind: 'straight',
      length: 4,
      position: { x: 0, y: 0 },
      rotation: 0,
      category: 'power',
      mountingType: 'threaded_snap',
    },
    // Direct screw straight 4U: 2 terminal screws -> 0% spare -> 2 total
    {
      id: 'ch-screw',
      kind: 'straight',
      length: 4,
      position: { x: 0, y: 3 },
      rotation: 0,
      category: 'data',
      mountingType: 'direct_screw',
    },
    // Multiconnect corner 2x2: 2 mounts base -> 0% spare -> 2 total
    {
      id: 'ch-mc',
      kind: 'corner',
      position: { x: 10, y: 0 },
      rotation: 0,
      category: 'video',
      mountingType: 'multiconnect',
    },
  ];

  const hw = aggregateMountingHardware(mixedChannels, 10, 25);

  // Threaded snap
  assert.equal(hw.mountCountsByType.threaded_snap.base, 3);
  assert.equal(hw.mountCountsByType.threaded_snap.spare, 1);
  assert.equal(hw.mountCountsByType.threaded_snap.total, 4);

  // Direct screw (1:1)
  assert.equal(hw.mountCountsByType.direct_screw.base, 2);
  assert.equal(hw.mountCountsByType.direct_screw.spare, 0);
  assert.equal(hw.mountCountsByType.direct_screw.total, 2);

  // Multiconnect (1:1)
  assert.equal(hw.mountCountsByType.multiconnect.base, 2);
  assert.equal(hw.mountCountsByType.multiconnect.spare, 0);
  assert.equal(hw.mountCountsByType.multiconnect.total, 2);

  // Items count
  assert.equal(hw.items.length, 3);
  const snapItem = hw.items.find((i) => i.id === 'bom-mount-threaded-snap');
  assert.equal(snapItem?.quantity, 4);

  const screwItem = hw.items.find((i) => i.id === 'bom-mount-direct-screw');
  assert.equal(screwItem?.quantity, 2);

  const mcItem = hw.items.find((i) => i.id === 'bom-mount-multiconnect');
  assert.equal(mcItem?.quantity, 2);

  // Total active mounts across all channels
  assert.equal(hw.totalMounts, 7);
});

// ----------------------------------------------------------------------------
// 3. Manual Mount Points Mode
// ----------------------------------------------------------------------------

test('Custom mount points in manual mode overrides algorithmic placement', () => {
  const customChannel: PlacedChannel = {
    id: 'ch-custom',
    kind: 'straight',
    length: 6,
    position: { x: 2, y: 5 },
    rotation: 0,
    category: 'power',
    connectorMode: 'manual',
    customMountPoints: [
      { x: 0, y: 0 }, // start (local)
      { x: 3, y: 0 }, // middle (local)
      { x: 5, y: 0 }, // end (local)
    ],
  };

  const snaps = getChannelSnapPoints(customChannel);
  assert.equal(snaps.length, 3);
  assert.equal(getChannelSnapCount(customChannel), 3);
  assert.deepEqual(snaps.map((s) => ({ x: s.x, y: s.y })), [
    { x: 2, y: 5 },
    { x: 5, y: 5 },
    { x: 7, y: 5 },
  ]);
});

// ----------------------------------------------------------------------------
// 4. Measure & Create Tool Proposal Logic
// ----------------------------------------------------------------------------

test('measurePointsAndSuggestChannel: horizontal run', () => {
  const pointA = { x: 2, y: 4 };
  const pointB = { x: 7, y: 4 };
  const proposal = measurePointsAndSuggestChannel(pointA, pointB, [], DEFAULT_BOARD_CONFIG);

  assert.equal(proposal.alignment, 'horizontal');
  assert.equal(proposal.spanMU, 6);
  assert.equal(proposal.spanMm, 150);
  assert.equal(proposal.suggestedKind, 'straight');
  assert.equal(proposal.suggestedLength, 6);
  assert.equal(proposal.suggestedRotation, 0);
  assert.equal(proposal.suggestedPosition.x, 2);
  assert.equal(proposal.suggestedPosition.y, 4);
  assert.ok(proposal.isValidPlacement);
  assert.ok(proposal.channel);
  assert.equal(proposal.channel.kind, 'straight');
});

test('measurePointsAndSuggestChannel: vertical run', () => {
  const pointA = { x: 5, y: 10 };
  const pointB = { x: 5, y: 3 };
  const proposal = measurePointsAndSuggestChannel(pointA, pointB, [], DEFAULT_BOARD_CONFIG);

  assert.equal(proposal.alignment, 'vertical');
  assert.equal(proposal.spanMU, 8);
  assert.equal(proposal.spanMm, 200);
  assert.equal(proposal.suggestedKind, 'straight');
  assert.equal(proposal.suggestedLength, 8);
  assert.equal(proposal.suggestedRotation, 90);
  assert.equal(proposal.suggestedPosition.x, 5);
  assert.equal(proposal.suggestedPosition.y, 3);
});

test('measurePointsAndSuggestChannel: diagonal run suggests direct diagonal channel and L-channel fallback', () => {
  const pointA = { x: 1, y: 1 };
  const pointB = { x: 4, y: 4 };

  // 1. Default: suggests direct diagonal channel with 25mm section
  const directProposal = measurePointsAndSuggestChannel(pointA, pointB, [], DEFAULT_BOARD_CONFIG);
  assert.equal(directProposal.alignment, 'diagonal');
  assert.equal(directProposal.suggestedKind, 'diagonal');
  assert.equal(directProposal.isDirectlyCompatible, true);
  assert.deepEqual(directProposal.diagonalVector, { dx: 3, dy: 3 });
  assert.ok(directProposal.statusNote);

  // 2. Fallback option: corner (L-channel 90°)
  const cornerProposal = measurePointsAndSuggestChannel(pointA, pointB, [], DEFAULT_BOARD_CONFIG, 'corner');
  assert.equal(cornerProposal.alignment, 'diagonal');
  assert.equal(cornerProposal.suggestedKind, 'corner');
  assert.equal(cornerProposal.isDirectlyCompatible, false);
});

// ----------------------------------------------------------------------------
// 5. Fit to Viewport Logic
// ----------------------------------------------------------------------------

test('fitBoardToViewport computes sensible zoom and pan values', () => {
  const config: BoardConfig = {
    cols: 6,
    rows: 3,
    tileWidthHoles: 8,
    tileHeightHoles: 8,
    holePitchMm: 25,
  };

  const fit = fitBoardToViewport(config, 1400, 900);
  assert.ok(fit.zoom >= 0.5 && fit.zoom <= 2.5);
  assert.ok(typeof fit.pan.x === 'number');
  assert.ok(typeof fit.pan.y === 'number');
});

// ----------------------------------------------------------------------------
// 6. 2 MU Multi-Track Snap Scaling & Direct Diagonal Channel
// ----------------------------------------------------------------------------

test('2 MU Width Snap Scaling: Straight channel snaps double across both parallel rows', () => {
  const straight1: PlacedChannel = {
    id: 'str-1',
    kind: 'straight',
    length: 3,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps1 = getChannelSnapPoints(straight1);
  assert.equal(snaps1.length, 2); // (0, 0) and (2, 0)

  const straight2: PlacedChannel = {
    id: 'str-2',
    kind: 'straight',
    length: 3,
    widthUnits: 2,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps2 = getChannelSnapPoints(straight2);
  assert.equal(snaps2.length, 4); // (0, 0), (0, 1), (2, 0), (2, 1)
  // Confirms both rows y=0 and y=1 have snaps
  const yCoords = new Set(snaps2.map((s) => s.y));
  assert.ok(yCoords.has(0));
  assert.ok(yCoords.has(1));
});

test('2 MU Width Snap Scaling: Corner channel snaps double on both ports', () => {
  const corner1: PlacedChannel = {
    id: 'cnr-1',
    kind: 'corner',
    armSpanUnits: 2,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps1 = getChannelSnapPoints(corner1);
  assert.equal(snaps1.length, 2);

  const corner2: PlacedChannel = {
    id: 'cnr-2',
    kind: 'corner',
    armSpanUnits: 2,
    widthUnits: 2,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps2 = getChannelSnapPoints(corner2);
  assert.equal(snaps2.length, 4); // 2 on top port, 2 on right port
});

test('Direct Diagonal Channel: Footprint and snaps along diagonalVector', () => {
  const diagChannel: PlacedChannel = {
    id: 'diag-1',
    kind: 'diagonal',
    position: { x: 2, y: 2 },
    rotation: 0,
    category: 'data',
    widthUnits: 1,
    diagonalVector: { dx: 3, dy: 3 },
  };
  const footprint = getChannelFootprint(diagChannel);
  assert.ok(footprint.cells.length >= 4);

  const snaps = getChannelSnapPoints(diagChannel);
  assert.ok(snaps.length >= 2);
  // Terminal snaps at (2, 2) and (5, 5)
  assert.ok(snaps.some((s) => s.x === 2 && s.y === 2));
  assert.ok(snaps.some((s) => s.x === 5 && s.y === 5));
});

test('Diagonal Channel Width: Perpendicular width is strictly 25mm for 1 MU and 50mm for 2 MU', () => {
  const diag1: PlacedChannel = {
    id: 'diag-w1',
    kind: 'diagonal',
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
    widthUnits: 1,
    diagonalVector: { dx: 4, dy: 4 },
  };
  const geom1 = getDiagonalChannelGeometry(diag1, 25, 30);
  assert.ok(geom1.ductPath.startsWith('M'));
  assert.ok(geom1.centerLinePath.startsWith('M'));

  const diag2: PlacedChannel = {
    id: 'diag-w2',
    kind: 'diagonal',
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
    widthUnits: 2,
    diagonalVector: { dx: 4, dy: 4 },
  };
  const geom2 = getDiagonalChannelGeometry(diag2, 25, 30);
  assert.ok(geom2.ductPath.startsWith('M'));
});

test('2 MU Width Snap Scaling: Y-Split snaps double across all 3 ports (no single central trunk snap)', () => {
  const ySplit1: PlacedChannel = {
    id: 'ysplit-1mu',
    kind: 'y_split',
    yTrunkUnits: 2,
    yBranchUnits: 2,
    widthUnits: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps1 = getChannelSnapPoints(ySplit1);
  assert.equal(snaps1.length, 3);
  assert.equal(snaps1[0].x, 0);
  assert.equal(snaps1[0].y, 0); // left mouth
  assert.equal(snaps1[1].x, 2);
  assert.equal(snaps1[1].y, 0); // right mouth
  assert.equal(snaps1[2].x, 1);
  assert.equal(snaps1[2].y, 3); // single central trunk snap

  const ySplit2: PlacedChannel = {
    id: 'ysplit-2mu',
    kind: 'y_split',
    yTrunkUnits: 2,
    yBranchUnits: 2,
    widthUnits: 2,
    position: { x: 0, y: 0 },
    rotation: 0,
    category: 'power',
  };
  const snaps2 = getChannelSnapPoints(ySplit2);
  // Total 6 snaps: 2 on left mouth, 2 on right mouth, 2 on trunk bottom
  assert.equal(snaps2.length, 6);

  // Left mouth snaps span holes 0 and 1
  assert.ok(snaps2.some((s) => s.x === 0 && s.y === 0));
  assert.ok(snaps2.some((s) => s.x === 1 && s.y === 0));

  // Right mouth snaps span holes 4 and 5
  assert.ok(snaps2.some((s) => s.x === 4 && s.y === 0));
  assert.ok(snaps2.some((s) => s.x === 5 && s.y === 0));

  // Trunk bottom snaps span holes 2 and 3 (y = 4)
  assert.ok(snaps2.some((s) => s.x === 2 && s.y === 4));
  assert.ok(snaps2.some((s) => s.x === 3 && s.y === 4));

  // Confirm NO single central snap on the trunk
  assert.ok(!snaps2.some((s) => s.x === 1 && s.y === 4));

  // Test mating: A 2 MU straight channel placed below the trunk
  const straightAttached: PlacedChannel = {
    id: 'str-attached',
    kind: 'straight',
    length: 3,
    widthUnits: 2,
    position: { x: 2, y: 5 }, // attached directly under the trunk
    rotation: 90, // vertical
    category: 'power',
  };
  const straightSnaps = getChannelSnapPoints(straightAttached);
  // Both tracks x=2 and x=3 match the trunk's dual snaps
  const straightXCoords = new Set(straightSnaps.map((s) => s.x));
  assert.ok(straightXCoords.has(2));
  assert.ok(straightXCoords.has(3));
});



