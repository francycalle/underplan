import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getChannelPartNumber,
  getChannelDisplayName,
  getChannelDescription,
  aggregateTiles,
  aggregateChannels,
  aggregateSnapConnectors,
  generateBOM,
  formatBOMAsMarkdown,
  formatBOMAsCSV,
  formatBOMAsJSON,
} from '../src/lib/bom.ts';
import { DEFAULT_BOARD_CONFIG } from '../src/lib/geometry.ts';
import type { BoardConfig, BoardState, PlacedChannel } from '../src/lib/types.ts';

test('getChannelPartNumber and display name formatting', () => {
  assert.equal(getChannelPartNumber('straight', 2), 'MB-CHAN-STR-2U');
  assert.equal(getChannelPartNumber('straight', 4), 'MB-CHAN-STR-4U');
  assert.equal(getChannelPartNumber('corner'), 'MB-CHAN-CNR-2X2');
  assert.equal(getChannelPartNumber('junction'), 'MB-CHAN-JNC-3X2');
  assert.equal(getChannelPartNumber('cross'), 'MB-CHAN-CRS-3X3');

  assert.equal(getChannelDisplayName('straight', 3, 25), 'Straight Channel (I-Channel) 3 MU (75mm)');
  assert.equal(getChannelDisplayName('corner', undefined, 25), '90° Corner (L-Channel) 2×2 MU (50×50mm)');
  assert.equal(getChannelDisplayName('junction', undefined, 25), 'T-Junction 3×2 MU (75×50mm)');
});

test('aggregateTiles - standard 8x8 tiles', () => {
  const items = aggregateTiles(DEFAULT_BOARD_CONFIG); // 6 cols x 3 rows = 18
  assert.equal(items.length, 1);
  assert.equal(items[0].partNumber, 'MB-TILE-8X8');
  assert.equal(items[0].quantity, 18);
  assert.equal(items[0].category, 'tiles');
});

test('aggregateTiles - custom 4x4 tiles', () => {
  const config: BoardConfig = {
    cols: 3,
    rows: 3,
    tileWidthHoles: 4,
    tileHeightHoles: 4,
    holePitchMm: 25,
  };
  const items = aggregateTiles(config);
  assert.equal(items.length, 1);
  assert.equal(items[0].partNumber, 'MB-TILE-4X4');
  assert.equal(items[0].quantity, 9);
});

