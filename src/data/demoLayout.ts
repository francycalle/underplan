/**
 * Underplan Demo Setup
 * Matches the approved Figma reference layout exactly.
 */

import type { PlacedChannel } from '../lib/types.ts';

export const DEMO_CHANNELS: PlacedChannel[] = [
  // 1. Blue HDMI Selected Channel (Bottom Left)
  {
    id: 'chan-figma-hdmi-straight',
    kind: 'straight',
    length: 3,
    position: { x: 3, y: 8 },
    rotation: 0,
    category: 'hdmi',
    label: 'Main Cable Run',
  },

  // 2. Blue Curved Elbow (Top Left)
  {
    id: 'chan-figma-hdmi-curved-1',
    kind: 'curved',
    radiusUnits: 2,
    position: { x: 7, y: 2 },
    rotation: 90,
    category: 'hdmi',
    label: 'Display Drop',
  },

  // 3. Blue Curved Elbow 2 (Mid-Left)
  {
    id: 'chan-figma-hdmi-curved-2',
    kind: 'curved',
    radiusUnits: 2,
    position: { x: 12, y: 2 },
    rotation: 0,
    category: 'hdmi',
    label: 'Riser Turn',
  },

  // 4. Blue Cable Loop Max (Mid-Left Accessory)
  {
    id: 'chan-figma-hdmi-loop-1',
    kind: 'accessory',
    widthUnits: 6,
    length: 3,
    label: 'Cable Loop Max',
    position: { x: 8, y: 5 },
    rotation: 0,
    category: 'hdmi',
  },

  // 5. Orange Power Y-Split (Upper Center)
  {
    id: 'chan-figma-pwr-y',
    kind: 'y_split',
    position: { x: 14, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'Power Feed Split',
  },

  // 6. Orange Junction / Hub (Center)
  {
    id: 'chan-figma-pwr-cross',
    kind: 'junction',
    position: { x: 14, y: 6 },
    rotation: 0,
    category: 'power',
    label: 'Main Trunk Tee',
    branchSpanUnits: 1,
  },

  // 7. Orange Lower Curved Elbow
  {
    id: 'chan-figma-pwr-curved-lower',
    kind: 'curved',
    radiusUnits: 2,
    position: { x: 14, y: 8 },
    rotation: 270,
    category: 'power',
    label: 'Lower Turn',
  },

  // 8. Orange Cable Loop Max (Upper Center-Right)
  {
    id: 'chan-figma-pwr-loop-top',
    kind: 'accessory',
    widthUnits: 6,
    length: 3,
    label: 'Cable Loop Max',
    position: { x: 17, y: 4 },
    rotation: 0,
    category: 'power',
  },

  // 9. Orange Cable Loop Max (Lower Center-Right)
  {
    id: 'chan-figma-pwr-loop-bottom',
    kind: 'accessory',
    widthUnits: 6,
    length: 3,
    label: 'Cable Loop Max',
    position: { x: 17, y: 8 },
    rotation: 0,
    category: 'power',
  },

  // 10. Orange Cable Spool (Bottom Center-Right)
  {
    id: 'chan-figma-pwr-spool',
    kind: 'spool',
    label: 'Cable Spool',
    position: { x: 23, y: 8 },
    rotation: 0,
    category: 'power',
  },

  // 11. Orange Multi-socket Holder (Far Right)
  {
    id: 'chan-figma-pwr-socket',
    kind: 'socket_holder',
    label: 'Multi-socket',
    position: { x: 31, y: 5 },
    rotation: 0,
    category: 'power',
  },

  // 12. Orange Upper Straight Bus (Length >= 4)
  {
    id: 'chan-figma-pwr-bus-top',
    kind: 'straight',
    length: 7,
    position: { x: 23, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'Rear Rail',
  },

  // 13. Orange Upper Corner
  {
    id: 'chan-figma-pwr-corner-top',
    kind: 'corner',
    position: { x: 31, y: 2 },
    rotation: 0,
    category: 'power',
    label: 'Desk Corner',
  },

  // 14. Orange Middle Branch Straight
  {
    id: 'chan-figma-pwr-branch-mid',
    kind: 'straight',
    length: 5,
    position: { x: 24, y: 5 },
    rotation: 0,
    category: 'power',
    label: 'Device Run',
  },

  // 15. Orange Lower Run Straight
  {
    id: 'chan-figma-pwr-branch-low',
    kind: 'straight',
    length: 3,
    position: { x: 27, y: 8 },
    rotation: 0,
    category: 'power',
    label: 'Floor Drop',
  },
];
