# Fusion System Blocks — Development Backlog# Fusion System Blocks — Deve## ✅ Milestone 2: CAD/ECAD Linking

- [x] Add **"Link to CAD"** button in palette

This file defines the step-by-step backlog for building the add-in.    - [x] Python: selection command to pick a Fusion occurrence

Each task should be completed in its own **feature branch** with a clear commit history.    - [x] Save occurrence token and docId into block's `links[]`

Keep commits **small and incremental** (one feature or fix at a time).- [x] Add **"Link to ECAD"** button in palette

  - [x] Store `device` and `footprint` into block's `links[]`

---- [ ] Update JSON schema to confirm links are valid

- [x] Visual feedback in palette: show small icon/badge on linked blocksBacklog

## ✅ Milestone 1: Diagram Core + Persistence

- [x] Implement basic **node editor** in `palette.html` / `palette.js`This file defines the step-by-step backlog for building the add-in.  

  - [x] SVG or Canvas-based blocksEach task should be completed in its own **feature branch** with a clear commit history.  

  - [x] Pan/zoomKeep commits **small and incremental** (one feature or fix at a time).

  - [x] Snap-to-grid

  - [x] Draggable blocks with named ports---

- [x] Add **New / Save / Load** buttons in the palette

  - [x] `New`: clears in-memory diagram## ✅ Milestone 1: Diagram Core + Persistence

  - [x] `Save`: sends diagram JSON → Python- [x] Implement basic **node editor** in `palette.html` / `palette.js`

  - [x] `Load`: requests diagram JSON ← Python  - [x] SVG or Canvas-based blocks

- [x] In `main.py`:  - [x] Pan/zoom

  - [x] Implement palette ↔ Python messaging  - [x] Snap-to-grid

  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)  - [x] Draggable blocks with named ports

  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`- [x] Add **New / Save / Load** buttons in the palette

- [x] Add `src/diagram_data.py`:  - [x] `New`: clears in-memory diagram

  - [x] Functions to serialize/deserialize JSON  - [x] `Save`: sends diagram JSON → Python

  - [x] Schema validation against `docs/schema.json`  - [x] `Load`: requests diagram JSON ← Python

- [x] Add pytest unit tests for JSON utilities- [x] In `main.py`:

  - [x] Implement palette ↔ Python messaging

---  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)

  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`

## ✅ Milestone 2: CAD/ECAD Linking- [x] Add `src/json_utils.py`:

- [x] Add **"Link to CAD"** button in palette  - [x] Functions to serialize/deserialize JSON

  - [x] Python: selection command to pick a Fusion occurrence  - [x] Schema validation against `docs/schema.json`

  - [x] Save occurrence token and docId into block's `links[]`- [x] Add pytest unit tests for JSON utilities

- [x] Add **"Link to ECAD"** button in palette

  - [x] Store `device` and `footprint` into block's `links[]`---

- [x] Update JSON schema to confirm links are valid

- [x] Visual feedback in palette: show small icon/badge on linked blocks## ✅ Milestone 2: CAD/ECAD Linking

- [ ] Add **“Link to CAD”** button in palette

---  - [ ] Python: selection command to pick a Fusion occurrence

  - [ ] Save occurrence token and docId into block’s `links[]`

## Milestone 3: Status Tracking- [ ] Add **“Link to ECAD”** button in palette

- [ ] Implement block `status` enum:  - [ ] Store `device` and `footprint` into block’s `links[]`

  - Placeholder → Planned → In-Work → Implemented → Verified- [ ] Update JSON schema to confirm links are valid

- [ ] Auto-compute `status`:- [ ] Visual feedback in palette: show small icon/badge on linked blocks

  - [ ] Placeholder = block exists but empty

  - [ ] Planned = attributes defined, no links---

  - [ ] In-Work = some links exist

  - [ ] Implemented = required links complete## ✅ Milestone 3: Status Tracking

  - [ ] Verified = rule checks pass- [ ] Implement block `status` enum:

