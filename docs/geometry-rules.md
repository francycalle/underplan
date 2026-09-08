# Underplan Geometry & Interaction Specification

> **Module Version:** 1.0.0  
> **Author / Domain:** Geometry & Interaction Logic Agent  
> **Status:** Production Ready  
> **Reference Implementations:** `src/lib/geometry.ts`, `src/lib/types.ts`, `src/lib/bom.ts`

---

## 1. Architectural Philosophy & Coordinate Foundations

Underplan operates on a **dual-coordinate model** designed for CAD-level determinism, zero floating-point drift, and intuitive user interaction on the top-down SVG canvas.

```
+--------------------------------------------------------------------------------+
| DUAL-COORDINATE SYSTEM ARCHITECTURE                                            |
+--------------------------------------------------------------------------------+
|                                                                                |
|  [ Physical World / SVG Canvas ]            [ Discrete Grid Space ]            |
|  Continuous millimeters (mm) / px           Integer hole indices (x, y)        |
|  (0.0mm, 0.0mm) = Board Top-Left             (0, 0) = Board Top-Left Hole       |
|                                                                                |
|              WorldPoint                     GridPoint                          |
|         { x: 125.0, y: 75.0 }   <=======>   { x: 5, y: 3 }                     |
|                                                                                |
|                 Transformation:                                                |
|                   worldToGrid: x_grid = round(x_world / pitchMm)               |
|                   gridToWorld: x_world = x_grid * pitchMm                      |
|                   snapToGrid:  x_snapped = round(x_world / pitchMm) * pitchMm  |
|                                                                                |
+--------------------------------------------------------------------------------+
```

### 1.1 Core Principles
1. **Discrete Grid Authority:** All channel placements, footprints, collision detection, and snap connections are computed exclusively in discrete integer hole coordinates (`GridPoint`). Continuous coordinates exist solely for rendering and mouse cursor tracking.
2. **Deterministic Functional Purity:** All geometric calculations (`geometry.ts` and `bom.ts`) are pure functions with no side effects, returning immutable frozen objects or tuples.
3. **SVG Orientation Alignment:** Follows standard SVG / 2D screen coordinate conventions:
   - `+X` extends **East** (to the right, across columns)
   - `+Y` extends **South** (downward, across rows)
   - Rotations are clockwise: `0°`, `90°`, `180°`, `270°`

---

## 2. Multiboard Grid & Board Dimension Rules

The planner models KeepMaking’s authentic **Multiboard** pegboard standard.

### 2.1 Standard Dimensions & Units
- **Module Pitch ($P$):** Standard $25.0\,\text{mm}$ center-to-center distance between adjacent octagon hole attachment points.
- **Default Board Configuration:**
  - **Tile Columns:** 6
  - **Tile Rows:** 3
  - **Tile Dimensions:** $8 \times 8$ octagon holes ($200\,\text{mm} \times 200\,\text{mm}$)
  - **Total Board Grid:** $48 \times 24$ holes ($1200\,\text{mm} \times 600\,\text{mm}$)

### 2.2 Board Sizing Mathematical Formulas
For any board configuration defined by `cols`, `rows`, `tileWidthHoles`, `tileHeightHoles`, and `holePitchMm`:

$$\text{totalHolesX} = \text{cols} \times \text{tileWidthHoles}$$

$$\text{totalHolesY} = \text{rows} \times \text{tileHeightHoles}$$

$$\text{totalWidthMm} = \text{totalHolesX} \times \text{holePitchMm}$$

$$\text{totalHeightMm} = \text{totalHolesY} \times \text{holePitchMm}$$

### 2.3 Tile Matrix Mapping
Given any hole coordinate $(x, y)$ on the board:
- Tile Matrix Column: $\text{tileCol} = \lfloor x / \text{tileWidthHoles} \rfloor$
- Tile Matrix Row: $\text{tileRow} = \lfloor y / \text{tileHeightHoles} \rfloor$
- Local Tile Hole X: $\text{localHoleX} = x \pmod{\text{tileWidthHoles}}$
- Local Tile Hole Y: $\text{localHoleY} = y \pmod{\text{tileHeightHoles}}$

