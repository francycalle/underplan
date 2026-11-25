import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getChannelFootprint,
  getChannelSnapPoints,
  getDiagonalTurnGeometry,
  getChannelUnitLength,
} from '../src/lib/geometry.ts';
import { getChannelPartNumber, getChannelDisplayName } from '../src/lib/bom.ts';
import type { PlacedChannel } from '../src/lib/types.ts';

describe('Diagonal Turn (90° chamfered corner) channel', () => {
  it('computes parametric Units Over / Units Up footprint, terminal snaps, and SVG path', () => {
    // Units Over = 3, Units Up = 3 -> 4x4 MU bounding box, 2 terminal snaps, diagonal band cells
    const ch: PlacedChannel = {
      id: 'dturn-1',
      kind: 'diagonal_turn',
      category: 'power',
      position: { x: 2, y: 2 },
      rotation: 0,
      mitreArmA: 3,
      mitreArmB: 3,
      widthUnits: 1,
    };

    const fp = getChannelFootprint(ch);
    // Should not occupy the empty outer corner (x=2, y=5)
    assert.ok(!fp.cells.some((c) => c.x === 2 && c.y === 2));
    assert.strictEqual(getChannelUnitLength(ch), 4);

    // Strictly 2 terminal port snaps for 1 MU width
    const snaps = getChannelSnapPoints(ch);
    assert.strictEqual(snaps.length, 2);

    const geom = getDiagonalTurnGeometry(ch, 25, 30);
    assert.ok(geom.ductPath.startsWith('M '));
    assert.ok(geom.ductPath.endsWith(' Z'));
    assert.strictEqual(geom.ductPath.split(' L ').length, 8);
  });

  it('generates standard BOM part number and display name for Underware Units Over/Up', () => {
    assert.strictEqual(
      getChannelPartNumber('diagonal_turn', undefined, 1, 1, undefined, undefined, undefined, undefined, 2, 2),
      'MB-CHAN-DTURN-2X2U'
    );
    assert.strictEqual(
      getChannelDisplayName('diagonal_turn', undefined, 25, undefined, undefined, undefined, undefined, undefined, undefined, 2, 2),
      'Diagonal Turn 2×2 MU (75×75mm)'
    );
  });
});
