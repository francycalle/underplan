# Underplan Visual Design System & Specification

> **Aesthetic Profile:** CAD-Lite / Technical Maker UI (Inspired by Shapr3D, Fusion 360 Dark, Linear, and Bambu Studio)  
> **Target:** High-density, low eye-fatigue, crisp dark graphite surfaces with vibrant technical accenting and specialized channel telemetry.

---

## 1. Design Philosophy & Aesthetic Pillars

Underplan is a specialized planning and routing tool designed for makers, electrical designers, and hardware engineers organizing under-desk setups, multiboard layouts, cable channels, and device mounts.

1. **Dark Graphite Precision:** Deep, cool graphite surfaces (`#121316`, `#18191E`, `#22242B`) minimize visual glare during extended planning sessions. Unlike flat black (`#000000`), graphite conveys depth, tactile materiality, and premium precision tooling.
2. **CAD-Lite Density:** UI elements prioritize high information density, crisp 1px hair-line borders (`#2A2D36`), micro-radii (4px–8px), scrubbable numeric inputs, and monospace tabular metrics.
3. **Multiboard Physicality:** The canvas pays homage to the KeepMaking Multiboard standard with an authentic octagonal grid pattern, snap nodes, and physical dimensional anchors (mm/in).
4. **Channel Telemetry at a Glance:** Cable management paths and channel categories are mapped to distinct, high-contrast spectrums with ambient glows, ensuring power, data, video, and network lines are immediately recognizable even at low zoom levels.
5. **Clear Geometric Hierarchy:** Floating glass/graphite tool docks, compact heads-up displays (HUD), and collapsible property inspectors float cleanly over the infinite work plane.

---

## 2. Color System & Semantic Tokens

### 2.1 Graphite Surface Hierarchy

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `surface-canvas` | `#121316` | Infinite canvas background, base workspace backdrop |
| `surface-base` | `#15161A` | Root application background under split panes |
| `surface-panel` | `#18191E` | Primary docked toolbars, sidebars, panel backgrounds |
| `surface-raised` | `#22242B` | Floating cards, modal bodies, toolbar pill containers, row hover |
| `surface-overlay` | `#282A33` | Dropdowns, flyout menus, tooltips, active drag targets |
| `surface-recessed`| `#0E0F12` | Recessed wells, numeric input fields, multiboard octagon holes |

### 2.2 Borders & Dividers

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `border-subtle` | `#22242B` | Internal panel dividers, non-essential separators |
| `border-default`| `#2A2D36` | Standard card/panel 1px borders, input borders |
| `border-strong` | `#383C48` | Active element borders, panel headers on hover |
| `border-focus`  | `#6366F1` | Primary interactive focus ring (with 2px glow) |
| `border-accent` | `#38BDF8` | CAD cursor snap, dimension extension line border |

### 2.3 Typography & Text Contrast

| Token Name | Hex Code | Role & Guidelines |
| :--- | :--- | :--- |
| `text-primary` | `#F1F5F9` | Primary headings, active metrics, tool names (Slate 100) |
| `text-secondary`| `#94A3B8` | Field labels, secondary stats, axis coordinates (Slate 400) |
| `text-muted` | `#64748B` | Shortcut keys, measurement units (mm), disabled hints (Slate 500) |
| `text-disabled`| `#475569` | Non-interactive controls, disabled tools (Slate 600) |
| `text-accent` | `#818CF8` | Active tool indicator, highlighted selection state |

### 2.4 Brand & Interactive Accents

| Token Name | Hex Code | Visual Application |
| :--- | :--- | :--- |
| `accent-primary` | `#6366F1` | Primary CTAs, active tool toggle fill, origin point (`[0,0]`) |
| `accent-primary-hover` | `#4F46E5` | Active hover state for primary action buttons |
| `accent-cyan` | `#38BDF8` | Crosshair guides, snap alignment rays, measurement calipers |
| `accent-glow` | `rgba(99, 102, 241, 0.25)` | 0 0 12px ambient illumination for selected CAD nodes |