Conversely, the top-left hole origin of tile $(\text{col}, \text{row})$ is:
$$\text{originX} = \text{col} \times \text{tileWidthHoles}, \quad \text{originY} = \text{row} \times \text{tileHeightHoles}$$

---

## 3. Channel Catalog & Canonical Footprints

Channels represent Underware modular cable raceways. Each channel is defined by its canonical (0° rotation) footprint, local port locations, and mounting snap indices.

### 3.1 Straight Channel (I-Channel)
- **Parameter:** Length $N$ (integer $\ge 1$, standard sizes: 2, 3, 4, 6 units).
- **Canonical Footprint (0°):**
  $$C_0 = \{(0, 0), (1, 0), \dots, (N-1, 0)\}$$
- **Bounding Box:** Width = $N$, Height = 1.
- **Port Endpoints:** $(0, 0)$ [West] and $(N-1, 0)$ [East].

```
Length 3 at 0°:
[ (0,0) ]---[ (1,0) ]---[ (2,0) ]
```

### 3.2 Corner Channel (L-Channel 90° Turn)
- **Footprint:** $2 \times 2$ grid cells. Connects North entry port to East exit port through an elbow turn.
- **Canonical Footprint (0°):**
  $$C_0 = \{(0, 0), (0, 1), (1, 1)\}$$
- **Bounding Box:** Width = 2, Height = 2. (Cell $(1, 0)$ is open).
- **Port Endpoints:** $(0, 0)$ [North Port] and $(1, 1)$ [East Port].

```
Corner at 0°:
[ (0,0) ]       (open)
   |
[ (0,1) ]=======[ (1,1) ]
```

### 3.3 Junction Channel (T-Channel 3-Way Split)
- **Footprint:** $3 \times 2$ grid cells. Comprises a continuous horizontal trunk on row 0 and a perpendicular branch descending from the center node into row 1.
- **Canonical Footprint (0°):**
  $$C_0 = \{(0, 0), (1, 0), (2, 0), (1, 1)\}$$
- **Bounding Box:** Width = 3, Height = 2.
- **Port Endpoints:** $(0, 0)$ [West Trunk Port], $(2, 0)$ [East Trunk Port], and $(1, 1)$ [South Branch Port].

```
Junction at 0°:
[ (0,0) ]=======[ (1,0) ]=======[ (2,0) ]
                   ||
                [ (1,1) ]
```

### 3.4 Cross Channel (X-Channel 4-Way Intersection)
- **Footprint:** $3 \times 3$ grid cells. Full orthogonal 4-way crossing.
- **Canonical Footprint (0°):**
  $$C_0 = \{(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)\}$$
- **Bounding Box:** Width = 3, Height = 3.
- **Port Endpoints:** $(1, 0)$ [North], $(0, 1)$ [West], $(2, 1)$ [East], $(1, 2)$ [South].

---

## 4. Discrete Rotation Mathematics

All channels support discrete 90-degree orthogonal clockwise steps: $\theta \in \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}$.

### 4.1 Coordinate Transformation Matrix (Y-Down Clockwise)
Let a channel have canonical width $W_0$ and height $H_0$. Any cell $(x, y) \in [0..W_0-1] \times [0..H_0-1]$ transforms as:

| Angle | Transformation $(x', y')$ | Resulting Bounding Box $(W', H')$ |
| :---: | :--- | :---: |
| **0°** | $(x, y)$ | $W_0 \times H_0$ |
| **90°** | $(H_0 - 1 - y, x)$ | $H_0 \times W_0$ |
| **180°** | $(W_0 - 1 - x, H_0 - 1 - y)$ | $W_0 \times H_0$ |
| **270°** | $(y, W_0 - 1 - x)$ | $H_0 \times W_0$ |

### 4.2 Top-Left Normalization
After applying the rotation transformation, local coordinates are normalized such that:
$$x_{\text{norm}} = x' - \min(X'), \quad y_{\text{norm}} = y' - \min(Y')$$
This ensures the local footprint's bounding box always anchors cleanly at $(0, 0)$.