- [ ] Visual feedback in palette:  - Placeholder → Planned → In-Work → Implemented → Verified

  - [ ] Color halos or borders per status- [ ] Auto-compute `status`:

  - [ ] Legend in UI  - [ ] Placeholder = block exists but empty

  - [ ] Planned = attributes defined, no links

---  - [ ] In-Work = some links exist

  - [ ] Implemented = required links complete

## Milestone 4: Rule Checks  - [ ] Verified = rule checks pass

- [ ] Implement **logic-level compatibility** rule- [ ] Visual feedback in palette:

- [ ] Implement **power budget** rule  - [ ] Color halos or borders per status

- [ ] Implement **implementation completeness** rule  - [ ] Legend in UI

- [ ] Add warning badges on connections or blocks when rules fail

- [ ] Expose rule results in a **Status Panel** in palette---



---## ✅ Milestone 4: Rule Checks

- [ ] Implement **logic-level compatibility** rule

## Milestone 5: Export & Reports- [ ] Implement **power budget** rule

- [ ] Add "Export Report" button- [ ] Implement **implementation completeness** rule

- [ ] Generate Markdown file in `/exports/` with:- [ ] Add warning badges on connections or blocks when rules fail

  - [ ] Embedded PNG of diagram- [ ] Expose rule results in a **Status Panel** in palette

  - [ ] Block table (id, name, type, status, attributes)

  - [ ] Connection table (from → to, protocol, attributes)---

- [ ] Add "Export Pin Map":

  - [ ] Generate CSV (Signal, Source, Dest, Pin, Notes)## ✅ Milestone 5: Export & Reports

  - [ ] Generate optional C header with `#define` pin constants- [ ] Add “Export Report” button

- [ ] Generate Markdown file in `/exports/` with:

---  - [ ] Embedded PNG of diagram

  - [ ] Block table (id, name, type, status, attributes)

## Milestone 6: Import  - [ ] Connection table (from → to, protocol, attributes)

- [ ] Import Mermaid text:- [ ] Add “Export Pin Map”:

  - [ ] Parse flowchart syntax (A-->B)  - [ ] Generate CSV (Signal, Source, Dest, Pin, Notes)

  - [ ] Map edge labels to protocols  - [ ] Generate optional C header with `#define` pin constants

- [ ] Import draw.io XML (subset):

  - [ ] Rectangles → blocks---

  - [ ] Connectors → connections

- [ ] Validate imported diagram against schema## ✅ Milestone 6: Import

- [ ] Import Mermaid text:

---  - [ ] Parse flowchart syntax (A-->B)

  - [ ] Map edge labels to protocols

## Milestone 7: Hierarchy (Stretch Goal)- [ ] Import draw.io XML (subset):

- [ ] Allow blocks to contain **child diagrams**  - [ ] Rectangles → blocks

- [ ] UI: double-click block → drill down into sub-diagram  - [ ] Connectors → connections

- [ ] Enforce parent-child interface mapping- [ ] Validate imported diagram against schema

- [ ] Roll up status from child to parent

---

---

## ✅ Milestone 7: Hierarchy (Stretch Goal)

## Milestone 8: Polish- [ ] Allow blocks to contain **child diagrams**

- [ ] Add undo/redo support in palette- [ ] UI: double-click block → drill down into sub-diagram

- [ ] Add tooltips for block attributes- [ ] Enforce parent-child interface mapping

- [ ] Add search/filter for blocks- [ ] Roll up status from child to parent

- [ ] Improve styling (consistent icons, better grid, theme support)

---

---

## ✅ Milestone 8: Polish

## Guidelines- [ ] Add undo/redo support in palette

- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)- [ ] Add tooltips for block attributes

- Validate JSON with `pytest` before commit- [ ] Add search/filter for blocks

- Run `flake8` before commit- [ ] Improve styling (consistent icons, better grid, theme support)

- Keep commits small and messages clear:

  - `feat: add Save/Load buttons`---

  - `fix: correct attribute persistence`

  - `test: add schema validation tests`## Guidelines
- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)
- Validate JSON with `pytest` before commit
- Run `flake8` before commit
- Keep commits small and messages clear:
  - `feat: add Save/Load buttons`
  - `fix: correct attribute persistence`
  - `test: add schema validation tests`
