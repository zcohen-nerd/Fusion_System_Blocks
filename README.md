# Fusion System Blocks

Fusion System Blocks is a Fusion 360 add-in that embeds system block diagrams directly inside a CAD assembly. Diagrams, CAD components, and documentation stay in sync so designers can plan architecture, link components, and capture engineering intent without leaving Fusion 360.

[![License: Community](https://img.shields.io/badge/License-Community-blueviolet.svg)](LICENSE)
[![Fusion 360](https://img.shields.io/badge/Platform-Fusion%20360-orange.svg)](https://www.autodesk.com/products/fusion-360)
[![CI](https://github.com/zcohen-nerd/Fusion_System_Blocks/actions/workflows/ci.yml/badge.svg)](https://github.com/zcohen-nerd/Fusion_System_Blocks/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-518%20passing-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/Python-3.9%E2%80%933.12-blue.svg)]()

---

## Overview

The add-in delivers a full diagramming environment inside Fusion 360:

- Create electrical, mechanical, and software blocks with typed connections.
- Link blocks to Fusion 360 components and track status automatically.
- Maintain multi-level system hierarchies with drill-down navigation.
- Generate reports such as bills of materials and connection matrices.
- Save incremental diagram changes with delta serialization for fast persistence.
- Communicate between Python and JavaScript through shared bridge action constants.

The repository contains the full code base, tests, documentation, and deployment scripts. Source code is public for personal, academic, and non-commercial research use; commercial deployments require a paid license (see [Licensing](#licensing)).

---

## Current Status

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 | Diagram core & persistence | Complete |
| 2 | CAD/ECAD linking | Complete |
| 3 | Status tracking | Complete |
| 4 | Hierarchical navigation | Complete |
| 5 | Import/export | Complete |
| 6 | Rule checking engine | Complete |
| 7 | Search & navigation | Complete |
| 8 | Undo/redo & UI polish | Complete |
| 9 | Advanced connection system | Complete |
| 10 | Fusion 360 UI integration | Complete |
| 10.5 | UI/UX improvements | Partially complete |
| 11 | Advanced block types & templates | Complete |
| 12 | Enhanced CAD linking | Complete |
| 13 | 3D visualization & living documentation | Not started |
| 14 | Advanced diagram features | Complete |
| 15 | AI-powered assistant | Not started |
| 16 | Architecture refactoring & tooling | Complete |
| 17 | Analytics & reporting | Not started |

A detailed breakdown of remaining work lives in `tasks.md`.

---

## Feature Summary

### Diagramming
- Canvas with pan, zoom, and snap-to-grid controls.
- Block library spanning electrical, mechanical, and software domains.
- Typed connections with customizable arrow styles and annotations.
- Multi-selection, grouping, alignment, and automated layout tools.

### CAD Integration
- Link blocks to Fusion 360 occurrences with health monitoring.
- Synchronize component properties and track change history.
- Component health dashboards and thumbnail support.

### Reporting & Validation
- Save/load diagrams inside Fusion 360 document attributes.
- Delta serialization for incremental saves (JSON-Patch style diffs).
- **10-format export pipeline** with configurable profiles (quick / standard / full):
  - Markdown system report with rule-check results and block tables.
  - Self-contained HTML report styled for printing and sharing.
  - CSV pin map, C header with pin definitions.
  - BOM (Bill of Materials) in CSV and JSON with cost roll-ups.
  - Assembly sequence in Markdown and JSON with dependency ordering.
  - Block × block connection adjacency matrix (CSV).
  - SVG diagram snapshot for embedding in design reviews.
- Rule-checking engine for orphan detection, interface compatibility, and system status.
- Status dashboards with automatic progression based on linked data.

### Architecture & Reliability
- Two-layer Python architecture: pure `fsb_core/` library with no Fusion dependencies, plus a thin `fusion_addin/` adapter layer.
- Shared bridge action constants between Python (`BridgeAction`/`BridgeEvent` enums) and JavaScript.
- Production logging with session IDs, environment info, and `@log_exceptions` decorator.
- Built-in "Run Diagnostics" command with 6 self-tests.
- 518 automated tests across 21 test files; CI runs on Python 3.9–3.12.

### User Experience
- Fusion 360-style ribbon interface with responsive layout.
- Professional icon set and theming aligned with Fusion UI guidelines.
- Notification system, tooltips, and accessibility improvements.

---

## Repository Structure

```text
Fusion_System_Blocks/
├── Fusion_System_Blocks.py        # Fusion 360 entry point and command definitions
├── Fusion_System_Blocks.manifest  # Add-in manifest (version, author, ID)
├── fsb_core/                      # Pure Python core library (NO Fusion dependencies)
│   ├── models.py                  #   Block, Port, Connection, Graph dataclasses
│   ├── validation.py              #   Graph validation with structured error codes
│   ├── action_plan.py             #   Action plan builder for deferred operations
│   ├── graph_builder.py           #   Fluent API for constructing graphs
│   ├── serialization.py           #   JSON serialization with legacy format support
│   ├── bridge_actions.py          #   BridgeAction / BridgeEvent shared enums
│   └── delta.py                   #   compute_patch / apply_patch (JSON-Patch style)
├── fusion_addin/                  # Fusion 360 adapter layer
│   ├── adapter.py                 #   FusionAdapter (core ↔ Fusion translation)
│   ├── selection.py               #   SelectionHandler for Fusion selection workflows
│   ├── document.py                #   DocumentManager for Fusion document operations
│   ├── logging_util.py            #   Production logging with session IDs
│   └── diagnostics.py             #   DiagnosticsRunner with 6 self-tests
├── src/                           # JavaScript frontend + Python data layer
│   ├── diagram_data.py            #   Validation, rule checks, export logic
│   ├── palette.html               #   Main HTML palette UI
│   ├── main-coordinator.js        #   Application bootstrap
│   ├── core/diagram-editor.js     #   CRUD, canvas, delta tracking
│   ├── ui/                        #   Renderer, toolbar, palette tabs
│   ├── interface/python-bridge.js #   Python ↔ JS bridge (uses shared constants)
│   ├── features/advanced-features.js
│   ├── types/                     #   Block type libraries + bridge-actions.js
│   │   └── bridge-actions.js      #   JS mirror of Python bridge constants
│   ├── utils/
│   │   ├── logger.js
│   │   └── delta-utils.js         #   JS delta utilities (computePatch, applyPatch)
│   └── *.css                      #   Fusion theme, ribbon, and icon styles
├── tests/                         # 518 pytest tests across 21 files
├── docs/                          # Architecture decisions, test plans, milestones
├── scripts/                       # PowerShell build and deployment automation
├── fusion_system_blocks/          # Packaged add-in folder for distribution
└── exports/                       # Distribution ZIPs
```

---

## Installation

### Prerequisites

- **Fusion 360** (latest version recommended) on Windows 10/11 or macOS.
- **Python 3.9+** is bundled with Fusion 360; no separate install is required for running the add-in.
- For local development and testing, install Python 3.9–3.12 and create a virtual environment.

### Quick Install (End User)

1. Download the latest release ZIP from the [Releases page](https://github.com/zcohen-nerd/Fusion_System_Blocks/releases).
2. Extract the ZIP to your Downloads folder.
3. In Fusion 360, go to **Utilities → ADD-INS** (or press <kbd>Shift</kbd>+<kbd>S</kbd>).
4. In the **Add-Ins** tab, click the **+** button and browse to the extracted folder.
5. Select **Fusion System Blocks** and click **Run**, or check **Run on Startup**.

### Manual Install (Developer)

1. Clone the repository:

   ```bash
   git clone https://github.com/zcohen-nerd/Fusion_System_Blocks.git
   ```

2. Copy (or symlink) the folder into your Fusion 360 Add-ins directory:

   ```text
   Windows: %APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\
   macOS:   ~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/
   ```

3. Launch Fusion 360, open **Utilities → Add-Ins**, select the add-in, and click **Run**.

### Development Environment

```bash
# Create a virtual environment
python -m venv .venv

# Activate it
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install in editable mode with dev dependencies
pip install -e ".[dev]"
```

See `FUSION_DEPLOYMENT_GUIDE.md` for packaging instructions and troubleshooting tips.

---

## Usage

### Getting Started

1. Open Fusion 360 and activate the Fusion System Blocks add-in.
2. The block diagram palette appears in the right panel with a ribbon interface.
3. Use the **Create** ribbon group to add blocks (electrical, mechanical, or software).
4. Connect blocks by selecting a source block and pressing <kbd>C</kbd>, then clicking the target.
5. Double-click any block to rename it inline.

### Core Workflows

| Workflow | How |
| --- | --- |
| **Save diagram** | **File → Save** in the ribbon. Data persists inside the Fusion document as attributes. |
| **Load diagram** | **File → Load** to restore a previously saved diagram. |
| **Link to CAD** | Select a block, click **Link to CAD**, then select a component in the viewport. |
| **Run rule checks** | Click **Check Rules** to validate orphan blocks, interface compatibility, and more. |
| **Export report** | **File → Export Report** generates up to 10 files in the `exports/` folder (profile-dependent). |
| **Run diagnostics** | In the Add-Ins panel, click **Run Diagnostics** to verify add-in health (6 self-tests). |
| **Navigate hierarchy** | Use **Drill Down** / **Go Up** buttons to move through nested sub-diagrams. |

### Delta Saves

The add-in tracks diagram changes in memory. When you save, only the changed portions (a JSON-Patch style delta) are sent to the backend, reducing serialization overhead. If the delta path fails, a full save is used as a fallback automatically.

### Export Profiles

The **Export Report** command supports three output profiles:

| Profile | Files produced |
| --- | --- |
| **quick** | Markdown report, CSV pin map, C header (3 files) |
| **standard** | Quick + HTML report, BOM (CSV & JSON), assembly sequence (Markdown & JSON), connection matrix (9 files) |
| **full** (default) | Standard + SVG diagram snapshot (10 files) |

All files are written to the `exports/` folder. The profile can be passed programmatically via the bridge; the ribbon button uses the **full** profile by default.

---

## Testing

### Automated Tests (pytest)

The test suite covers the core library, diagram data logic, adapter stubs, and property-based scenarios.

```bash
# Run all 518 tests
pytest

# Run with coverage report
pytest --cov=fsb_core --cov-report=term-missing

# Run a specific test file
pytest tests/test_delta.py -v
```

**Test files (21 total):**

| File | Scope |
| --- | --- |
| `test_adapter.py` | FusionAdapter translation layer |
| `test_cad.py` | CAD linking and component operations |
| `test_core_action_plan.py` | Action plan builder |
| `test_core_validation.py` | Graph validation and error codes |
| `test_delta.py` | Delta serialization (compute/apply patch) |
| `test_diagram_data.py` | Core diagram operations |
| `test_document.py` | DocumentManager operations |
| `test_export_reports.py` | JSON/CSV/HTML export |
| `test_graph_builder.py` | Fluent graph construction API |
| `test_hierarchy.py` | Multi-level diagram nesting |
| `test_import.py` | Import and conflict resolution |
| `test_integration.py` | Cross-module integration |
| `test_logging_util.py` | Production logging and decorators |
| `test_models.py` | Dataclass models and enums |
| `test_property_based.py` | Hypothesis property-based tests |
| `test_rule_checks.py` | Validation rules (orphans, power, interfaces) |
| `test_schema.py` | JSON schema compliance |
| `test_selection.py` | SelectionHandler workflows |
| `test_serialization.py` | Serialization round-trips |
| `test_status_tracking.py` | Block status lifecycle |
| `test_validation.py` | Diagram-level validation |

### Continuous Integration

GitHub Actions runs on every push and pull request against `main`:

- **Lint:** `ruff check` and `ruff format --check`
- **Type check:** `mypy fsb_core/`
- **Tests:** `pytest` on Python 3.9, 3.10, 3.11, and 3.12 with coverage

### Manual Testing in Fusion 360

Use `docs/FUSION_MANUAL_TEST_PLAN.md` for a 30-minute verification run inside Fusion 360 (37 manual test steps across 8 phases). For comprehensive step-by-step procedures, see `docs/DETAILED_TESTING_DOCUMENTATION.md`.

---

## Licensing

- Source code and assets are available for **personal, academic, and non-commercial research use** under the Fusion System Blocks Community License (see `LICENSE`).
- **Commercial use** requires a paid license. Open an issue in this repository to discuss pricing and terms.

---

## Contributing

1. Review open items in `tasks.md` and existing issues.
2. Fork the repository and create a feature branch.
3. Add or update tests where applicable.
4. Run `ruff check .` and `pytest` before submitting.
5. Submit a pull request with a clear description of changes and test evidence.

Contributors focused on documentation can help expand user guides, add screenshots, or improve deployment instructions.

---

## Additional Resources

- `docs/MILESTONES.md` – Snapshot of milestone progress and outstanding work.
- `docs/ux/` – UX research artifacts: JTBD, journey map, and proposed palette redesign flow.
- `docs/architecture/` – Architecture Decision Records (ADRs) and review report.
- `FUSION_DEPLOYMENT_GUIDE.md` – Deployment and packaging instructions.
- `PROJECT_FOLDER_STRUCTURE_BLUEPRINT.md` – Detailed directory analysis and conventions.

---

## Acknowledgements

Fusion System Blocks builds on Autodesk Fusion 360’s API and the work of contributors who validated each milestone. Feedback and testing from educators and engineers helped shape the current feature set.