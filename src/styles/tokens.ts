/**
 * Underplan Design Tokens
 * Premium Maker / CAD-Lite Visual System
 * 
 * Target Aesthetic: Shapr3D, Fusion 360 Dark, Linear, Bambu Studio
 * Dark Graphite UI (#121316 / #18191E / #22242B) + Technical Accents + Multiboard Canvas
 */

export const rawColors = {
  // Deep Graphite Surfaces
  graphite: {
    950: '#0E0F12', // Recessed wells & hole interiors
    900: '#121316', // Primary infinite canvas
    850: '#15161A', // Root window background
    800: '#18191E', // Docked panels & sidebars
    750: '#1E2027', // Card surfaces & active list items
    700: '#22242B', // Elevated controls, HUD containers, row hover
    650: '#282A33', // Dropdown menus & popovers
    600: '#2A2D36', // Standard borders & input outlines
    500: '#383C48', // High-contrast borders & selected strokes
    400: '#4A5060', // Hover borders & muted grips
  },

  // Slate Neutral Text & Icons
  slate: {
    100: '#F1F5F9', // Primary technical text / white
    300: '#CBD5E1', // High-readability body text
    400: '#94A3B8', // Field labels & secondary icons
    500: '#64748B', // Keyboard shortcuts, units (mm), disabled hints
    600: '#475569', // Inactive tool glyphs
    700: '#334155', // Grid ticks & faint dividers
  },

  // Technical Accents & Precision Highlights
  indigo: {
    400: '#818CF8', // Tool selection indicator & light glow
    500: '#6366F1', // Primary interactive brand accent
    600: '#4F46E5', // Primary button hover / active press
  },
  sky: {
    300: '#7DD3FC', // High-visibility guide marker
    400: '#38BDF8', // CAD cursor, snap ray, measurement caliper
    500: '#0EA5E9',
  },

  // Validation States
  emerald: {
    400: '#34D399',
    500: '#10B981', // Valid / Success / Snapped
    600: '#059669',
  },
  amber: {
    400: '#FBBF24',
    500: '#F59E0B', // Warning / High Capacity / Caution
    600: '#D97706',
  },
  rose: {
    400: '#F87171',
    500: '#EF4444', // Error / Collision / Exceeded Clearance
    600: '#DC2626',
  },
} as const;

/**
 * Channel Color System for Under-desk Routing & Cable Management
 */
export interface ChannelColorDefinition {
  id: string;
  name: string;
  description: string;
  hex: string;
  rgb: string;
  glow: string;
  bgTint: string;
  borderTint: string;
  textBadge: string;
  tailwindClass: string;
}