### 4.3 Placed Footprint Calculation
For a channel with anchor position $(X_p, Y_p)$ and rotation $\theta$:
$$\text{Cells}_{\text{placed}} = \left\{ (X_p + x_{\text{norm}}, Y_p + y_{\text{norm}}) \;\middle|\; (x_{\text{norm}}, y_{\text{norm}}) \in \text{LocalFootprint}(\text{kind}, \text{length}, \theta) \right\}$$

---

## 5. Collision & Boundary Verification Algorithms

Underplan maintains a zero-tolerance integrity policy: channels must not collide, and no channel body may exceed board boundaries.

### 5.1 Out-of-Bounds Detection
For a board with dimensions $\text{totalHolesX} \times \text{totalHolesY}$:
$$\text{isOutOfBounds}(p) \iff p.x < 0 \lor p.x \ge \text{totalHolesX} \lor p.y < 0 \lor p.y \ge \text{totalHolesY}$$

- **Broadphase Check:** Compares the channel's `BoundingBox` against the board rectangle $[0, \text{totalHolesX}-1] \times [0, \text{totalHolesY}-1]$.
- **Narrowphase Check:** Filters individual cells: `getOutOfBoundsCells(channel, config)`.

### 5.2 Two-Stage Collision Detection Pipeline
Checking whether two channels $C_1$ and $C_2$ collide uses a hierarchical test:

```
[ Candidate Channel Placement ]
              │
              ▼
   ┌──────────────────────┐
   │ Stage 1: Broadphase  │
   │  AABB Overlap Check  │
   └──────────┬───────────┘
              │
     No Overlap ───► [ NO COLLISION (Instant Exit) ]
              │ Overlap
              ▼
   ┌──────────────────────┐
   │ Stage 2: Narrowphase │
   │ Grid Cell Hash Check │
   └──────────┬───────────┘
              │
      Common Cells?
      ├── None ────► [ NO COLLISION ]
      └── ≥ 1 ─────► [ COLLISION DETECTED ]
```

1. **Stage 1 (Broadphase AABB):**
   $$\text{doBoxesOverlap}(A, B) = \neg (A.\text{maxX} < B.\text{minX} \lor A.\text{minX} > B.\text{maxX} \lor A.\text{maxY} < B.\text{minY} \lor A.\text{minY} > B.\text{maxY})$$
2. **Stage 2 (Narrowphase Cell Set):**
   $$\text{Intersect}(\text{Cells}_1, \text{Cells}_2) \neq \emptyset$$

### 5.3 Global Board Collision Analysis (`findCollisions`)
To find all collisions across $M$ placed channels with $K$ total occupied cells:
1. Construct a spatial hash map: $\text{Map}\langle \text{CellKey}, [\text{ChannelID}] \rangle$.
2. For every cell where $\text{length}([\text{ChannelID}]) > 1$, register collision pairs and mark the cell as an overlap site.
3. Computational complexity: $O(K)$, virtually instantaneous for interactive 60fps canvas dragging.

---

## 6. Snap Connector Mounting Specification

Underware cable channels secure to Multiboard tiles using click-in snaps inserted into octagon holes.

### 6.1 Placement Rules per Channel Type
- **Straight Channels:**
  - Length 1: 1 snap at cell $(0, 0)$
  - Length 2: 2 snaps at $(0, 0)$ and $(1, 0)$
  - Length 3: 2 snaps at $(0, 0)$ and $(2, 0)$ (both terminal ends)
  - Length $\ge 4$: 1 snap at $(0, 0)$, 1 snap at $(N-1, 0)$, plus intermediate snaps spaced every 2 units (or customized via `customSnapSpacing`).
- **Corner Channels (2x2):**
  - 2 snaps located at the two terminal ports: $(0, 0)$ [North Port] and $(1, 1)$ [East Port].
- **Junction Channels (3x2):**
  - 3 snaps located at the terminal ports: $(0, 0)$ [West], $(2, 0)$ [East], and $(1, 1)$ [South].