test('aggregateChannels - groups identical channels and tallies quantities', () => {
  const channels: PlacedChannel[] = [
    { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
    { id: '2', kind: 'straight', length: 2, position: { x: 2, y: 0 }, rotation: 90, category: 'data' },
    { id: '3', kind: 'straight', length: 4, position: { x: 0, y: 1 }, rotation: 0, category: 'power' },
    { id: '4', kind: 'corner', position: { x: 5, y: 5 }, rotation: 0, category: 'video' },
  ];

  const items = aggregateChannels(channels, 25);
  assert.equal(items.length, 3); // STR-2U (qty 2), STR-4U (qty 1), CNR-2X2 (qty 1)

  const str2 = items.find((i) => i.partNumber === 'MB-CHAN-STR-2U');
  assert.ok(str2);
  assert.equal(str2.quantity, 2);

  const str4 = items.find((i) => i.partNumber === 'MB-CHAN-STR-4U');
  assert.ok(str4);
  assert.equal(str4.quantity, 1);

  const cnr = items.find((i) => i.partNumber === 'MB-CHAN-CNR-2X2');
  assert.ok(cnr);
  assert.equal(cnr.quantity, 1);
});

test('aggregateSnapConnectors - calculates 10% spare rounded up', () => {
  // Single straight channel of length 2 -> 2 snaps
  // 2 snaps * 0.10 = 0.2 -> ceil(0.2) = 1 spare snap -> total 3 snaps
  const channelsSmall: PlacedChannel[] = [
    { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
  ];
  const resSmall = aggregateSnapConnectors(channelsSmall, 10);
  assert.equal(resSmall.baseCount, 2);
  assert.equal(resSmall.spareCount, 1); // ceil(0.2)
  assert.equal(resSmall.totalCount, 3);
  assert.equal(resSmall.item.quantity, 3);

  // 11 snaps base:
  // e.g. 4 straight-2 (2 snaps each = 8) + 1 junction (3 snaps) = 11 snaps
  // 11 * 0.10 = 1.1 -> ceil(1.1) = 2 spare snaps -> total 13 snaps
  const channelsMedium: PlacedChannel[] = [
    { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
    { id: '2', kind: 'straight', length: 2, position: { x: 2, y: 0 }, rotation: 0, category: 'power' },
    { id: '3', kind: 'straight', length: 2, position: { x: 4, y: 0 }, rotation: 0, category: 'power' },
    { id: '4', kind: 'straight', length: 2, position: { x: 6, y: 0 }, rotation: 0, category: 'power' },
    { id: '5', kind: 'junction', position: { x: 10, y: 10 }, rotation: 0, category: 'data' },
  ];
  const resMedium = aggregateSnapConnectors(channelsMedium, 10);
  assert.equal(resMedium.baseCount, 11);
  assert.equal(resMedium.spareCount, 2); // ceil(1.1)
  assert.equal(resMedium.totalCount, 13);
  assert.equal(resMedium.item.quantity, 13);
});

test('generateBOM - full board state integration', () => {
  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    tiles: [],
    channels: [
      { id: '1', kind: 'straight', length: 3, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
      { id: '2', kind: 'corner', position: { x: 3, y: 0 }, rotation: 0, category: 'power' },
      { id: '3', kind: 'straight', length: 2, position: { x: 10, y: 5 }, rotation: 90, category: 'data' },
      { id: '4', kind: 'junction', position: { x: 20, y: 10 }, rotation: 180, category: 'video' },
    ],
  };

  const bom = generateBOM(boardState, 10);

  // Dimensions
  assert.equal(bom.boardDimensions.cols, 6);
  assert.equal(bom.boardDimensions.rows, 3);
  assert.equal(bom.boardDimensions.totalHolesX, 48);
  assert.equal(bom.boardDimensions.totalHolesY, 24);
  assert.equal(bom.boardDimensions.totalWidthMm, 1200);
  assert.equal(bom.boardDimensions.totalHeightMm, 600);

  // Summary
  assert.equal(bom.summary.totalTiles, 18);
  assert.equal(bom.summary.totalChannels, 4);
  // Total units: straight-3 (3) + corner (2) + straight-2 (2) + junction (3) = 10 units
  assert.equal(bom.summary.totalChannelLengthUnits, 10);
  assert.equal(bom.summary.totalChannelLengthMm, 250); // 10 * 25

  // Snaps: straight-3 (2) + corner (2) + straight-2 (2) + junction (3) = 9 snaps
  assert.equal(bom.summary.baseSnapCount, 9);
  // 9 * 0.10 = 0.9 -> ceil(0.9) = 1 spare snap
  assert.equal(bom.summary.spareSnapCount, 1);
  assert.equal(bom.summary.totalSnapCountWithSpares, 10);

  // Categories
  assert.equal(bom.summary.channelsByCategory.power, 2);
  assert.equal(bom.summary.channelsByCategory.data, 1);
  assert.equal(bom.summary.channelsByCategory.video, 1);

  // Items
  const tileItem = bom.items.find((i) => i.category === 'tiles');
  assert.ok(tileItem);
  assert.equal(tileItem.quantity, 18);

  const snapItem = bom.items.find((i) => i.category === 'mounting' || i.category === 'snaps');
  assert.ok(snapItem);
  assert.equal(snapItem.quantity, 10);
});

test('formatBOMAsMarkdown, formatBOMAsCSV, and formatBOMAsJSON', () => {
  const boardState: BoardState = {
    config: DEFAULT_BOARD_CONFIG,
    tiles: [],
    channels: [
      { id: '1', kind: 'straight', length: 2, position: { x: 0, y: 0 }, rotation: 0, category: 'power' },
    ],
  };

  const bom = generateBOM(boardState, 10);

  // Markdown
  const md = formatBOMAsMarkdown(bom);
  assert.ok(md.includes('Bill of Materials (BOM)'));
  assert.ok(md.includes('Multiboard Standard Tile (8x8)'));
  assert.ok(md.includes('Straight Channel'));
  assert.ok(md.includes('Underware Threaded Snap'));

  // CSV
  const csv = formatBOMAsCSV(bom);
  assert.ok(csv.includes('Part / Component'));
  assert.ok(csv.includes('Multiboard Standard Tile (8x8)'));
  assert.ok(csv.includes('Underware Threaded Snap'));

  // JSON
  const json = formatBOMAsJSON(bom);
  const parsed = JSON.parse(json);
  assert.equal(parsed.summary.totalTiles, 18);
  assert.equal(parsed.summary.totalChannels, 1);
});

