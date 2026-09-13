# UnderPlan — Agent Guidelines & Repository Memory

This document defines core conventions, workflow rules, and guidelines for AI agents working in this repository.

---

## 1. Git Workflow & Repository Hygiene

- **Branching Instead of Folder Duplication**:
  - Always work in a dedicated git branch (`git checkout -b <branch-name>`).
  - **NEVER** duplicate or copy the entire repository directory. Leverage git's native branching model.
- **Logical Scoping & Action Categories**:
  - Group modifications logically: if the human user requests multiple changes belonging to the same category or scope of action, consolidate them into the same work-run and branch rather than fragmenting into scattered branches.
- **Handling Pending Work with Git Worktrees**:
  - If there are already uncommitted or pending modifications in the working tree and a separate/orthogonal task needs attention, use `git worktree` (`git worktree add <path> <branch>`) to create a cleanly isolated working environment within the same repository without copying directories or disrupting existing changes. Clean up worktrees (`git worktree remove`) once finished.
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

## 2. Documentation & Visual Assets Synchronization

- **Screenshot Synchronization**:
  - When making UI modifications (layout, components, colors, palettes, modals, or canvas styling), **always ensure visual screenshots are updated** to reflect the current state of the application.
  - Specifically, update the screenshots referenced in [`README.md`](README.md) and [`docs/screenshots/`](docs/screenshots/):
    - `01-overview.png`: Main canvas & UI overview
    - `02-channel-inspector.png`: Contextual inspector panel
    - `03-channel-palette.png`: Channel library and categories
    - `04-bom-modal.png`: Bill of Materials drawer / modal
  - Execute `npm run screenshots` (or the automated Puppeteer script `scripts/capture-screenshots.mjs`) to regenerate HiDPI screenshots whenever visual interfaces are updated. Never leave stale or outdated UI screenshots in the documentation!

---

## 3. Project Architecture & Standards

- **Project**: UnderPlan — Multiboard & openGrid Cable Management Planner.
- **Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React.
- **Key Modules**:
  - `src/lib/geometry.ts`: Core CAD matrix, channel footprint algorithms, snapping, rotations, openGrid & Multiboard coordinate math.
  - `src/lib/bom.ts`: Parametric Bill of Materials generation, hardware counts, +10% spare logic, tile optimization.
  - `src/components/`: Modular UI (Header, ToolPalette, Canvas, InspectorPanel, BOMDrawer, SetupModal, ChannelDropdown).
- **Testing**:
  - Node built-in test runner (`tests/*.test.ts`) executed via `npm test`.
  - Maintain rigorous coverage of all geometric rotations, snap scaling, collisions, and BOM calculations.
