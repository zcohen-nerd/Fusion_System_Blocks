# Fusion System Blocks — Deve## ✅ Milestone 2: CAD/ECAD Linking
- [x] Add **"Link to CAD"** button in palette
  - [x] Python: selection command to pick a Fusion occurrence
  - [x] Save occurrence token and docId into block's `links[]`
- [x] Add **"Link to ECAD"** button in palette
  - [x] Store `device` and `footprint` into block's `links[]`
- [ ] Update JSON schema to confirm links are valid
- [x] Visual feedback in palette: show small icon/badge on linked blocksBacklog

This file defines the step-by-step backlog for building the add-in.  
Each task should be completed in its own **feature branch** with a clear commit history.  
Keep commits **small and incremental** (one feature or fix at a time).

---

## ✅ Milestone 1: Diagram Core + Persistence
- [x] Implement basic **node editor** in `palette.html` / `palette.js`
  - [x] SVG or Canvas-based blocks
  - [x] Pan/zoom
  - [x] Snap-to-grid
  - [x] Draggable blocks with named ports
- [x] Add **New / Save / Load** buttons in the palette
  - [x] `New`: clears in-memory diagram
  - [x] `Save`: sends diagram JSON → Python
  - [x] `Load`: requests diagram JSON ← Python
- [x] In `main.py`:
  - [x] Implement palette ↔ Python messaging
  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)
  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`
- [x] Add `src/json_utils.py`:
  - [x] Functions to serialize/deserialize JSON
  - [x] Schema validation against `docs/schema.json`
- [x] Add pytest unit tests for JSON utilities

---

## ✅ Milestone 2: CAD/ECAD Linking
- [ ] Add **“Link to CAD”** button in palette
  - [ ] Python: selection command to pick a Fusion occurrence
  - [ ] Save occurrence token and docId into block’s `links[]`
- [ ] Add **“Link to ECAD”** button in palette
  - [ ] Store `device` and `footprint` into block’s `links[]`
- [ ] Update JSON schema to confirm links are valid
- [ ] Visual feedback in palette: show small icon/badge on linked blocks

---

## ✅ Milestone 3: Status Tracking
- [ ] Implement block `status` enum:
  - Placeholder → Planned → In-Work → Implemented → Verified
- [ ] Auto-compute `status`:
  - [ ] Placeholder = block exists but empty
  - [ ] Planned = attributes defined, no links
  - [ ] In-Work = some links exist
  - [ ] Implemented = required links complete
  - [ ] Verified = rule checks pass
- [ ] Visual feedback in palette:
  - [ ] Color halos or borders per status
  - [ ] Legend in UI

---

## ✅ Milestone 4: Rule Checks
- [ ] Implement **logic-level compatibility** rule
- [ ] Implement **power budget** rule
- [ ] Implement **implementation completeness** rule
- [ ] Add warning badges on connections or blocks when rules fail
- [ ] Expose rule results in a **Status Panel** in palette

---

## ✅ Milestone 5: Export & Reports
- [ ] Add “Export Report” button
- [ ] Generate Markdown file in `/exports/` with:
  - [ ] Embedded PNG of diagram
  - [ ] Block table (id, name, type, status, attributes)
  - [ ] Connection table (from → to, protocol, attributes)
- [ ] Add “Export Pin Map”:
  - [ ] Generate CSV (Signal, Source, Dest, Pin, Notes)
  - [ ] Generate optional C header with `#define` pin constants

---

## ✅ Milestone 6: Import
- [ ] Import Mermaid text:
  - [ ] Parse flowchart syntax (A-->B)
  - [ ] Map edge labels to protocols
- [ ] Import draw.io XML (subset):
  - [ ] Rectangles → blocks
  - [ ] Connectors → connections
- [ ] Validate imported diagram against schema

---

## ✅ Milestone 7: Hierarchy (Stretch Goal)
- [ ] Allow blocks to contain **child diagrams**
- [ ] UI: double-click block → drill down into sub-diagram
- [ ] Enforce parent-child interface mapping
- [ ] Roll up status from child to parent

---

## ✅ Milestone 8: Polish
- [ ] Add undo/redo support in palette
- [ ] Add tooltips for block attributes
- [ ] Add search/filter for blocks
- [ ] Improve styling (consistent icons, better grid, theme support)

---

## Guidelines
- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)
- Validate JSON with `pytest` before commit
- Run `flake8` before commit
- Keep commits small and messages clear:
  - `feat: add Save/Load buttons`
  - `fix: correct attribute persistence`
  - `test: add schema validation tests`
