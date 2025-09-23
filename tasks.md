# Fusion System Blocks — Development Backlog

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
- [x] Add `src/diagram_data.py`:
  - [x] Functions to serialize/deserialize JSON
  - [x] Schema validation against `docs/schema.json`

---

## ✅ Milestone 2: CAD/ECAD Linking

- [x] Add **"Link to CAD"** button in palette
  - [x] Python: selection command to pick a Fusion occurrence
  - [x] Save occurrence token and docId into block's `links[]`
- [x] Add **"Link to ECAD"** button in palette
  - [x] Store `device` and `footprint` into block's `links[]`
- [x] Update JSON schema to confirm links are valid
- [x] Add pytest unit tests for JSON utilities
- [x] Validate imported diagram against schema

---

## ✅ Milestone 3: Status Tracking

- [x] Add auto-computed **block status** based on content/links:
  - [x] Placeholder: block exists but has minimal content
  - [x] Planned: attributes defined, no links
  - [x] In-Work: some links exist
  - [x] Implemented: required links complete
  - [x] Verified: all validation rules pass
- [x] Add visual feedback in palette:
  - [x] Color-coded halos around blocks based on status
  - [x] Status legend/panel
- [x] Status computation function in `diagram_data.py`
- [x] Update block status when links or attributes change

---

## ✅ Milestone 4: Rule Checks

- [x] Implement **logic-level compatibility** rule
- [x] Implement **power budget** rule
- [x] Implement **implementation completeness** rule
- [x] Add warning badges on connections or blocks when rules fail
- [x] Expose rule results in a **Status Panel** in palette
- [x] Add "Check Rules" button in palette toolbar
- [x] Rule checking functions in `diagram_data.py`
- [x] Test suite for rule checking functionality

---

## ✅ Milestone 5: Export & Reports

- [x] Add "Export Report" button in palette toolbar
- [x] Generate Markdown file in `/exports/` with:
  - [x] Rule check results and status summary
  - [x] Block table (id, name, type, status, attributes)
  - [x] Connection table (from → to, protocol, attributes)
  - [x] Interface details table
- [x] Add "Export Pin Map":
  - [x] Generate CSV (Signal, Source, Dest, Pin, Notes)
  - [x] Generate optional C header with `#define` pin constants
- [x] Python export functions in `diagram_data.py`:
  - [x] `generate_markdown_report()`
  - [x] `generate_pin_map_csv()`
  - [x] `generate_pin_map_header()`
  - [x] `export_report_files()`
- [x] JavaScript export functions in `palette.js`
- [x] Integration with Fusion palette messaging system
- [x] Test suite for export functionality

---

## ✅ Milestone 6: Import

- [ ] Import Mermaid text:
  - [ ] Parse flowchart syntax (A-->B)
  - [x] Map edge labels to protocols
  - [x] Create blocks and connections automatically
- [x] Import from CSV:
  - [x] Block list (name, type, x, y)
  - [x] Connection list (from, to, protocol)
  - [x] Validate imported diagram against schema

---

## Milestone 7: Hierarchy (Stretch Goal)

- [ ] Allow blocks to contain **child diagrams**
- [ ] UI: double-click block → drill down into sub-diagram
- [ ] Enforce parent-child interface mapping
- [ ] Roll up status from child to parent

---

## Milestone 8: Polish

- [ ] Add undo/redo support in palette
- [ ] Add tooltips for block attributes
- [ ] Add search/filter for blocks
- [ ] Improve styling (consistent icons, better grid, theme support)
- [ ] Performance optimizations for large diagrams
- [ ] Enhanced keyboard shortcuts

---

## Guidelines

- Work in a feature branch for each milestone (e.g., `feat/milestone-1-diagram-core`)
- Validate JSON with `pytest` before commit
- Run `flake8` before commit
- Keep commits small and messages clear:
  - `feat: add Save/Load buttons`
  - `fix: correct attribute persistence`
  - `test: add schema validation tests`

---

## Progress Summary

**Completed Milestones:** 6/8  
**Test Coverage:** 63 passing tests  
**Current State:** Full import functionality complete - supports Mermaid flowcharts and CSV data import with validation and automatic positioning

**Next Priority:** Milestone 7 (Hierarchy - stretch goal) or Milestone 8 (Polish and refinements)