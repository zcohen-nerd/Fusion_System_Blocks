# Changelog

All notable changes to the Fusion System Blocks project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-14

### Added
- **Shared Bridge Action Constants:**
  - `fsb_core/bridge_actions.py` – `BridgeAction` and `BridgeEvent` enums replacing all magic strings
  - `src/types/bridge-actions.js` – JavaScript mirror of Python bridge constants
  - Python ↔ JavaScript bridge communication now uses a single source of truth
- **Delta Serialization:**
  - `fsb_core/delta.py` – `compute_patch`, `apply_patch`, `is_trivial_patch` (JSON-Patch style)
  - `src/utils/delta-utils.js` – JS-side `DeltaUtils` (computePatch, applyPatch, deepClone)
  - `src/core/diagram-editor.js` – `markSaved()`, `getDelta()`, `hasUnsavedChanges()` for change tracking
  - `src/interface/python-bridge.js` – delta-first save with full-save fallback
  - `Fusion_System_Blocks.py` – `_handle_apply_delta` handler for incremental persistence
- **GitHub Actions CI Pipeline (`.github/workflows/ci.yml`):**
  - ruff check and ruff format on every push/PR
  - mypy type checking on `fsb_core/`
  - pytest on Python 3.9, 3.10, 3.11, and 3.12 with coverage
  - Codecov upload and test report integration
- **11-Format Export Pipeline with Profiles:**
  - Self-contained HTML report with embedded CSS (printable, shareable)
  - BOM export in CSV and JSON with cost roll-ups and supplier data
  - Assembly sequence in Markdown and JSON with dependency-ordered steps
  - Block × block connection adjacency matrix (CSV)
  - SVG diagram snapshot for design reviews and documentation
  - **Configurable export profiles: `quick` (3 files), `standard` (9 files), `full` (11 files, default)**
  - Entry-point handler accepts optional `profile` parameter from the bridge
- **Requirements & Verification Engine (Milestone 18 – Tasks 1 & 2):**
  - `fsb_core/models.py` – `ComparisonOperator` enum, `Requirement` dataclass with `check()` method, `Snapshot`, `ConnectionChange`, `DiffResult` dataclasses, `block_fingerprint()` helper
  - `Graph` dataclass now includes `requirements: list[Requirement]` field
  - `fsb_core/requirements.py` – `RequirementResult` dataclass, `aggregate_attribute()`, `validate_requirements()`
  - `fsb_core/serialization.py` – Requirements round-trip via `_requirement_to_dict` / `_parse_requirement`
- **Version Control & Diffing Engine (Milestone 18 – Task 3):**
  - `fsb_core/version_control.py` – `create_snapshot()`, `diff_graphs()`, `restore_snapshot()`, `SnapshotStore`
  - `tests/test_version_control.py` – 31 tests for snapshot creation, diffing, and restore
- **Fusion Adapter Integration (Milestone 18 – Task 4):**
  - `BridgeAction.VALIDATE_REQUIREMENTS` and snapshot bridge actions
  - Bridge handlers in `Fusion_System_Blocks.py`
  - JS mirror in `src/types/bridge-actions.js`
- **Frontend Requirements & History Tabs (Milestone 18 – Task 5):**
  - Requirements tab in palette with pass/fail table
  - History tab with snapshot list, create, and compare
  - Wired to bridge actions
