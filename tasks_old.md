# Fusion System Blocks — Development Backlog# Fusion System Blocks — Development Backlog# Fusion System Blocks — Development Backlog# Fusion System Blocks — Deve## ✅ Milestone 2: CAD/ECAD Linking



This file defines the step-by-step backlog for building the add-in.  

Each task should be completed in its own **feature branch** with a clear commit history.  

Keep commits **small and incremental** (one feature or fix at a time).This file defines the step-by-step backlog for building the add-in.  - [x] Add **"Link to CAD"** button in palette



---Each task should be completed in its own **feature branch** with a clear commit history.  



## ✅ Milestone 1: Diagram Core + PersistenceKeep commits **small and incremental** (one feature or fix at a time).This file defines the step-by-step backlog for building the add-in.    - [x] Python: selection command to pick a Fusion occurrence

- [x] Implement basic **node editor** in `palette.html` / `palette.js`

  - [x] SVG or Canvas-based blocks

  - [x] Pan/zoom

  - [x] Snap-to-grid---Each task should be completed in its own **feature branch** with a clear commit history.    - [x] Save occurrence token and docId into block's `links[]`

  - [x] Draggable blocks with named ports

- [x] Add **New / Save / Load** buttons in the palette

  - [x] `New`: clears in-memory diagram

  - [x] `Save`: sends diagram JSON → Python## ✅ Milestone 1: Diagram Core + PersistenceKeep commits **small and incremental** (one feature or fix at a time).- [x] Add **"Link to ECAD"** button in palette

  - [x] `Load`: requests diagram JSON ← Python

- [x] In `main.py`:- [x] Implement basic **node editor** in `palette.html` / `palette.js`

  - [x] Implement palette ↔ Python messaging

  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)  - [x] SVG or Canvas-based blocks  - [x] Store `device` and `footprint` into block's `links[]`

  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`

- [x] Add `src/diagram_data.py`:  - [x] Pan/zoom

  - [x] Functions to serialize/deserialize JSON

  - [x] Schema validation against `docs/schema.json`  - [x] Snap-to-grid---- [ ] Update JSON schema to confirm links are valid

- [x] Add pytest unit tests for JSON utilities

  - [x] Draggable blocks with named ports

---

- [x] Add **New / Save / Load** buttons in the palette- [x] Visual feedback in palette: show small icon/badge on linked blocksBacklog

## ✅ Milestone 2: CAD/ECAD Linking

- [x] Add **"Link to CAD"** button in palette  - [x] `New`: clears in-memory diagram

  - [x] Python: selection command to pick a Fusion occurrence

  - [x] Save occurrence token and docId into block's `links[]`  - [x] `Save`: sends diagram JSON → Python## ✅ Milestone 1: Diagram Core + Persistence

- [x] Add **"Link to ECAD"** button in palette

  - [x] Store `device` and `footprint` into block's `links[]`  - [x] `Load`: requests diagram JSON ← Python

- [x] Update JSON schema to confirm links are valid

- [x] Visual feedback in palette: show small icon/badge on linked blocks- [x] In `main.py`:- [x] Implement basic **node editor** in `palette.html` / `palette.js`This file defines the step-by-step backlog for building the add-in.  



---  - [x] Implement palette ↔ Python messaging



## ✅ Milestone 3: Status Tracking  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)  - [x] SVG or Canvas-based blocksEach task should be completed in its own **feature branch** with a clear commit history.  

- [x] Implement block `status` enum:

  - Placeholder → Planned → In-Work → Implemented → Verified  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`

- [x] Auto-compute `status`:

  - [x] Placeholder = block exists but empty- [x] Add `src/diagram_data.py`:  - [x] Pan/zoomKeep commits **small and incremental** (one feature or fix at a time).

  - [x] Planned = attributes defined, no links

  - [x] In-Work = some links exist  - [x] Functions to serialize/deserialize JSON

  - [x] Implemented = required links complete

  - [x] Verified = rule checks pass  - [x] Schema validation against `docs/schema.json`  - [x] Snap-to-grid