### 2.5 Validation & Status States

| State | Primary Accent | Background Tint | Border Tint | Text |
| :--- | :--- | :--- | :--- | :--- |
| **Valid / Success** | `#10B981` | `rgba(16, 185, 129, 0.12)` | `rgba(16, 185, 129, 0.35)` | `#34D399` |
| **Warning / Caution** | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `rgba(245, 158, 11, 0.35)` | `#FBBF24` |
| **Error / Collision** | `#EF4444` | `rgba(239, 68, 68, 0.14)` | `rgba(239, 68, 68, 0.40)` | `#F87171` |
| **Info / Measuring** | `#38BDF8` | `rgba(56, 189, 248, 0.12)` | `rgba(56, 189, 248, 0.35)` | `#7DD3FC` |

---

## 3. Channel & Wire Routing Color System

Every cable run, raceway channel, and wire route in Underplan has a designated functional category. The color tokens are tuned for high luminosity on the `#121316` Multiboard grid.

```
+-------------------------------------------------------------------------+
| CHANNEL CATEGORY   | COLOR CODE | GLOW TOKEN               | TINT BG    |
+--------------------+------------+--------------------------+------------+
| Power              | #F59E0B    | rgba(245, 158, 11, 0.4)  | #F59E0B1A  |
| Data / USB         | #06B6D4    | rgba(6, 182, 212, 0.4)   | #06B6D41A  |
| Video / Display    | #8B5CF6    | rgba(139, 92, 246, 0.4)  | #8B5CF61A  |
| Network / Eth      | #10B981    | rgba(16, 185, 129, 0.4)  | #10B9811A  |
| Neutral / General  | #94A3B8    | rgba(148, 163, 184, 0.3) | #94A3B81A  |
+-------------------------------------------------------------------------+
```

### Channel Routing Styling Rules:
1. **Unselected Route:** 2px stroke, solid or dashed depending on layer (top vs underside of desk), stroke color = `channel.color`.
2. **Selected / Active Route:** 3px stroke with a 6px `box-shadow` / SVG `filter="drop-shadow(0 0 6px channel.glow)"`, end-caps rounded, terminal snap plugs highlighted.
3. **Routing Capacity / Load Overfill:** When a channel bundle exceeds recommended cable diameter, the outline shifts to `#EF4444` with flashing warning badge.
4. **Channel Tag Pills:** `font-family: JetBrains Mono`, 10px font size, uppercase, 2px padding, subtle border `1px solid channel.color`, background `channel.tint`.

---

## 4. Multiboard Canvas Grid Specification

The Underplan canvas features a realistic representation of KeepMaking’s Multiboard modular organization standard.

### 4.1 Physical & Canvas Grid Parameters

- **Standard Module Unit:** 25mm × 25mm center-to-center hole spacing.
- **Hole Geometry:** Regular Octagon (8 sides, 45° chamfers) with a 6.8mm outer diameter hole and a 2.5mm central pilot peg point.
- **Secondary Pegs:** Off-axis 12.5mm offset connector points (quad-cluster).

### 4.2 Color & Rendering Values

- **Canvas Background:** `#121316`
- **Octagon Wall Stroke:** `#22242B` (1px width at 100% zoom)
- **Octagon Well Fill:** `#0D0E11` (Deep recessed plastic cavity)
- **Center Pilot Dot:** `#2A2D36` (Radius 1.2px)
- **Major Grid Axis (100mm):** `#2A2D36` subtle dotted line
- **Active Snap Highlight:** `#38BDF8` ring with 4px outer bloom

### 4.3 SVG Grid Pattern Generator (Reusable)

