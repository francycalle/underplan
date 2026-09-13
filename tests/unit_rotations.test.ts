import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rotatePlacedChannel,
  isChannelOutOfBounds,
  getChannelSnapPoints,
  getChannelFootprint,
  DEFAULT_BOARD_CONFIG,
} from '../src/lib/geometry.ts';
import type { PlacedChannel } from '../src/lib/types.ts';

test('rotatePlacedChannel rotates channel and custom mount points clockwise', () => {
  // Cross channel at (10, 10) with custom mount points (e.g. removed top snap at 1,0, remaining 3 snaps)
  const crossChannel: PlacedChannel = {
    id: 'test-cross',
    kind: 'cross',
    position: { x: 10, y: 10 },
    rotation: 0,
    category: 'data',
    connectorMode: 'manual',
    customMountPoints: [
      { x: 0, y: 1 }, // West
      { x: 2, y: 1 }, // East
      { x: 1, y: 2 }, // South
    ],
  };

  // Rotate 90° CW
  const rot1 = rotatePlacedChannel(crossChannel, 90);
  assert.equal(rot1.rotation, 90);
  assert.equal(rot1.customMountPoints?.length, 3);
  // West (0, 1) -> curH=3, x = 3 - 1 - 1 = 1, y = 0 -> North (1, 0)
  // East (2, 1) -> x = 3 - 1 - 1 = 1, y = 2 -> South (1, 2)
  // South (1, 2) -> x = 3 - 1 - 2 = 0, y = 1 -> West (0, 1)
  assert.deepEqual(rot1.customMountPoints, [
    { x: 1, y: 0 },
    { x: 1, y: 2 },
    { x: 0, y: 1 },
  ]);

  // Rotated snaps should now be at (10+1, 10+0), (10+1, 10+2), (10+0, 10+1)
  const snapsRot1 = getChannelSnapPoints(rot1);
  assert.equal(snapsRot1.length, 3);
  assert.equal(snapsRot1[0].x, 11);
  assert.equal(snapsRot1[0].y, 10);

  // Rotate 3 more times to complete 360°
  const rot2 = rotatePlacedChannel(rot1, 90);
  assert.equal(rot2.rotation, 180);
  const rot3 = rotatePlacedChannel(rot2, 90);
  assert.equal(rot3.rotation, 270);
  const rot4 = rotatePlacedChannel(rot3, 90);
  assert.equal(rot4.rotation, 0);
  assert.deepEqual(rot4.customMountPoints, crossChannel.customMountPoints);
});

test('rotatePlacedChannel: Y-split with custom mount points keeps all snaps strictly anchored to footprint cells across 360°', () => {
  const ySplit: PlacedChannel = {
    id: 'test-y-split',
    kind: 'y_split',
    position: { x: 15, y: 15 },
    rotation: 0,
    category: 'power',
    connectorMode: 'manual',
    customMountIndices: [0, 1], // Top-left and top-right ports
  };

  let current = ySplit;
  for (const expectedRot of [90, 180, 270, 0] as const) {
    current = rotatePlacedChannel(current, 90);
    assert.equal(current.rotation, expectedRot);

    const fp = getChannelFootprint(current);
    const snaps = getChannelSnapPoints(current);

    assert.equal(snaps.length, 2, `Should have exactly 2 snaps at rotation ${expectedRot}`);

    // Verify every snap point is strictly located on an occupied cell of the channel footprint
    for (const snap of snaps) {
      const isInside = fp.cells.some((cell) => cell.x === snap.x && cell.y === snap.y);
      assert.ok(
        isInside,
        `Snap at (${snap.x}, ${snap.y}) escaped outside Y-split footprint at rotation ${expectedRot}°`
      );
    }
  }
});

test('rotatePlacedChannel: Curved channel with custom mount points keeps all snaps strictly anchored across 360°', () => {
  const curved: PlacedChannel = {
    id: 'test-curved',
    kind: 'curved',
    radiusUnits: 3,
    position: { x: 20, y: 20 },
    rotation: 0,
    category: 'hdmi',
    connectorMode: 'manual',
    customMountIndices: [0, 2], // 2 custom snaps on the curve
  };

  let current = curved;
  for (const expectedRot of [90, 180, 270, 0] as const) {
    current = rotatePlacedChannel(current, 90);
    assert.equal(current.rotation, expectedRot);

    const fp = getChannelFootprint(current);
    const snaps = getChannelSnapPoints(current);

    assert.equal(snaps.length, 2);
    for (const snap of snaps) {
      const isInside = fp.cells.some((cell) => cell.x === snap.x && cell.y === snap.y);
      assert.ok(
        isInside,
        `Snap at (${snap.x}, ${snap.y}) escaped outside Curved channel footprint at rotation ${expectedRot}°`
      );
    }
  }
});

