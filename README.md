# Underplan ⚡🔌

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-72%2F72%20Passing-emerald)](tests/)

> **Plan your Underware cable-management layout before you print.**  
> A fast, polished visual planning tool for Underware 2.0 cable channels mounted on KeepMaking Multiboard pegboard grids, featuring automatic snap connector tallying and Bill of Materials (BOM) generation.

![Underplan Interactive Workspace Overview](docs/screenshots/01-overview.png)

---

## 🌟 Overview

**Underplan** is an interactive, CAD-lite design prototype built for makers, desk-setup enthusiasts, and 3D printing hobbyists. Mounting Underware cable raceways under a desk requires knowing the exact combination of channel segments, turns, and snap connectors needed to fit the Multiboard tile layout. 

Underplan solves this by providing:
1. **Interactive SVG Top-Down Planner:** Drag, drop, snap, and rotate modular Underware channels onto a 25mm Multiboard octagonal pegboard grid.
2. **Real-time Geometric Validation:** Instant visual feedback detecting channel collisions (red highlight) and out-of-bounds positioning (amber halo).
3. **Automated Bill of Materials (BOM):** Dynamically tallies Multiboard tiles, channel parts by type and length, and computes required snap fasteners—including an automatic **+10% spare allowance** (rounded up) to cover 3D print defects or snap wear.
4. **Export & Sharing:** One-click CSV download (RFC-4180 compliant) and Markdown clipboard copy for forum posts, slicer queues, and hardware inventory.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v20/v22)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to start planning.

### 3. Run Automated Tests
```bash
npm test
```
Executes the native test suite covering geometry math, discrete rotations, collision algorithms, snap tallying, and acceptance criteria (72/72 passing tests).

### 4. Build for Production
```bash
npm run build
```
Creates an optimized, type-checked production bundle in `dist/`.

### 5. Generate High-Res Screenshots
```bash
npm run screenshots
```
Uses Puppeteer and headless Chrome to generate Retina-quality screenshots of the app in `docs/screenshots/`.

---

## 🛠️ Core Features

| Feature | Description |
| :--- | :--- |
| **Multiboard Grid Configuration** | Customize board matrix dimensions (e.g. 6×3 = 18 tiles = 48×24 holes = 1200×600mm) with live millimeter and hole telemetry. |
| **Modular Channel Library** | Select from Straight channels (`I-2`, `I-3`, `I-4`), 90° Corner Turns (`L-Turn`), 3-way `T-Junctions`, and 4-way `Cross` channels. |
| **Interactive Canvas** | Top-down SVG viewport featuring KeepMaking-style octagonal snap holes, live grid-snapping (25mm), ghost placement preview, channel selection, drag-and-drop repositioning, and inline rotation controls. |
| **Zoom & Pan Controls** | Smooth canvas navigation with dedicated Zoom In/Out, Reset Zoom (100%), and keyboard hotkeys (`+` / `-` / `0` / `Space`+drag / Wheel). |
| **Functional Cable Color Encoding** | Color-code cable pathways by functional category: **Power** (Amber), **Data / USB** (Cyan), **Video / DP** (Purple), **Network / Eth** (Emerald), and **Neutral** (Slate). |
| **Collision & Bounds Validation** | Dual-stage collision engine (AABB broadphase + grid-cell set narrowphase) that detects overlaps with pulsed red warning halos and boundary overshoots with amber halos. |
| **Live Bill of Materials (BOM)** | Persistent bottom telemetry bar and expandable modal drawer detailing required tiles, channel parts, and snap fasteners. |
| **Smart Spare Snap Policy** | Automatically calculates snap connectors per segment type and applies a configurable **+10% spare rate** (rounded up) for printing safety. |
| **One-Click Export** | Download RFC-4180 standard CSV files or copy formatted Markdown specifications directly to the clipboard with toast feedback. |
| **Curated Demo Layout** | One-click "Load Demo" button loads a realistic under-desk dual-tier cable routing plan demonstrating high-voltage/low-voltage separation. |

---

## 📸 Interface & Workflow Gallery

### 1. CAD-Lite Planning Canvas & Overview
Full dark graphite workspace with Multiboard 25mm octagonal pegboard grid, KeepMaking tile matrices, and functional color-coded cable pathways (Power, Data, Video, Network).
![Underplan Interactive Workspace Overview](docs/screenshots/01-overview.png)

### 2. Contextual Channel Inspector & Parametric Sizing
Select any placed conduit to inspect physical dimensions (1 MU = 25mm), change 90° discrete rotations, tune parametric lengths (1–16 MU), configure mounting hardware, or edit manual snap anchors.
![Contextual Channel Inspector](docs/screenshots/02-channel-inspector.png)

### 3. Modular Underware 2.0 Catalog & Category Palette
Left tool palette providing direct access to Straight channels, Elbow turns, Radial curves (R2–R5), T-Junctions, Y-Branches, Crosses, Mitred corners, and modular accessories (Cable Spool, Multi-Socket Holder).
![Modular Underware 2.0 Channel Library](docs/screenshots/03-channel-palette.png)

### 4. Real-Time Bill of Materials (BOM) & Hardware Calculator
Interactive modal detailing exact 3D print part tallies, Multiboard tile counts, and snap fastener counts with an automatic +10% spare safety margin. Export to CSV or copy to clipboard as Markdown in one click.
![Bill of Materials Modal](docs/screenshots/04-bom-modal.png)