- **Cross Channels (3x3):**
  - 4 snaps located at the 4 open ports: $(1, 0)$, $(0, 1)$, $(2, 1)$, $(1, 2)$.

### 6.2 Snap Coordinate Rotation
Snaps are defined in canonical local coordinates and rotate simultaneously with the channel body using `rotateLocalCell`. When placed on the board, snap positions translate to:
$$(X_{\text{snap}}, Y_{\text{snap}}) = (X_p + x_{\text{rot}}, Y_p + y_{\text{rot}})$$

---

## 7. Bill of Materials (BOM) Generation & Rules

The BOM engine (`src/lib/bom.ts`) aggregates all physical hardware needed to build the configured layout.

### 7.1 Tile Aggregation
- Default $8 \times 8$ Tiles ($200\,\text{mm} \times 200\,\text{mm}$): Part # `MB-TILE-8X8`
- Compact $4 \times 4$ Tiles ($100\,\text{mm} \times 100\,\text{mm}$): Part # `MB-TILE-4X4`
- Total Tile Quantity: $\text{cols} \times \text{rows}$

### 7.2 Channel Aggregation
Channels are aggregated by part number:
- Straight $N$-Unit: `MB-CHAN-STR-NU` (e.g. `MB-CHAN-STR-2U`, `MB-CHAN-STR-4U`)
- 90° Corner: `MB-CHAN-CNR-2X2`
- T-Junction: `MB-CHAN-JNC-3X2`
- 4-Way Cross: `MB-CHAN-CRS-3X3`

### 7.3 Snap Connector Spare Calculation (10% Ceil Rule)
Mounting snaps are small 3D-printed clips subject to wear or breakage during installation. The BOM enforces a strict **+10% spare margin rounded up**:

$$\text{baseSnapCount} = \sum_{c \in \text{channels}} \text{snapCount}(c)$$

$$\text{spareSnapCount} = \lceil \text{baseSnapCount} \times 0.10 \rceil \quad (\text{if } \text{baseSnapCount} > 0)$$

$$\text{totalSnapCount} = \text{baseSnapCount} + \text{spareSnapCount}$$

#### Example Telemetry:
- If layout requires 2 snaps $\implies \lceil 0.2 \rceil = 1$ spare $\implies$ **3 snaps total**.
- If layout requires 9 snaps $\implies \lceil 0.9 \rceil = 1$ spare $\implies$ **10 snaps total**.
- If layout requires 11 snaps $\implies \lceil 1.1 \rceil = 2$ spares $\implies$ **13 snaps total**.

### 7.4 Telemetry Metrics
The BOM summary tracks:
- Total Linear Raceway Length in millimeters ($\text{totalUnits} \times \text{pitchMm}$)
- Category breakdown: Power, Data/USB, Video/Display, Network/Ethernet, Neutral
- Itemized part list formatted for export to Markdown, CSV (RFC-4180), or JSON.

---

## 8. TypeScript API Quick Reference

```typescript
import {
  calculateBoardDimensions,
  generateTileMatrix,
  getLocalFootprint,
  getChannelFootprint,
  getChannelSnapPoints,
  canPlaceChannel,
  findCollisions,
  gridToWorld,
  worldToGrid,
  snapToGrid,
  generateBOM,
} from './src/lib/index.ts';

// 1. Board setup
const config = { cols: 6, rows: 3, tileWidthHoles: 8, tileHeightHoles: 8, holePitchMm: 25 };
const dims = calculateBoardDimensions(config); // 1200mm x 600mm, 48x24 holes

// 2. Channel placement validation
const newChannel = {
  id: 'chan-1',
  kind: 'straight' as const,
  length: 4,
  position: { x: 10, y: 5 },
  rotation: 90 as const,
  category: 'power' as const,
};

const validity = canPlaceChannel(newChannel, existingChannels, config);
if (validity.isValid) {
  // Safe to place!
}

// 3. Bill of Materials
const bom = generateBOM(boardState, 10);
console.log(`Total snaps to print: ${bom.summary.totalSnapCountWithSpares}`);
```