test('rotatePlacedChannel: Straight and Accessory cycle through all 4 quadrants (0 -> 90 -> 180 -> 270 -> 0)', () => {
  const straight: PlacedChannel = {
    id: 'test-straight',
    kind: 'straight',
    length: 4,
    position: { x: 5, y: 5 },
    rotation: 0,
    category: 'data',
  };

  const r1 = rotatePlacedChannel(straight, 90);
  assert.equal(r1.rotation, 90);
  assert.deepEqual(r1.position, { x: 5, y: 5 });
  const fp1 = getChannelFootprint(r1);
  assert.equal(fp1.bounds.minX, 5);
  assert.equal(fp1.bounds.maxX, 5);
  assert.equal(fp1.bounds.minY, 5);
  assert.equal(fp1.bounds.maxY, 8);

  const r2 = rotatePlacedChannel(r1, 90);
  assert.equal(r2.rotation, 180);
  assert.deepEqual(r2.position, { x: 2, y: 5 });
  const fp2 = getChannelFootprint(r2);
  assert.equal(fp2.bounds.minX, 2);
  assert.equal(fp2.bounds.maxX, 5);
  assert.equal(fp2.bounds.minY, 5);
  assert.equal(fp2.bounds.maxY, 5);

  const r3 = rotatePlacedChannel(r2, 90);
  assert.equal(r3.rotation, 270);
  assert.deepEqual(r3.position, { x: 5, y: 2 });
  const fp3 = getChannelFootprint(r3);
  assert.equal(fp3.bounds.minX, 5);
  assert.equal(fp3.bounds.maxX, 5);
  assert.equal(fp3.bounds.minY, 2);
  assert.equal(fp3.bounds.maxY, 5);

  const r4 = rotatePlacedChannel(r3, 90);
  assert.equal(r4.rotation, 0);
  assert.deepEqual(r4.position, { x: 5, y: 5 });
  const fp4 = getChannelFootprint(r4);
  assert.equal(fp4.bounds.minX, 5);
  assert.equal(fp4.bounds.maxX, 8);
  assert.equal(fp4.bounds.minY, 5);
  assert.equal(fp4.bounds.maxY, 5);

  const accessory: PlacedChannel = {
    id: 'test-acc',
    kind: 'accessory',
    widthUnits: 6,
    length: 3,
    position: { x: 10, y: 10 },
    rotation: 0,
    category: 'power',
  };

  const a1 = rotatePlacedChannel(accessory, 90);
  assert.equal(a1.rotation, 90);
  assert.deepEqual(a1.position, { x: 8, y: 10 });
  const afp1 = getChannelFootprint(a1);
  assert.equal(afp1.bounds.minX, 8);
  assert.equal(afp1.bounds.maxX, 10);
  assert.equal(afp1.bounds.minY, 10);
  assert.equal(afp1.bounds.maxY, 15);

  const a2 = rotatePlacedChannel(a1, 90);
  assert.equal(a2.rotation, 180);
  assert.deepEqual(a2.position, { x: 5, y: 8 });
  const afp2 = getChannelFootprint(a2);
  assert.equal(afp2.bounds.minX, 5);
  assert.equal(afp2.bounds.maxX, 10);
  assert.equal(afp2.bounds.minY, 8);
  assert.equal(afp2.bounds.maxY, 10);

  const a3 = rotatePlacedChannel(a2, 90);
  assert.equal(a3.rotation, 270);
  assert.deepEqual(a3.position, { x: 10, y: 5 });
  const afp3 = getChannelFootprint(a3);
  assert.equal(afp3.bounds.minX, 10);
  assert.equal(afp3.bounds.maxX, 12);
  assert.equal(afp3.bounds.minY, 5);
  assert.equal(afp3.bounds.maxY, 10);

  const a4 = rotatePlacedChannel(a3, 90);
  assert.equal(a4.rotation, 0);
  assert.deepEqual(a4.position, { x: 10, y: 10 });
  const afp4 = getChannelFootprint(a4);
  assert.equal(afp4.bounds.minX, 10);
  assert.equal(afp4.bounds.maxX, 15);
  assert.equal(afp4.bounds.minY, 10);
  assert.equal(afp4.bounds.maxY, 12);
});

test('isChannelOutOfBounds correctly identifies channels outside board', () => {
  const inBoundsChannel: PlacedChannel = {
    id: 'test-in',
    kind: 'straight',
    length: 3,
    position: { x: 5, y: 5 },
    rotation: 0,
    category: 'power',
  };
  assert.equal(isChannelOutOfBounds(inBoundsChannel, DEFAULT_BOARD_CONFIG), false);

  const outNegative: PlacedChannel = {
    ...inBoundsChannel,
    position: { x: -1, y: 5 },
  };
  assert.equal(isChannelOutOfBounds(outNegative, DEFAULT_BOARD_CONFIG), true);

  const outExceedX: PlacedChannel = {
    ...inBoundsChannel,
    position: { x: 47, y: 5 }, // 47 + 3 = 50 > 48
  };
  assert.equal(isChannelOutOfBounds(outExceedX, DEFAULT_BOARD_CONFIG), true);
});