- [x] Visual feedback in palette:

  - [x] Color halos or borders per status- [x] Add pytest unit tests for JSON utilities

  - [x] Legend in UI

  - [x] Draggable blocks with named ports---

---

---

## ✅ Milestone 4: Rule Checks

- [x] Implement **logic-level compatibility** rule- [x] Add **New / Save / Load** buttons in the palette

- [x] Implement **power budget** rule

- [x] Implement **implementation completeness** rule## ✅ Milestone 2: CAD/ECAD Linking

- [x] Add warning badges on connections or blocks when rules fail

- [x] Expose rule results in a **Status Panel** in palette- [x] Add **"Link to CAD"** button in palette  - [x] `New`: clears in-memory diagram## ✅ Milestone 1: Diagram Core + Persistence



---  - [x] Python: selection command to pick a Fusion occurrence



## Milestone 5: Export & Reports  - [x] Save occurrence token and docId into block's `links[]`  - [x] `Save`: sends diagram JSON → Python- [x] Implement basic **node editor** in `palette.html` / `palette.js`

- [ ] Add "Export Report" button

- [ ] Generate Markdown file in `/exports/` with:- [x] Add **"Link to ECAD"** button in palette

  - [ ] Embedded PNG of diagram

  - [ ] Block table (id, name, type, status, attributes)  - [x] Store `device` and `footprint` into block's `links[]`  - [x] `Load`: requests diagram JSON ← Python  - [x] SVG or Canvas-based blocks

  - [ ] Connection table (from → to, protocol, attributes)

- [ ] Add "Export Pin Map":- [x] Update JSON schema to confirm links are valid

  - [ ] Generate CSV (Signal, Source, Dest, Pin, Notes)

  - [ ] Generate optional C header with `#define` pin constants- [x] Visual feedback in palette: show small icon/badge on linked blocks- [x] In `main.py`:  - [x] Pan/zoom



---



## Milestone 6: Import---  - [x] Implement palette ↔ Python messaging  - [x] Snap-to-grid

- [ ] Import Mermaid text:

  - [ ] Parse flowchart syntax (A-->B)

  - [ ] Map edge labels to protocols

- [ ] Import draw.io XML (subset):## ✅ Milestone 3: Status Tracking  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)  - [x] Draggable blocks with named ports

  - [ ] Rectangles → blocks

  - [ ] Connectors → connections- [x] Implement block `status` enum:

- [ ] Validate imported diagram against schema

  - Placeholder → Planned → In-Work → Implemented → Verified  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`- [x] Add **New / Save / Load** buttons in the palette

---

- [x] Auto-compute `status`:

## Milestone 7: Hierarchy (Stretch Goal)

- [ ] Allow blocks to contain **child diagrams**  - [x] Placeholder = block exists but empty- [x] Add `src/diagram_data.py`:  - [x] `New`: clears in-memory diagram

- [ ] UI: double-click block → drill down into sub-diagram

- [ ] Enforce parent-child interface mapping  - [x] Planned = attributes defined, no links

- [ ] Roll up status from child to parent

  - [x] In-Work = some links exist  - [x] Functions to serialize/deserialize JSON  - [x] `Save`: sends diagram JSON → Python

---

  - [x] Implemented = required links complete

## Milestone 8: Polish

- [ ] Add undo/redo support in palette  - [x] Verified = rule checks pass  - [x] Schema validation against `docs/schema.json`  - [x] `Load`: requests diagram JSON ← Python

- [ ] Add tooltips for block attributes

- [ ] Add search/filter for blocks- [x] Visual feedback in palette:

- [ ] Improve styling (consistent icons, better grid, theme support)

  - [x] Color halos or borders per status- [x] Add pytest unit tests for JSON utilities- [x] In `main.py`:

---

  - [x] Legend in UI

## Guidelines

- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)  - [x] Implement palette ↔ Python messaging

- Validate JSON with `pytest` before commit

- Run `flake8` before commit---

- Keep commits small and messages clear:

  - `feat: add Save/Load buttons`---  - [x] Store JSON in `adsk.core.Attributes` (group: `systemBlocks`, name: `diagramJson`)

  - `fix: correct attribute persistence`

  - `test: add schema validation tests`## Milestone 4: Rule Checks

- [ ] Implement **logic-level compatibility** rule  - [x] Provide helper functions `save_diagram_json()` and `load_diagram_json()`

- [ ] Implement **power budget** rule

- [ ] Implement **implementation completeness** rule## ✅ Milestone 2: CAD/ECAD Linking- [x] Add `src/json_utils.py`:

- [ ] Add warning badges on connections or blocks when rules fail

- [ ] Expose rule results in a **Status Panel** in palette- [x] Add **"Link to CAD"** button in palette  - [x] Functions to serialize/deserialize JSON



---  - [x] Python: selection command to pick a Fusion occurrence  - [x] Schema validation against `docs/schema.json`



## Milestone 5: Export & Reports  - [x] Save occurrence token and docId into block's `links[]`- [x] Add pytest unit tests for JSON utilities

- [ ] Add "Export Report" button

- [ ] Generate Markdown file in `/exports/` with:- [x] Add **"Link to ECAD"** button in palette

  - [ ] Embedded PNG of diagram

  - [ ] Block table (id, name, type, status, attributes)  - [x] Store `device` and `footprint` into block's `links[]`---

  - [ ] Connection table (from → to, protocol, attributes)

- [ ] Add "Export Pin Map":- [x] Update JSON schema to confirm links are valid

  - [ ] Generate CSV (Signal, Source, Dest, Pin, Notes)

  - [ ] Generate optional C header with `#define` pin constants- [x] Visual feedback in palette: show small icon/badge on linked blocks## ✅ Milestone 2: CAD/ECAD Linking