```xml
<pattern id="multiboard-grid" width="50" height="50" patternUnits="userSpaceOnUse">
  <!-- Subtle cell divider guide -->
  <rect width="50" height="50" fill="#121316" stroke="#18191E" stroke-width="0.5"/>
  
  <!-- Primary Center Octagon (at 25, 25) -->
  <polygon points="
    21,17 29,17 33,21 33,29 29,33 21,33 17,29 17,21"
    fill="#0E0F12" stroke="#22242B" stroke-width="1"/>
  <circle cx="25" cy="25" r="1.5" fill="#2A2D36"/>

  <!-- Corner Quarter Octagons (at 0,0 / 50,0 / 0,50 / 50,50) -->
  <polygon points="
    -4,-8 4,-8 8,-4 8,4 4,8 -4,8 -8,4 -8,-4"
    transform="translate(0, 0)"
    fill="#0E0F12" stroke="#22242B" stroke-width="1"/>
  <circle cx="0" cy="0" r="1.5" fill="#2A2D36"/>

  <polygon points="
    -4,-8 4,-8 8,-4 8,4 4,8 -4,8 -8,4 -8,-4"
    transform="translate(50, 0)"
    fill="#0E0F12" stroke="#22242B" stroke-width="1"/>
  <circle cx="50" cy="0" r="1.5" fill="#2A2D36"/>

  <polygon points="
    -4,-8 4,-8 8,-4 8,4 4,8 -4,8 -8,4 -8,-4"
    transform="translate(0, 50)"
    fill="#0E0F12" stroke="#22242B" stroke-width="1"/>
  <circle cx="0" cy="50" r="1.5" fill="#2A2D36"/>

  <polygon points="
    -4,-8 4,-8 8,-4 8,4 4,8 -4,8 -8,4 -8,-4"
    transform="translate(50, 50)"
    fill="#0E0F12" stroke="#22242B" stroke-width="1"/>
  <circle cx="50" cy="50" r="1.5" fill="#2A2D36"/>
</pattern>
```

---

## 5. Typography Scale & Hierarchy

Underplan utilizes dual typefaces:
1. **Primary Interface:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`
2. **Technical / Measurements / Monospace:** `JetBrains Mono`, `"Fira Code"`, `ui-monospace`, `monospace` (Always with `font-feature-settings: "tnum"` for fixed-width tabular numbers).

| Token | Size / Line-Height | Weight | Tracking | Typical Usage |
| :--- | :--- | :--- | :--- | :--- |
| `type-display` | 18px / 24px | Bold (700) | `-0.02em` | Project Title, Export Modal Headers |
| `type-h1` | 14px / 20px | SemiBold (600) | `-0.01em` | Panel Sections, Inspector Group Headings |
| `type-body` | 12px / 16px | Regular (400) | `normal` | Standard UI labels, inputs, dropdown items |
| `type-caption` | 11px / 14px | Medium (500) | `0.01em` | Tooltips, parameter names, helper notes |
| `type-micro` | 9px / 12px | SemiBold (600) | `0.04em` | Hotkey badges, channel tags, lock status |
| `type-mono-sm` | 12px / 16px | Medium (500) | `0` | Coordinate readouts (`X: 125.0mm`), Dimensions |
| `type-mono-xs` | 10px / 14px | Regular (400) | `0` | Grid pitch, wire gauges, part serial numbers |

---

## 6. Spacing, Radii & Depth Scale

### 6.1 Spacing Ladder (High-Density CAD)

```
--up-space-0_5: 2px   (Micro padding, badge vertical offset)
--up-space-1:   4px   (Tight gaps between toolbar buttons)
--up-space-1_5: 6px   (Button horizontal padding, icon spacing)
--up-space-2:   8px   (Standard compact row gap, panel inset)
--up-space-3:   12px  (Group separation, section card padding)
--up-space-4:   16px  (Panel padding, dialog content gap)
--up-space-6:   24px  (Modal headers, workspace margins)
--up-space-8:   32px  (Canvas margin safety zone)
```

### 6.2 Radii

- `radius-xs`: `2px` (Hotkey badges, scrubber handles, tags)
- `radius-sm`: `4px` (Buttons, numeric inputs, dropdown rows)
- `radius-md`: `6px` (Floating toolbars, segmented controls, cards)
- `radius-lg`: `8px` (Floating inspector windows, dialog modals)
- `radius-full`: `9999px` (Pill toggles, status dots)

### 6.3 Shadows & Elevation

```css
/* Elevation 1: Docked panels & sub-elements */
--up-shadow-panel: 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px #2A2D36;

