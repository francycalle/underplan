# Underplan — Iteration Notes: Mounting + Parametric Planning

## Iteration Overview
This iteration evolves Underplan from a rudimentary channel-laying canvas into a high-fidelity parametric planning tool reflecting the real Multiboard and Underware maker ecosystem.

---

## Key Achievements & Implementation Highlights

1. **Mounting System Library:**
   - Introduced the `MountingType` architecture separating Underware mounts (Threaded Snap, Direct Screw), Multiboard mounts (Multiconnect, Standard Snap, Multipoint), and Surface mounts (Wood Screw, Adhesive, Magnetic).
   - Fully modeled `threaded_snap`, `direct_screw`, and `multiconnect` into the functional canvas and BOM engine.
   - Preserved planning-only options with honest "Prossimamente" badges without generating fake BOM hardware counts.

2. **Parametric Sizing & Multiboard Units (MU):**
   - Standardized all UI dimensions to Multiboard Units ($1\text{ MU} = 25\text{ mm}$), with secondary metric measurements.
   - Parametric I-Channel (1–16 MU length, 1–2 MU width, 1–2 MU height).
   - Parametric L-Channel (2×2, 3×3, 4×4 arm span).
   - Parametric T-Junction (custom trunk span and branch span).

3. **Contextual Mount Point Editing:**
   - Dedicated "Mount Edit Mode" locking movement and enlarging attachment point click targets on the active channel.
   - Visual distinction between placed mounts (green/cyan filled circles) and candidate mounting points (dashed gray circles).
   - Direct click-to-add / click-to-remove with automated fallback.

4. **"Measure & Create Channel" Tool (Key M):**
   - Direct two-point selection on the Multiboard octagon grid.
   - Real-time span calculation, alignment detection, and dynamic channel proposal card.
   - Instant conversion from measurement to placed, validated channel.

5. **Expanded BOM Engine:**
   - Categorized Bill of Materials:
     - `UNDERWARE CHANNELS`
     - `SISTEMI DI FISSAGGIO (MOUNTING)`
     - `MULTIBOARD TILES`
   - Itemized "BOM Details" showing the mounting requirement source per channel.
   - Visible prototype disclaimer across panels and export artifacts.

---

## Known Assumptions & Limitations
- **Visual Pitch Model:** 1 MU is treated as an idealized 25.0 mm square pitch without simulating filament shrinkage, printer elephant foot, or seam tolerances.
- **Corner Routing:** Diagonal point selection suggests right-angle L-channel or multi-segment routing, as true 45° diagonal Underware raceways are non-standard.
- **STL Generation:** This tool produces visual layouts, placement coordinates, and BOM tallies, leaving slicing and 3D printing preparation to the official slicer.
