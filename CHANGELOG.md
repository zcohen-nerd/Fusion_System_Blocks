# Changelog

All notable changes to the Fusion System Blocks project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **10-Format Export Pipeline with Profiles:**
  - Self-contained HTML report with embedded CSS (printable, shareable)
  - BOM export in CSV and JSON with cost roll-ups and supplier data
  - Assembly sequence in Markdown and JSON with dependency-ordered steps
  - Block × block connection adjacency matrix (CSV)
  - SVG diagram snapshot for design reviews and documentation
  - Configurable export profiles: `quick` (3 files), `standard` (9 files), `full` (10 files, default)
  - Entry-point handler accepts optional `profile` parameter from the bridge
- **New Tests (311 additional tests, total: 518 across 21 files):****
  - `test_delta.py` – Delta serialization compute/apply/trivial-patch tests
  - `test_adapter.py` – FusionAdapter translation layer
  - `test_cad.py` – CAD linking and component operations
  - `test_document.py` – DocumentManager operations
  - `test_selection.py` – SelectionHandler workflows
  - `test_integration.py` – Cross-module integration scenarios
  - `test_models.py` – Dataclass models and enum coverage
  - `test_property_based.py` – Hypothesis property-based / fuzz tests
  - `test_serialization.py` – Serialization round-trip and format conversion
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
  - `models.py` – Block, Port, Connection, Graph dataclasses with enums
  - `validation.py` – Graph validation with structured error codes (ValidationError)
  - `action_plan.py` – Action plan builder for deferred Fusion operations
  - `graph_builder.py` – Fluent API for constructing graphs
  - `serialization.py` – JSON serialization with legacy format support
  - `bridge_actions.py` – BridgeAction / BridgeEvent enums (shared constants)
  - `delta.py` – compute_patch / apply_patch / is_trivial_patch
- **Fusion Adapter Modules (`fusion_addin/`):**
  - `adapter.py` – FusionAdapter class for core ↔ Fusion translation
  - `selection.py` – SelectionHandler for Fusion selection workflows
  - `document.py` – DocumentManager for Fusion document operations
  - `logging_util.py` – Production logging with session IDs and environment info
  - `diagnostics.py` – DiagnosticsRunner with 6 self-test diagnostics
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