---- [ ] Add **“Link to CAD”** button in palette



## Milestone 6: Import---  - [ ] Python: selection command to pick a Fusion occurrence

- [ ] Import Mermaid text:

  - [ ] Parse flowchart syntax (A-->B)  - [ ] Save occurrence token and docId into block’s `links[]`

  - [ ] Map edge labels to protocols

- [ ] Import draw.io XML (subset):## Milestone 3: Status Tracking- [ ] Add **“Link to ECAD”** button in palette

  - [ ] Rectangles → blocks

  - [ ] Connectors → connections- [ ] Implement block `status` enum:  - [ ] Store `device` and `footprint` into block’s `links[]`

- [ ] Validate imported diagram against schema

  - Placeholder → Planned → In-Work → Implemented → Verified- [ ] Update JSON schema to confirm links are valid

---

- [ ] Auto-compute `status`:- [ ] Visual feedback in palette: show small icon/badge on linked blocks

## Milestone 7: Hierarchy (Stretch Goal)

- [ ] Allow blocks to contain **child diagrams**  - [ ] Placeholder = block exists but empty

- [ ] UI: double-click block → drill down into sub-diagram

- [ ] Enforce parent-child interface mapping  - [ ] Planned = attributes defined, no links---

- [ ] Roll up status from child to parent

  - [ ] In-Work = some links exist

---

  - [ ] Implemented = required links complete## ✅ Milestone 3: Status Tracking

## Milestone 8: Polish

- [ ] Add undo/redo support in palette  - [ ] Verified = rule checks pass- [ ] Implement block `status` enum:

- [ ] Add tooltips for block attributes

- [ ] Add search/filter for blocks- [ ] Visual feedback in palette:  - Placeholder → Planned → In-Work → Implemented → Verified

- [ ] Improve styling (consistent icons, better grid, theme support)

  - [ ] Color halos or borders per status- [ ] Auto-compute `status`:

---

  - [ ] Legend in UI  - [ ] Placeholder = block exists but empty

## Guidelines

- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)  - [ ] Planned = attributes defined, no links

- Validate JSON with `pytest` before commit

- Run `flake8` before commit---  - [ ] In-Work = some links exist

- Keep commits small and messages clear:

  - `feat: add Save/Load buttons`  - [ ] Implemented = required links complete

  - `fix: correct attribute persistence`

  - `test: add schema validation tests`## Milestone 4: Rule Checks  - [ ] Verified = rule checks pass

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