- **Orthogonal Connection Routing (Issue #28):**
  - `src/core/orthogonal-router.js` – route-finding with obstacle avoidance
  - Manhattan-style orthogonal paths with waypoint editing
  - User-draggable waypoints for manual route adjustment
- **PDF Export (Issue #29):**
  - `generate_pdf_report()` in `src/diagram/export.py`
  - Block diagrams, connection tables, BOM summaries, and requirements results
  - Added to `full` export profile (now 11 files)
- **Canvas Minimap (Issue #27):**
  - `src/ui/minimap.js` – overview navigator for large diagrams
  - Real-time viewport indicator with click-to-navigate
- **Undo History Panel (Issue #30):**
  - Undo history panel with labeled operations
  - Click any entry to jump to that state
- **Connection Context Menu (Issue #32):**
  - Right-click connection to change type, direction, or delete
- **UI/UX Improvements (Issues #21–#26):**
  - Keyboard shortcut help dialog (?) (#21)
  - Block-to-block smart alignment snapping (#22)
  - Loading spinner for async operations (#23)
  - Crash recovery via periodic auto-backup (#24)
  - Accessibility: keyboard nav, screen reader, high-contrast (#25)
  - Schema versioning and migration (SCHEMA_VERSION = "1.0") (#26)
- **Block Shapes (Milestone 11.5):**
  - 8 professional shapes: rectangle, rounded, diamond, ellipse, hexagon, parallelogram, cylinder, triangle
  - Shape selector in block creation dialog and context menu
  - Shape-aware status halos and SVG rendering
- **New Tests (398 additional tests, total: 605 across 23 files):**
  - `test_delta.py` – Delta serialization compute/apply/trivial-patch tests
  - `test_adapter.py` – FusionAdapter translation layer
  - `test_cad.py` – CAD linking and component operations
  - `test_document.py` – DocumentManager operations
  - `test_selection.py` – SelectionHandler workflows
  - `test_integration.py` – Cross-module integration scenarios
  - `test_models.py` – Dataclass models and enum coverage
  - `test_property_based.py` – Hypothesis property-based / fuzz tests
  - `test_serialization.py` – Serialization round-trip and format conversion
  - `test_requirements.py` – Requirements engine: ComparisonOperator, Requirement, Snapshot, DiffResult, block_fingerprint, aggregate_attribute, validate_requirements, serialization round-trip (39 tests)
  - `test_version_control.py` – Version control: snapshot creation, graph diffing, restore, SnapshotStore (31 tests)
- **Block Interaction Features:**
  - Double-click inline rename with foreignObject HTML input
  - Right-click context menu with Type/Status submenus, Connect to, Delete, Add Block
  - Connection drawing mode (toolbar button, context menu, 'C' keyboard shortcut)
  - Connection port dots on block hover (input/output circles)
  - `addConnection()` / `removeConnection()` in diagram editor core
- **Two-Layer Architecture (Milestone 16):**
  - `fsb_core/` pure Python library with NO Fusion 360 dependencies
  - `fusion_addin/` adapter layer for Fusion 360 integration
- **Core Library Modules (`fsb_core/`):**
  - `models.py` – Block, Port, Connection, Graph dataclasses with enums; Requirement, Snapshot, DiffResult, block_fingerprint
  - `validation.py` – Graph validation with structured error codes
  - `action_plan.py` – Action plan builder for deferred Fusion operations
  - `graph_builder.py` – Fluent API for constructing graphs
  - `serialization.py` – JSON serialization with legacy format support and requirements round-trip
  - `bridge_actions.py` – BridgeAction / BridgeEvent enums (shared constants)
  - `delta.py` – compute_patch / apply_patch / is_trivial_patch
  - `requirements.py` – Requirements validation engine (aggregate_attribute, validate_requirements)
  - `version_control.py` – Snapshot creation, graph diffing, restore, SnapshotStore
- **Fusion Adapter Modules (`fusion_addin/`):**
  - `adapter.py` – FusionAdapter class for core ↔ Fusion translation
  - `selection.py` – SelectionHandler for Fusion selection workflows
  - `document.py` – DocumentManager for Fusion document operations
  - `logging_util.py` – Production logging with session IDs and environment info
  - `diagnostics.py` – DiagnosticsRunner with 32 self-test diagnostics
- **"Run Diagnostics" Command:**
  - UI command in Add-Ins panel for self-testing
  - Tests environment, core library, and Fusion write access
  - Shows pass/fail summary with log file location
- **Production Logging System:**
  - Logs to `~/FusionSystemBlocks/logs/systemblocks_<timestamp>_<session>.log`
  - Session ID grouping for each add-in run
  - `@log_exceptions` decorator for event handlers
  - Environment info logging (Fusion version, OS, Python version)

### Changed
- **Renamed `core/` → `fsb_core/`** to avoid namespace collisions with Python built-ins
- Hard-fail imports in `Fusion_System_Blocks.py` (removed `CORE_AVAILABLE` fallback pattern)
- `pyproject.toml` updated: `setuptools.packages.find` includes `fsb_core*`, ruff/mypy/coverage targets updated
- All CI tooling references updated for `fsb_core/` package name
- README and milestone documentation refreshed to reflect current architecture
- Deployment guide aligned with current two-layer architecture

### Fixed
- **Selection `.entity` unwrap:** `fusion_addin/selection.py` now correctly unwraps the `.entity` property from Fusion selection results
- **JSON type coercion:** `Fusion_System_Blocks.py` bridge handler now accepts both `str` and `dict` for incoming JSON data
- **Cycle detection path slicing:** `fsb_core/validation.py` fixed off-by-one in cycle path extraction for accurate error reporting

### Security
- Clarified licensing terms for commercial deployments and protected usage boundaries

## [1.0.0] - 2025-09-26

### Added
- Initial release of Fusion System Blocks
- Fusion 360-style ribbon interface
- Block-based system design capabilities
- Multi-selection and grouping features
- CAD integration and 3D visualization
- Python-HTML bridge for backend communication
- Comprehensive test suite
- Documentation and usage guides

### Features
- **Core Editing**: Block creation, deletion, and modification
- **Visual Rendering**: Professional diagram display with Fusion 360 styling
- **Toolbar Management**: Ribbon interface with File/Edit/Create/Select/Arrange groups
- **Advanced Features**: Multi-block selection, group operations, complex manipulations
- **Backend Integration**: Seamless Python-JavaScript communication
- **Testing**: Automated testing with pytest and comprehensive validation

### Technical
- Python 3.9+ backend
- Modern JavaScript frontend with modular architecture
- Fusion 360 Add-in compatibility
- Cross-platform support (Windows, macOS)