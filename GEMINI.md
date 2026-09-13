# UnderPlan — Agent Guidelines & Repository Memory

This document defines core conventions, workflow rules, and guidelines for AI agents working in this repository.

---

## 1. Git Workflow & Repository Hygiene

- **Branch Cleanup**:
  - Keep the repository tidy. Do not leave stale, obsolete, or abandoned test/experimental branches in the repository.
  - When a feature branch is merged into `main` or abandoned, promptly delete both the local branch (`git branch -d <branch>`) and remote branch (`git push origin --delete <branch>`).
  - Periodically prune remote tracking branches with `git fetch -p`.
- **Active Branches**:
  - `main`: Stable production branch.
  - Feature branches (e.g. `ui-redesign`): Used for active development, merged cleanly into `main` once completed and verified.
- **Verification Gates**:
  - Always run `npm test` and `npm run build` before committing significant changes or merging into `main`.
  - Ensure all tests pass with zero regressions.

---

## 2. Project Architecture & Standards

- **Project**: UnderPlan — Multiboard & openGrid Cable Management Planner.
- **Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React.
- **Key Modules**:
  - `src/lib/geometry.ts`: Core CAD matrix, channel footprint algorithms, snapping, rotations, openGrid & Multiboard coordinate math.
  - `src/lib/bom.ts`: Parametric Bill of Materials generation, hardware counts, +10% spare logic, tile optimization.
  - `src/components/`: Modular UI (Header, ToolPalette, Canvas, InspectorPanel, BOMDrawer, SetupModal).
- **Testing**:
  - Node built-in test runner (`tests/*.test.ts`) executed via `npm test`.
  - Maintain rigorous coverage of all geometric rotations, snap scaling, collisions, and BOM calculations.
