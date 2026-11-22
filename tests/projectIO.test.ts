import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_SCHEMA_VERSION,
  buildExportFilename,
  serializeProjectPlan,
  parseProjectPlan,
} from '../src/lib/projectIO.ts';
import { DEFAULT_BOARD_CONFIG } from '../src/lib/geometry.ts';

test('serializeProjectPlan and parseProjectPlan round-trip cleanly', () => {
  const sampleChannels = [
    {
      id: 'ch-1',
      kind: 'straight' as const,
      length: 4,
      position: { x: 1, y: 2 },
      rotation: 0 as const,
      category: 'power',
    },
  ];

  const json = serializeProjectPlan(
    {
      projectTitle: 'Desk Setup',
      boardConfig: DEFAULT_BOARD_CONFIG,
      channels: sampleChannels,
      categories: [{ id: 'power', name: 'Power', color: '#ef4444' }],
      customAccessories: [],
      projects: [],
      activeProjectId: 'proj-1',
    },
    new Date('2026-11-12T00:00:00.000Z')
  );

  const parsedPayload = JSON.parse(json);
  assert.equal(parsedPayload.schemaVersion, PROJECT_SCHEMA_VERSION);
  assert.equal(parsedPayload.exportedAt, '2026-11-12T00:00:00.000Z');

  const restored = parseProjectPlan(json);
  assert.equal(restored.projectTitle, 'Desk Setup');
  assert.deepEqual(restored.boardConfig, DEFAULT_BOARD_CONFIG);
  assert.equal(restored.channels.length, 1);
  assert.equal(restored.channels[0].id, 'ch-1');
  assert.equal(restored.activeProjectId, 'proj-1');
});

test('buildExportFilename sanitizes unsafe characters and appends ISO date', () => {
  const filename = buildExportFilename('Desk / Main: Setup', new Date('2026-11-12T08:00:00.000Z'));
  assert.equal(filename, 'Desk___Main__Setup-2026-11-12.json');

  const fallback = buildExportFilename('   ', new Date('2026-11-12T08:00:00.000Z'));
  assert.equal(fallback, 'underplan-config-2026-11-12.json');
});

test('parseProjectPlan rejects empty, malformed, or non-plain-object JSON', () => {
  assert.throws(() => parseProjectPlan(''), /empty/i);
  assert.throws(() => parseProjectPlan('   \n  '), /empty/i);
  assert.throws(() => parseProjectPlan('{bad json'), /Invalid JSON/i);
  assert.throws(() => parseProjectPlan('null'), /JSON object/i);
  assert.throws(() => parseProjectPlan('[]'), /JSON object/i);
  assert.throws(() => parseProjectPlan('"hello"'), /JSON object/i);
  assert.throws(() => parseProjectPlan('42'), /JSON object/i);
});

test('parseProjectPlan validates required boardConfig, channels, and schemaVersion', () => {
  assert.throws(
    () => parseProjectPlan(JSON.stringify({ channels: [] })),
    /boardConfig/i
  );
  assert.throws(
    () => parseProjectPlan(JSON.stringify({ boardConfig: [], channels: [] })),
    /boardConfig/i
  );
  assert.throws(
    () => parseProjectPlan(JSON.stringify({ boardConfig: DEFAULT_BOARD_CONFIG })),
    /channels/i
  );
  assert.throws(
    () =>
      parseProjectPlan(
        JSON.stringify({
          schemaVersion: '2.0.0',
          boardConfig: DEFAULT_BOARD_CONFIG,
          channels: [],
        })
      ),
    /Unsupported schemaVersion/i
  );
  assert.throws(
    () =>
      parseProjectPlan(
        JSON.stringify({
          schemaVersion: 1,
          boardConfig: DEFAULT_BOARD_CONFIG,
          channels: [],
        })
      ),
    /Invalid schemaVersion/i
  );
});
