/**
 * Underplan Demo Setup
 * Realistic cable management layout showcasing Power, Data, Video, and Network runs.
 */

import type { PlacedChannel } from '../lib/types.ts';

export const DEMO_CHANNELS: PlacedChannel[] = [
  // 1. Mains AC Power Run (Amber) - Rear desk edge to power distribution strip
  {
    id: 'chan-demo-pwr-1',
    kind: 'straight',
    length: 4,
    position: { x: 4, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'AC Mains In',
  },
  {
    id: 'chan-demo-pwr-2',
    kind: 'straight',
    length: 4,
    position: { x: 8, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'Power Strip Trunk',
  },
  {
    id: 'chan-demo-pwr-3',
    kind: 'corner',
    position: { x: 12, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'Power Drop Elbow',
  },
  {
    id: 'chan-demo-pwr-4',
    kind: 'straight',
    length: 3,
    position: { x: 13, y: 4 },
    rotation: 90,
    category: 'power',
    label: 'Brick Drop',
  },

  // 2. High-Speed USB & Peripherals Run (Cyan) - Central desk to docking hub
  {
    id: 'chan-demo-data-1',
    kind: 'straight',
    length: 4,
    position: { x: 8, y: 8 },
    rotation: 0,
    category: 'data',
    label: 'USB-C Dock Bus',
  },
  {
    id: 'chan-demo-data-2',
    kind: 'junction',
    position: { x: 12, y: 8 },
    rotation: 0,
    category: 'data',
    label: 'Desk Hub Tee',
  },
  {
    id: 'chan-demo-data-3',
    kind: 'straight',
    length: 3,
    position: { x: 15, y: 8 },
    rotation: 0,
    category: 'data',
    label: 'Keyboard/Mouse Run',
  },
  {
    id: 'chan-demo-data-4',
    kind: 'straight',
    length: 3,
    position: { x: 13, y: 10 },
    rotation: 90,
    category: 'data',
    label: 'Front USB Drop',
  },

  // 3. Dual Monitor Video / DisplayPort Run (Purple) - Right side arm mount
  {
    id: 'chan-demo-video-1',
    kind: 'straight',
    length: 4,
    position: { x: 22, y: 4 },
    rotation: 0,
    category: 'video',
    label: 'DP 2.1 Monitor A',
  },
  {
    id: 'chan-demo-video-2',
    kind: 'corner',
    position: { x: 26, y: 4 },
    rotation: 0,
    category: 'video',
    label: 'Monitor Arm Turn',
  },
  {
    id: 'chan-demo-video-3',
    kind: 'straight',
    length: 4,
    position: { x: 27, y: 6 },
    rotation: 90,
    category: 'video',
    label: 'Arm Riser Channel',
  },

  // 4. Cat6A Gigabit Ethernet Network Line (Green) - Bottom edge
  {
    id: 'chan-demo-net-1',
    kind: 'straight',
    length: 4,
    position: { x: 20, y: 12 },
    rotation: 0,
    category: 'network',
    label: 'Cat6A Switch Trunk',
  },
  {
    id: 'chan-demo-net-2',
    kind: 'straight',
    length: 3,
    position: { x: 24, y: 12 },
    rotation: 0,
    category: 'network',
    label: 'Wall Plate Feed',
  },
];