export const channelColors: Record<'power' | 'data' | 'video' | 'network' | 'neutral', ChannelColorDefinition> = {
  power: {
    id: 'power',
    name: 'Power / Mains / DC',
    description: 'AC mains, power bricks, USB-PD high-voltage lines, DC rails',
    hex: '#F59E0B',
    rgb: '245, 158, 11',
    glow: 'rgba(245, 158, 11, 0.40)',
    bgTint: 'rgba(245, 158, 11, 0.12)',
    borderTint: 'rgba(245, 158, 11, 0.35)',
    textBadge: '#FBBF24',
    tailwindClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  data: {
    id: 'data',
    name: 'Data / USB / Peripherals',
    description: 'USB-C hubs, USB 3.x/4 data, keyboard/mouse interconnects',
    hex: '#06B6D4',
    rgb: '6, 182, 212',
    glow: 'rgba(6, 182, 212, 0.40)',
    bgTint: 'rgba(6, 182, 212, 0.12)',
    borderTint: 'rgba(6, 182, 212, 0.35)',
    textBadge: '#38BDF8',
    tailwindClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  video: {
    id: 'video',
    name: 'Video / DisplayPort / HDMI',
    description: 'DisplayPort 1.4/2.1, HDMI 2.1, Thunderbolt display pipelines',
    hex: '#8B5CF6',
    rgb: '139, 92, 246',
    glow: 'rgba(139, 92, 246, 0.40)',
    bgTint: 'rgba(139, 92, 246, 0.12)',
    borderTint: 'rgba(139, 92, 246, 0.35)',
    textBadge: '#A78BFA',
    tailwindClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  network: {
    id: 'network',
    name: 'Network / Ethernet / Fiber',
    description: 'Cat6/Cat6A RJ45 cables, 2.5G/10G switches, fiber patch cords',
    hex: '#10B981',
    rgb: '16, 185, 129',
    glow: 'rgba(16, 185, 129, 0.40)',
    bgTint: 'rgba(16, 185, 129, 0.12)',
    borderTint: 'rgba(16, 185, 129, 0.35)',
    textBadge: '#34D399',
    tailwindClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral / Unassigned / Sleeved',
    description: 'General bundle sleeves, unclassified runs, structural wire ties',
    hex: '#94A3B8',
    rgb: '148, 163, 184',
    glow: 'rgba(148, 163, 184, 0.25)',
    bgTint: 'rgba(148, 163, 184, 0.12)',
    borderTint: 'rgba(148, 163, 184, 0.30)',
    textBadge: '#CBD5E1',
    tailwindClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  },
};

/**
 * Multiboard Modular Grid System Parameters
 */
export const multiboardGrid = {
  // Physical pitch (KeepMaking standard)
  pitchMm: 25, // 25mm hole pitch
  subUnitMm: 12.5, // 12.5mm offset connector points
  majorGridMm: 100, // 4-tile boundary

  // Rendering Colors
  colors: {
    canvasBg: '#121316',
    tileBorder: '#18191E',
    octagonStroke: '#22242B',
    octagonFill: '#0E0F12',
    centerDot: '#2A2D36',
    majorGridLine: 'rgba(42, 45, 54, 0.5)',
    snapActiveRing: '#38BDF8',
    snapActiveGlow: 'rgba(56, 189, 248, 0.4)',
  },

  // Geometry definition (at 1:1 screen pixel mapping for a 50x50 pattern)
  patternSize: 50,
  octagons: [
    { cx: 25, cy: 25, radius: 8, chamfer: 3.3 },
    { cx: 0, cy: 0, radius: 8, chamfer: 3.3 },
    { cx: 50, cy: 0, radius: 8, chamfer: 3.3 },
    { cx: 0, cy: 50, radius: 8, chamfer: 3.3 },
    { cx: 50, cy: 50, radius: 8, chamfer: 3.3 },
  ],
  centerDotRadius: 1.5,
};

/**
 * Semantic Tokens mapped to functional usage
 */
export const tokens = {
  surface: {
    canvas: rawColors.graphite[900], // #121316
    base: rawColors.graphite[850], // #15161A
    panel: rawColors.graphite[800], // #18191E
    raised: rawColors.graphite[700], // #22242B
    overlay: rawColors.graphite[650], // #282A33
    recessed: rawColors.graphite[950], // #0E0F12
  },

  border: {
    subtle: rawColors.graphite[700], // #22242B
    default: rawColors.graphite[600], // #2A2D36
    strong: rawColors.graphite[500], // #383C48
    focus: rawColors.indigo[500], // #6366F1
    accent: rawColors.sky[400], // #38BDF8
  },

  text: {
    primary: rawColors.slate[100], // #F1F5F9
    secondary: rawColors.slate[400], // #94A3B8
    muted: rawColors.slate[500], // #64748B
    disabled: rawColors.slate[600], // #475569
    accent: rawColors.indigo[400], // #818CF8
    cyan: rawColors.sky[400], // #38BDF8
  },

  accent: {
    primary: rawColors.indigo[500], // #6366F1
    primaryHover: rawColors.indigo[600], // #4F46E5
    highlight: rawColors.sky[400], // #38BDF8
    subtle: 'rgba(99, 102, 241, 0.12)',
    glow: 'rgba(99, 102, 241, 0.35)',
  },

  status: {
    success: {
      color: rawColors.emerald[500],
      tintBg: 'rgba(16, 185, 129, 0.12)',
      tintBorder: 'rgba(16, 185, 129, 0.35)',
      text: rawColors.emerald[400],
    },
    warning: {
      color: rawColors.amber[500],
      tintBg: 'rgba(245, 158, 11, 0.12)',
      tintBorder: 'rgba(245, 158, 11, 0.35)',
      text: rawColors.amber[400],
    },
    error: {
      color: rawColors.rose[500],
      tintBg: 'rgba(239, 68, 68, 0.14)',
      tintBorder: 'rgba(239, 68, 68, 0.40)',
      text: rawColors.rose[400],
    },
    info: {
      color: rawColors.sky[400],
      tintBg: 'rgba(56, 189, 248, 0.12)',
      tintBorder: 'rgba(56, 189, 248, 0.35)',
      text: rawColors.sky[300],
    },
  },

  channels: channelColors,

  typography: {
    fontSans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, monospace',
    fontFeaturesMono: '"tnum" 1, "zero" 1',
    sizes: {
      display: { fontSize: '18px', lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '700' },
      h1: { fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '600' },
      body: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0', fontWeight: '400' },
      caption: { fontSize: '11px', lineHeight: '14px', letterSpacing: '0.01em', fontWeight: '500' },
      micro: { fontSize: '9px', lineHeight: '12px', letterSpacing: '0.04em', fontWeight: '600' },
      monoSm: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0', fontWeight: '500' },
      monoXs: { fontSize: '10px', lineHeight: '14px', letterSpacing: '0', fontWeight: '400' },
    },
  },

  spacing: {
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },

  radii: {
    xs: '2px', // tags, micro scrubber handles
    sm: '4px', // buttons, inputs, segmented segments
    md: '6px', // toolbars, modal boxes, cards
    lg: '8px', // HUD floating panels, window overlays
    xl: '12px', // outer modal frames
    full: '9999px',
  },

  shadows: {
    panel: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px #2A2D36',
    floating: '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px #2A2D36',
    overlay: '0 16px 40px -8px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px #383C48',
    glowAccent: '0 0 12px rgba(99, 102, 241, 0.35)',
    glowSky: '0 0 10px rgba(56, 189, 248, 0.4)',
    glowChannelPower: '0 0 10px rgba(245, 158, 11, 0.4)',
    glowChannelData: '0 0 10px rgba(6, 182, 212, 0.4)',
    glowChannelVideo: '0 0 10px rgba(139, 92, 246, 0.4)',
    glowChannelNetwork: '0 0 10px rgba(16, 185, 129, 0.4)',
  },
} as const;

/**
 * Tailwind CSS theme configuration helper.
 * Can be exported or spread directly into `tailwind.config.js` -> `theme.extend`
 */
export const tailwindThemeConfig = {
  colors: {
    up: {
      canvas: tokens.surface.canvas,
      base: tokens.surface.base,
      panel: tokens.surface.panel,
      raised: tokens.surface.raised,
      overlay: tokens.surface.overlay,
      recessed: tokens.surface.recessed,
      border: {
        subtle: tokens.border.subtle,
        default: tokens.border.default,
        strong: tokens.border.strong,
        focus: tokens.border.focus,
        accent: tokens.border.accent,
      },
      text: {
        primary: tokens.text.primary,
        secondary: tokens.text.secondary,
        muted: tokens.text.muted,
        disabled: tokens.text.disabled,
        accent: tokens.text.accent,
        cyan: tokens.text.cyan,
      },
      accent: {
        primary: tokens.accent.primary,
        hover: tokens.accent.primaryHover,
        highlight: tokens.accent.highlight,
      },
      channel: {
        power: channelColors.power.hex,
        data: channelColors.data.hex,
        video: channelColors.video.hex,
        network: channelColors.network.hex,
        neutral: channelColors.neutral.hex,
      },
    },
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
  },
  boxShadow: {
    'up-panel': tokens.shadows.panel,
    'up-floating': tokens.shadows.floating,
    'up-overlay': tokens.shadows.overlay,
    'up-glow-accent': tokens.shadows.glowAccent,
    'up-glow-sky': tokens.shadows.glowSky,
  },
};

/**
 * Helper to retrieve channel styling for canvas or SVG paths
 */
export function getChannelColor(channelId: 'power' | 'data' | 'video' | 'network' | 'neutral' | string) {
  if (channelId in channelColors) {
    return channelColors[channelId as keyof typeof channelColors];
  }
  return channelColors.neutral;
}

/**
 * Helper to draw an octagon onto a Canvas 2D context
 */
export function drawMultiboardOctagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  chamfer: number = radius * 0.4142
) {
  const r = radius;
  const c = chamfer;
  ctx.beginPath();
  ctx.moveTo(cx - r + c, cy - r);
  ctx.lineTo(cx + r - c, cy - r);
  ctx.lineTo(cx + r, cy - r + c);
  ctx.lineTo(cx + r, cy + r - c);
  ctx.lineTo(cx + r - c, cy + r);
  ctx.lineTo(cx - r + c, cy + r);
  ctx.lineTo(cx - r, cy + r - c);
  ctx.lineTo(cx - r, cy - r + c);
  ctx.closePath();
}

/**
 * Default SVG string for the Multiboard octagonal canvas background pattern
 */
export const MULTIBOARD_OCTAGON_SVG_DATA_URI = `data:image/svg+xml;utf8,` + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">` +
    `<rect width="50" height="50" fill="#121316"/>` +
    `<path d="M0 0h50v50H0z" fill="none" stroke="#18191E" stroke-width="0.5"/>` +
    // Center octagon
    `<polygon points="21,17 29,17 33,21 33,29 29,33 21,33 17,29 17,21" fill="#0E0F12" stroke="#22242B" stroke-width="1"/>` +
    `<circle cx="25" cy="25" r="1.5" fill="#2A2D36"/>` +
    // Corner quarter octagons
    `<polygon points="0,4 4,0 -4,0" fill="#0E0F12" stroke="#22242B" stroke-width="1"/>` +
    `<polygon points="50,4 46,0 54,0" fill="#0E0F12" stroke="#22242B" stroke-width="1"/>` +
    `<polygon points="0,46 4,50 -4,50" fill="#0E0F12" stroke="#22242B" stroke-width="1"/>` +
    `<polygon points="50,46 46,50 54,50" fill="#0E0F12" stroke="#22242B" stroke-width="1"/>` +
    `<circle cx="0" cy="0" r="1.5" fill="#2A2D36"/>` +
    `<circle cx="50" cy="0" r="1.5" fill="#2A2D36"/>` +
    `<circle cx="0" cy="50" r="1.5" fill="#2A2D36"/>` +
    `<circle cx="50" cy="50" r="1.5" fill="#2A2D36"/>` +
  `</svg>`
);