---

## 📐 Documented MVP Assumptions & Calculation Rules

Underplan uses explicit, standardized mathematical assumptions:

1. **Multiboard Grid Standard:**
   - **Hole Pitch:** Strictly **25.0 mm** center-to-center between octagonal mounting holes, matching the open KeepMaking standard.
   - **Standard Tile Size:** Standard 8×8 hole tile (200 mm × 200 mm physical dimension).
   - **Board Grid Unit:** 1 grid coordinate unit ($u$) = 1 octagon hole pitch = 25.0 mm.

2. **Underware Channel Dimensions:**
   - Channel bodies follow a low-profile 25mm nominal width matching 1 unit pitch.
   - Straight channels span $N$ units ($N \in \{2, 3, 4\}$).
   - L-Corner turns span a $2 \times 2$ unit footprint.
   - T-Junctions span a $3 \times 2$ unit footprint.
   - 4-Way Cross channels span a $3 \times 3$ unit cross footprint (5 occupied cells).

3. **Snap Connector Counting Rules:**
   - **Straight Channels:** 1 snap per unit length ($L$ units = $L$ snaps; e.g. I-2 needs 2 snaps, I-3 needs 3 snaps, I-4 needs 4 snaps).
   - **L-Corner Turn:** 3 snaps (two terminal ends + corner apex anchor).
   - **T-Junction:** 4 snaps (three conduit terminal ends + central junction anchor).
   - **4-Way Cross:** 4 snaps (four branch terminals).
   - **Spares Formula:** $\text{Spares} = \lceil \text{Base Snaps} \times 0.10 \rceil$ (if base snaps > 0).

4. **Coordinate System & Rotations:**
   - Origin $(0, 0)$ is at the top-left hole of the board.
   - Rotations are discrete 90° clockwise increments ($0^\circ, 90^\circ, 180^\circ, 270^\circ$).

---

## ⚠️ Known MVP Limitations

- **2D Top-Down Simulation:** Underplan plans the horizontal mounting plane. It does not simulate 3D vertical drop brackets, multi-layer Z-stacking raceways, or desk leg risers.
- **No Direct 3D CAD/STL Export:** Underplan generates comprehensive Bills of Materials and layout specifications; it does not slice STL files or communicate directly with slicers.
- **Client-Side In-Memory State:** All state is maintained locally in React memory. Reloading resets the canvas (you can save/export via CSV or copy BOM Markdown).
- **Simulated Hardware Specifications:** Fastener and channel geometry represent generalized prototype models of the Underware 2.0 and Multiboard ecosystem and should be verified against your specific printer tolerances and filament shrinkage.

---

## 📂 Project Structure

```
UnderPlan/
├── docs/
│   ├── screenshots/            # HiDPI Retina screenshots for repository showcase
│   ├── domain-assumptions.md   # Domain rules, snap math, and KeepMaking assumptions
│   ├── geometry-rules.md       # Dual-coordinate mathematics & collision algorithms
│   ├── qa-report.md            # Acceptance criteria verification matrix (AC-1 to AC-10)
│   ├── ux-spec.md              # UX flows, wireframes, keyboard hotkeys, and copy
│   └── visual-system.md        # CAD-lite dark graphite theme & design tokens
├── scripts/
│   └── capture-screenshots.mjs # Automated Puppeteer high-res screenshot capture
├── src/
│   ├── components/
│   │   ├── BOMBar.tsx          # Persistent bottom telemetry summary bar
│   │   ├── BOMDrawer.tsx       # Slide-out modal drawer with itemized tables & exports
│   │   ├── Canvas.tsx          # Top-down SVG planner canvas with octagon grid & snap
│   │   ├── Header.tsx          # Top nav bar with board size controls & actions
│   │   ├── InspectorPanel.tsx  # Channel configuration and property controls
│   │   ├── Toast.tsx           # Floating notification toast
│   │   └── ToolPalette.tsx     # Left channel library and tool selector
│   ├── data/
│   │   └── demoLayout.ts       # Realistic under-desk demo layout
│   ├── lib/
│   │   ├── bom.ts              # Pure BOM generator, CSV, and Markdown formatters
│   │   ├── geometry.ts         # Pure geometry, collision, and rotation math
│   │   ├── index.ts            # Library barrel re-export
│   │   └── types.ts            # Full TypeScript interfaces and domain types
│   ├── styles/
│   │   ├── index.ts            # Theme helper exports
│   │   ├── tokens.css          # Design token CSS custom properties
│   │   └── tokens.ts           # Design token JavaScript constants
│   ├── App.tsx                 # Main application state orchestrator
│   ├── index.css               # Global Tailwind CSS and custom styling
│   └── main.tsx                # React 18 DOM entrypoint
├── tests/
│   ├── bom.test.ts             # BOM aggregation, formatting, and spare tests
│   ├── geometry.test.ts        # Geometry, footprint, rotation, and collision tests
│   └── qa-acceptance.test.ts   # End-to-end acceptance tests (AC-1 to AC-10)
├── LICENSE                     # MIT License
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

---

## 📜 Legal & Community Disclaimer

*Underplan is an independent, unofficial planning tool developed for portfolio and educational demonstration purposes. Multiboard is designed by Jonathan @ KeepMaking. Underware is designed by Hands on Katie and BlackjackDuck. Underplan is not affiliated with, endorsed by, or sponsored by KeepMaking, Multiboard, or Underware.*