/* Elevation 2: Floating CAD inspectors, HUD overlays */
--up-shadow-floating: 0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px #2A2D36;

/* Elevation 3: Modals, active context menus */
--up-shadow-overlay: 0 16px 40px -8px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px #383C48;

/* Glow: Active node selection */
--up-shadow-glow-accent: 0 0 12px rgba(99, 102, 241, 0.35);
--up-shadow-glow-cyan: 0 0 10px rgba(56, 189, 248, 0.4);
```

---

## 7. Component Style Specifications

### 7.1 CAD Toolbar & Tool Action Buttons

- **Height:** 32px (Compact CAD toolbar button), 26px (Micro toolbar button in HUD)
- **Base Style:** Transparent or `#18191E`, border 1px transparent, text `#94A3B8`, border-radius 4px.
- **Hover:** Background `#22242B`, border 1px solid `#2A2D36`, text `#F1F5F9`.
- **Active / Selected Tool:** Background `rgba(99, 102, 241, 0.18)`, border 1px solid `#6366F1`, text `#818CF8`, with subtle bottom highlight pill.
- **Disabled:** Opacity 0.4, cursor `not-allowed`.

### 7.2 Segmented Controls (Mode Switcher: Select, Cable, Multiboard, Mount)

- Background: `#121316` recessed trough.
- Border: 1px solid `#22242B`.
- Padding: 2px.
- Active Segment: Background `#22242B`, text `#F1F5F9`, border 1px solid `#2A2D36`, box-shadow `0 1px 2px rgba(0,0,0,0.5)`.

### 7.3 Scrubbable Numeric Inputs & Dimensions

- Visual appearance: Recessed `#0E0F12` background, 1px `#2A2D36` border.
- Text: `font-family: JetBrains Mono`, 12px, tabular figures, text `#F1F5F9`.
- Unit suffix (`mm`, `deg`): `#64748B` inline suffix.
- Scrub interaction: Cursor `ew-resize`, dragging increases/decreases value with fine step on `Shift` / `Alt`.
- Focus state: Border color `#6366F1`, box-shadow `0 0 0 2px rgba(99, 102, 241, 0.2)`.

### 7.4 Floating Inspector Panels (HUD)

- Floating container: Background `#18191ECC` with backdrop blur (`backdrop-filter: blur(12px)`).
- Header bar: Height 28px, drag handle grip dots on left, title in 11px uppercase bold `#94A3B8`, minimize/close icon buttons on right.
- Separators: 1px solid `#22242B`.
- Content padding: 10px 12px.

### 7.5 Status Bar & Viewport Telemetry Footer

- Placed along canvas bottom edge (height 28px).
- Surface: `#15161A`, border-top: 1px solid `#22242B`.
- Displays:
  - Cursor coordinates: `X: 450.0mm  Y: 125.0mm` (JetBrains Mono)
  - Grid Snap mode: `SNAP: 25mm (Multiboard Octagon)` with green active indicator dot
  - Zoom factor: `100%` (clickable for 1:1 / Fit to Screen)
  - Active Channel Mode: `POWER (Channel 1)` with amber badge

---

## 8. Directory & File Reference

- **CSS Custom Properties & Utilities:** `src/styles/tokens.css`
- **TypeScript Tokens & Helper Library:** `src/styles/tokens.ts`
- **Export Index:** `src/styles/index.ts`
