# Project Folder Structure Blueprint
**Fusion System Blocks - Fusion 360 Add-in**

**Generated:** December 22, 2025  
**Project Type:** Python/JavaScript Hybrid (Fusion 360 Add-in)  
**Architecture:** Two-Layer Backend (Core + Adapter) + Modular Frontend  
**Last Structure Update:** February 2026

---

## 1. Structural Overview

### Project Identity
This is a **Python-based Fusion 360 add-in** with a **JavaScript/HTML5 frontend** embedded as a palette UI. The project follows a **hybrid architecture**:
- Python backend handles Fusion 360 API integration, persistence, validation, and business logic
- Modular JavaScript frontend provides interactive diagram editing with a tabbed, task-oriented UI
- Communication via an HTMLEvent bridge between Python and JavaScript

### Organizational Principles
1. **Separation by Technology Layer**: Python (backend) vs. JavaScript (frontend) kept distinct
2. **Two-Layer Python Architecture**: Pure Python core library (`fsb_core/`) + Fusion adapter layer (`fusion_addin/`)
3. **Feature-Based Frontend Modules**: UI code organized by responsibility (core, ui, features, interface, utils)
4. **Testable Core Logic**: Core library has NO Fusion dependencies, enabling pytest outside Fusion 360
5. **Documentation Co-location**: Architecture decisions, UX research, and design notes live in `docs/`
6. **Test Mirroring**: Test files mirror the structure of `src/` and `fsb_core/` with `test_*.py` naming

### Architectural Approach
- **Core Library (`fsb_core/`)**: Pure Python business logic with dataclasses, validation, and action planning. NO `adsk` imports—fully testable with pytest.
- **Fusion Adapter (`fusion_addin/`)**: Thin wrappers that translate between core library and Fusion 360 API. Includes logging, diagnostics, selection, and document operations.
- **Entry Point**: `Fusion_System_Blocks.py` acts as the Fusion 360 entry point, orchestrating core library and adapter modules.
- **Frontend**: Modular JavaScript with clear boundaries (editor core, rendering, UI management, Python bridge, advanced features)
- **Persistence**: Diagram data stored as JSON in Fusion 360 document attributes; no external database
- **Bridge Pattern**: Python ↔ JavaScript communication via `adsk.fusionSendData()` and global window functions

---

## 2. Directory Visualization (Depth 3)

```
Fusion_System_Blocks/
├── .git/                          # Version control (Git repository)
├── .github/                       # GitHub-specific assets
│   ├── agents/                    # AI coding agent definitions
│   ├── instructions/              # Copilot custom instructions (code review, security, Python/Markdown)
│   ├── prompts/                   # Reusable prompt templates (folder structure, refactoring, UX)
│   └── workflows/                 # GitHub Actions CI/CD definitions
│       └── ci.yml                 # Lint (ruff), type-check (mypy), test (pytest 3.9–3.12)
├── .gitignore                     # Git ignore patterns (__pycache__, .venv, .pytest_cache, etc.)
├── .venv/                         # Python virtual environment (excluded from source control)
├── .vscode/                       # VS Code workspace settings
├── assets/                        # Static assets for documentation (screenshots, diagrams)
│   └── README.md                  # Asset organization guide
├── CHANGELOG.md                   # Version history and release notes
├── copilot-instructions.md        # High-level Copilot guidance for the project
├── fsb_core/                      # Pure Python core library (NO Fusion dependencies)
│   ├── __init__.py                # Package exports for all core modules
│   ├── models.py                  # Dataclasses: Block, Port, Connection, Graph, Requirement, Snapshot, DiffResult, enums
│   ├── validation.py              # Graph validation with structured error codes
│   ├── action_plan.py             # Action plan builder for deferred Fusion operations
│   ├── graph_builder.py           # Fluent API for constructing graphs
│   ├── serialization.py           # JSON serialization with legacy format support and requirements round-trip
│   ├── bridge_actions.py          # BridgeAction / BridgeEvent shared enums
│   ├── delta.py                   # compute_patch / apply_patch / is_trivial_patch
│   └── requirements.py            # Requirements validation engine (aggregate, validate)
├── docs/                          # Project documentation
│   ├── architecture/              # Architecture decision records (ADRs) and review reports
│   ├── ux/                        # UX research (JTBD, journey maps, flows)
│   ├── DETAILED_TESTING_DOCUMENTATION.md # Comprehensive testing guide
│   ├── FUSION_MANUAL_TEST_PLAN.md # Quick manual test checklist
│   ├── MILESTONES.md              # Development milestone tracking
│   └── schema.json                # JSON schema for diagram data validation
├── exports/                       # Build artifacts (distribution ZIPs)
│   └── Fusion_System_Blocks_v1.0_Beta.zip
├── fusion_addin/                  # Fusion 360 adapter layer (bridges core and Fusion API)
│   ├── __init__.py                # Package exports with lazy imports
│   ├── adapter.py                 # FusionAdapter class for core ↔ Fusion translation
│   ├── selection.py               # SelectionHandler for Fusion selection workflows
│   ├── document.py                # DocumentManager for Fusion document operations
│   ├── logging_util.py            # Production logging with session IDs, decorators
│   └── diagnostics.py             # DiagnosticsRunner with self-test suite
├── FUSION_DEPLOYMENT_GUIDE.md     # Deployment instructions for Fusion 360
├── fusion_system_blocks/          # Packaged add-in folder (for distribution)
│   ├── __init__.py                # Package initializer
│   ├── main.py                    # Thin wrapper delegating to root Fusion_System_Blocks.py
│   └── core/
│       └── diagram_data.py        # Wrapper re-exporting src/diagram_data.py
├── Fusion_System_Blocks.manifest  # Fusion 360 add-in manifest (JSON)
├── Fusion_System_Blocks.py        # Primary Python entry point for Fusion 360
├── LICENSE                        # Software license (Community/Commercial dual-license)
├── README.md                      # Project overview and quickstart
├── scripts/                       # Build and deployment scripts
│   ├── cleanup_obsolete.ps1       # Remove legacy files and caches
│   ├── create_beta_release.ps1    # Package beta releases
│   ├── create_distribution_package.ps1 # Create distribution ZIP for Fusion 360
│   ├── deploy_simple.ps1          # Deploy to local Fusion 360 for testing
│   └── update_public_readme.ps1   # Sync README to public version
├── src/                           # Source code (Python backend + JavaScript frontend)
│   ├── core/                      # Core diagram editing logic (JavaScript)
│   │   └── diagram-editor.js      # Diagram operations (add/remove blocks, pan, zoom, snap-to-grid)
│   ├── features/                  # Advanced features (JavaScript)
│   │   └── advanced-features.js   # Block templates, type management, multi-block operations
│   ├── interface/                 # Backend communication (JavaScript)
│   │   └── python-bridge.js       # Python ↔ JavaScript bridge (sendMessage, handlers, notifications)
│   ├── ui/                        # UI components (JavaScript)
│   │   ├── diagram-renderer.js    # SVG rendering, visual updates, drag-and-drop
│   │   ├── palette-tabs.js        # Tab controller for task-first UI (Home, Diagram, Linking, Validation, Reports)
│   │   └── toolbar-manager.js     # Toolbar state management and button wiring
│   ├── types/                     # Block type definitions (JavaScript)
│   │   ├── block-templates.js     # Predefined system templates
│   │   ├── bridge-actions.js      # JS mirror of Python BridgeAction/BridgeEvent constants
│   │   ├── electrical-blocks.js   # Electrical component types
│   │   ├── mechanical-blocks.js   # Mechanical component types
│   │   └── software-blocks.js     # Software module types
│   ├── utils/                     # Utilities (JavaScript)
│   │   ├── logger.js              # Logging framework for debugging
│   │   └── delta-utils.js         # Delta utilities (computePatch, applyPatch, deepClone)
│   ├── diagram_data.py            # Core business logic: validation, rule checks, exports (Python)
│   ├── fusion-icons.css           # Icon styles for UI
│   ├── fusion-ribbon.css          # Ribbon-style toolbar CSS
│   ├── fusion-theme.css           # Fusion 360-themed CSS variables
│   ├── main-coordinator.js        # Application bootstrap and module coordination
│   ├── palette.html               # Main HTML palette UI (entry point for frontend)
│   └── palette.js                 # Palette initialization and legacy orchestration
├── tasks.md                       # Project task list and TODOs
├── tests/                         # Automated tests (pytest) - 557 tests across 22 files
│   ├── test_adapter.py            # Tests for fusion_addin/adapter.py
│   ├── test_cad.py                # Tests for CAD linking and component operations
│   ├── test_core_action_plan.py   # Tests for fsb_core/action_plan.py
│   ├── test_core_validation.py    # Tests for fsb_core/validation.py
│   ├── test_delta.py              # Tests for fsb_core/delta.py (compute/apply patch)
│   ├── test_diagram_data.py       # Tests for diagram_data.py core logic
│   ├── test_document.py           # Tests for fusion_addin/document.py
│   ├── test_export_reports.py     # Tests for export functionality
│   ├── test_graph_builder.py      # Tests for fsb_core/graph_builder.py
│   ├── test_hierarchy.py          # Tests for hierarchical diagrams
│   ├── test_import.py             # Tests for import operations
│   ├── test_integration.py        # Cross-module integration tests
│   ├── test_logging_util.py       # Tests for production logging
│   ├── test_models.py             # Tests for fsb_core/models.py dataclasses
│   ├── test_property_based.py     # Hypothesis property-based / fuzz tests
│   ├── test_requirements.py       # Tests for fsb_core/requirements.py (requirements engine)
│   ├── test_rule_checks.py        # Tests for validation rules
│   ├── test_schema.py             # Tests for JSON schema validation
│   ├── test_selection.py          # Tests for fusion_addin/selection.py
│   ├── test_serialization.py      # Tests for serialization round-trips
│   ├── test_status_tracking.py    # Tests for block status tracking
│   └── test_validation.py         # Tests for diagram validation
└── __pycache__/                   # Python compiled bytecode (excluded from source control)
```

---

## 3. Key Directory Analysis

### Root Level: Fusion 360 Entry Point
- **`Fusion_System_Blocks.py`**: The primary Python file Fusion 360 loads when the add-in starts. Contains:
  - Event handlers (`CommandExecuteHandler`, `PaletteHTMLEventHandler`)
  - Palette creation and registration
  - Python ↔ JavaScript bridge handlers
  - Delegates business logic to `src/diagram_data.py`
- **`Fusion_System_Blocks.manifest`**: Fusion 360 add-in metadata (ID, version, author, description)
- **`LICENSE`**: Dual-license (Community for non-commercial, Commercial for business use)
- **`README.md`**: Project overview, installation, and usage instructions

### `.github/`: GitHub and AI Tooling Configuration
- **`agents/`**: AI agent definitions for specialized tasks (architecture review, UX design, code review)
- **`instructions/`**: Copilot custom instructions enforcing coding standards (Python PEP 8/257, Markdown, security/OWASP)
- **`prompts/`**: Reusable prompt templates for common development workflows (folder structure analysis, refactoring, UX design)
- **`workflows/`**: GitHub Actions CI/CD pipelines (lint, type-check, test)

### `fusion_system_blocks/`: Distribution Package
- **Purpose**: A clean, importable package structure for distribution that mirrors the root-level code
- **`main.py`**: Thin wrapper that imports and delegates to `Fusion_System_Blocks.py`
- **`core/diagram_data.py`**: Re-exports `src/diagram_data.py` to maintain import compatibility
- **Usage**: When packaged as a ZIP, Fusion 360 loads this folder structure

### `src/`: Source Code (Hybrid Python/JavaScript)
The source directory contains both Python business logic and JavaScript frontend modules.

#### Python Backend
- **`diagram_data.py`**: Core business logic module containing:
  - Diagram validation (`validate_diagram`, `validate_diagram_links`)
  - Rule checking (`check_rules`, `check_power_continuity`, `check_orphaned_blocks`)
  - Export functionality (`export_json`, `export_csv`, `export_html`)
  - Hierarchical diagram support
  - Status tracking and metadata management

#### JavaScript Frontend: Modular Architecture
- **`core/`**: Fundamental diagram operations
  - `diagram-editor.js`: CRUD operations for blocks/connections, canvas management (pan, zoom, viewBox), grid snapping, selection
- **`ui/`**: User interface components
  - `diagram-renderer.js`: SVG rendering, visual updates, drag-and-drop, connection drawing
  - `toolbar-manager.js`: Toolbar button state management and event wiring
  - `palette-tabs.js`: Tab controller for task-first UI (Home, Diagram, Linking, Validation, Reports) with accessibility
- **`interface/`**: Backend communication
  - `python-bridge.js`: Bidirectional communication layer between JavaScript and Python via `adsk.fusionSendData()` and global callbacks
- **`features/`**: Advanced functionality
  - `advanced-features.js`: Block templates, type libraries (electrical, mechanical, software), multi-block operations
- **`utils/`**: Shared utilities
  - `logger.js`: Centralized logging for debugging and error tracking

#### Frontend Entry Point and Coordination
- **`palette.html`**: Main HTML file loaded by Fusion 360 palette; includes all CSS/JS modules and defines the tabbed UI structure
- **`palette.js`**: Legacy orchestration script (being phased out; functionality moved to modular files)
- **`main-coordinator.js`**: Application bootstrap that initializes modules and wires event handlers

#### Styles
- **`fusion-theme.css`**: CSS variables matching Fusion 360's dark theme (colors, spacing, shadows, transitions)
- **`fusion-ribbon.css`**: Ribbon-style toolbar layout and button styles
- **`fusion-icons.css`**: Icon definitions for UI elements

#### Block Type Definitions
- **`types/`**: Block type libraries organized by domain
  - `electrical-blocks.js`: Electrical component type library (resistors, capacitors, microcontrollers, power supplies)
  - `mechanical-blocks.js`: Mechanical component type library (motors, gears, actuators, bearings)
  - `software-blocks.js`: Software module type library (firmware, drivers, algorithms, databases)
  - `block-templates.js`: Predefined templates for common systems (motor controllers, power supplies, sensors)

### `docs/`: Project Documentation
- **`architecture/`**: Architecture decision records (ADRs) and system review reports
  - `ADR-001-monolithic-backend.md`: Decision to use monolithic Python backend
  - `ADR-002-attribute-persistence.md`: Decision to store data in Fusion attributes
  - `ADR-003-html-bridge.md`: Decision on Python ↔ JavaScript bridge architecture
  - `REVIEW_REPORT.md`: Comprehensive architecture analysis and recommendations
- **`ux/`**: UX research and design artifacts
  - `palette-ux-jtbd.md`: Jobs-to-be-Done analysis
  - `palette-ux-journey.md`: User journey maps
  - `palette-ux-flow.md`: Task flows and accessibility checklist
- **`DETAILED_TESTING_DOCUMENTATION.md`**: Comprehensive testing guide
- **`FUSION_MANUAL_TEST_PLAN.md`**: Quick manual test checklist for Fusion 360 validation
- **`MILESTONES.md`**: Development milestone tracking
- **`schema.json`**: JSON schema defining the structure of diagram data for validation

### `tests/`: Automated Test Suite
- **Test Organization**: Tests mirror the structure of `src/` and `fsb_core/` with `test_*.py` naming
- **Framework**: pytest with fixtures for diagram creation and validation
- **Count**: 557 tests across 22 files
- **Coverage**:
  - `test_adapter.py`: FusionAdapter translation layer
  - `test_cad.py`: CAD linking and component operations
  - `test_core_action_plan.py`: Action plan builder
  - `test_core_validation.py`: Graph validation and error codes
  - `test_delta.py`: Delta serialization (compute/apply/trivial patch)
  - `test_diagram_data.py`: Core diagram operations and validation
  - `test_document.py`: DocumentManager operations
  - `test_export_reports.py`: 10-format export pipeline (HTML, BOM CSV/JSON, assembly sequence MD/JSON, connection matrix, SVG, profiles)
  - `test_graph_builder.py`: Fluent graph construction API
  - `test_hierarchy.py`: Multi-level diagram nesting and navigation
  - `test_import.py`: Import operations from external sources
  - `test_integration.py`: Cross-module integration scenarios
  - `test_logging_util.py`: Production logging and `@log_exceptions` decorator
  - `test_models.py`: Dataclass models and enum coverage
  - `test_property_based.py`: Hypothesis property-based / fuzz tests
  - `test_requirements.py`: Requirements engine (ComparisonOperator, Requirement, aggregate_attribute, validate_requirements, serialization round-trip)
  - `test_rule_checks.py`: Validation rules (power continuity, orphaned blocks, interface compatibility)
  - `test_schema.py`: JSON schema compliance
  - `test_selection.py`: SelectionHandler workflows
  - `test_serialization.py`: Serialization round-trips and format conversion
  - `test_status_tracking.py`: Block status lifecycle (Placeholder → Planned → In-Work → Implemented → Verified)
  - `test_validation.py`: Diagram-level validation (required fields, link integrity)

### `scripts/`: Build and Deployment Automation
- **`cleanup_obsolete.ps1`**: Removes legacy files, demo HTML, caches, and old docs
- **`create_beta_release.ps1`**: Packages beta releases with version tagging
- **`create_distribution_package.ps1`**: Creates ZIP distribution for Fusion 360 installation
- **`deploy_simple.ps1`**: Copies add-in to local Fusion 360 add-ins directory for testing
- **`update_public_readme.ps1`**: Syncs README to a public-facing version (strips internal notes)

### Build Artifacts
- **`exports/`**: Contains distribution ZIPs (e.g., `Fusion_System_Blocks_v1.0_Beta.zip`)
- **`.venv/`**: Python virtual environment (excluded from source control via `.gitignore`)
- **`__pycache__/`**: Compiled Python bytecode (excluded from source control)

---

## 4. File Placement Patterns

### Configuration Files
- **Fusion 360 Manifest**: `Fusion_System_Blocks.manifest` (root level, required by Fusion 360)
- **JSON Schema**: `docs/schema.json` (co-located with documentation)
- **Git Configuration**: `.gitignore` (root level, standard location)
- **VS Code Settings**: `.vscode/` (root level, workspace-specific configuration)
- **Python Environment**: `.venv/` (root level, isolated dependency management)

### Python Code
- **Entry Point**: `Fusion_System_Blocks.py` (root level, loaded by Fusion 360)
- **Business Logic**: `src/diagram_data.py` (shared module for validation, exports, rule checks)
- **Package Wrappers**: `fusion_system_blocks/main.py` and `fusion_system_blocks/core/diagram_data.py` (delegation to root and src)

### JavaScript Code
- **Modular Organization**: `src/` with subdirectories by responsibility:
  - `core/` for fundamental operations
  - `ui/` for visual components
  - `interface/` for backend communication
  - `features/` for advanced functionality
  - `utils/` for shared utilities
- **Entry Point**: `src/palette.html` (loaded by Fusion 360 palette)
- **Coordination**: `src/main-coordinator.js` (module initialization and orchestration)

### CSS Styles
- **Location**: `src/*.css` (co-located with HTML/JS for frontend)
- **Organization**: Separate files for theme, icons, and ribbon layout

### Block Type Definitions
- **Location**: `src/*-blocks.js` (domain-specific type libraries)
- **Templates**: `src/block-templates.js` (predefined system configurations)

### Tests
- **Location**: `tests/test_*.py` (root-level `tests/` directory)
- **Naming**: `test_{module_name}.py` mirrors `src/{module_name}.py`
- **Test Data**: Inline fixtures within test files (no separate test data directory)

### Documentation
- **Project Docs**: `docs/` with subdirectories for `architecture/` and `ux/`
- **Root-Level Docs**: High-level guides (README, CHANGELOG, LICENSE) at root
- **Meta Docs**: Development-focused docs (tasks.md) at root, testing docs in `docs/`

### Build and Deployment
- **Scripts**: PowerShell `.ps1` files at root level
- **Artifacts**: `exports/` for distribution ZIPs
- **Temporary**: `__pycache__/`, `.pytest_cache/` (excluded from source control)

---

## 5. Naming and Organization Conventions

### File Naming Patterns

#### Python Files
- **Case**: `snake_case.py` (PEP 8 standard)
- **Entry Point**: `Fusion_System_Blocks.py` (PascalCase with underscores, matching add-in name)
- **Modules**: `diagram_data.py` (descriptive, snake_case)
- **Tests**: `test_{module_name}.py` (pytest convention)

#### JavaScript Files
- **Case**: `kebab-case.js` (common for web frontend)
- **Modules**: `{responsibility}-{component}.js` (e.g., `diagram-editor.js`, `python-bridge.js`)
- **Type Libraries**: `{domain}-blocks.js` (e.g., `electrical-blocks.js`)
- **Templates**: `block-templates.js` (descriptive noun)

#### CSS Files
- **Case**: `kebab-case.css`
- **Purpose-Based**: `fusion-theme.css`, `fusion-ribbon.css`, `fusion-icons.css`

#### HTML Files
- **Case**: `kebab-case.html`
- **Entry Point**: `palette.html` (main UI file)

#### Documentation Files
- **Case**: `SCREAMING_SNAKE_CASE.md` for meta docs (README, CHANGELOG, LICENSE)
- **Case**: `kebab-case.md` for technical docs in subdirectories (e.g., `ADR-001-monolithic-backend.md`)

### Folder Naming Patterns
- **Python Packages**: `snake_case/` (e.g., `fusion_system_blocks/`)
- **JavaScript Modules**: `kebab-case/` (e.g., `src/core/`, `src/ui/`)
- **Documentation**: Descriptive nouns (e.g., `docs/architecture/`, `docs/ux/`)
- **Hidden Folders**: `.prefix` for tooling (e.g., `.github/`, `.vscode/`, `.venv/`)

### Namespace/Module Patterns

#### Python
- **Imports**: `import diagram_data` (absolute from `src/`, added to `sys.path`)
- **Package Imports**: `from fusion_system_blocks.core import diagram_data` (package structure for distribution)
- **Type Hints**: All public functions annotated with types (`Optional`, `Dict`, `List`, etc.)

#### JavaScript
- **No Modules**: Uses global `window` object for cross-file communication
- **Initialization**: Each module attaches to `window` (e.g., `window.diagramEditor`, `window.pythonInterface`)
- **Script Order**: Controlled by `<script>` tag order in `palette.html`

### Organizational Patterns

#### Code Co-location
- **Related Functionality**: JavaScript modules grouped by responsibility (core, ui, features, interface, utils)
- **Styles**: CSS files co-located with HTML/JS in `src/`
- **Tests**: Separate `tests/` directory mirroring `src/` structure

#### Feature Encapsulation
- **Block Types**: Domain-specific type libraries (`electrical-blocks.js`, `mechanical-blocks.js`, `software-blocks.js`)
- **UI Components**: Self-contained modules in `src/ui/` (renderer, toolbar, tabs)

#### Cross-Cutting Concerns
- **Logging**: Centralized in `src/utils/logger.js`
- **Bridge Communication**: Isolated in `src/interface/python-bridge.js`
- **Validation**: Centralized in `src/diagram_data.py`

---

## 6. Navigation and Development Workflow

### Entry Points

#### For Understanding the Project
1. **`README.md`**: Project overview, features, installation, and usage
2. **`docs/MILESTONES.md`**: Development roadmap and progress
3. **`docs/architecture/`**: Architecture decisions and review

#### For Code Exploration
1. **Python Backend**: `Fusion_System_Blocks.py` → `src/diagram_data.py`
2. **JavaScript Frontend**: `src/palette.html` → `src/main-coordinator.js` → individual modules
3. **Architecture**: `docs/architecture/REVIEW_REPORT.md`

#### For Configuration
1. **Fusion 360 Manifest**: `Fusion_System_Blocks.manifest`
2. **Diagram Schema**: `docs/schema.json`
3. **VS Code Settings**: `.vscode/settings.json`

### Common Development Tasks

#### Adding a New Feature
1. **Backend Logic**: Add functions to `src/diagram_data.py`
2. **Frontend UI**: Create new module in appropriate `src/` subdirectory (core, ui, features)
3. **Bridge Communication**: Update `src/interface/python-bridge.js` if Python ↔ JavaScript communication required
4. **Tests**: Add `tests/test_{feature}.py` with pytest fixtures
5. **Documentation**: Update relevant ADRs in `docs/architecture/`

#### Adding a New Block Type
1. Add type definition to `src/electrical-blocks.js`, `src/mechanical-blocks.js`, or `src/software-blocks.js`
2. Update type registry in `src/features/advanced-features.js`
3. Add template to `src/block-templates.js` if applicable
4. Update schema in `docs/schema.json` if new fields required

#### Modifying UI Layout
1. Edit structure in `src/palette.html`
2. Update styles in `src/fusion-theme.css`, `src/fusion-ribbon.css`, or `src/fusion-icons.css`
3. Wire interactions in relevant module (e.g., `src/ui/palette-tabs.js` for tabs, `src/ui/toolbar-manager.js` for buttons)

#### Adding Tests
1. Create `tests/test_{module}.py`
2. Import module from `src/` (pytest automatically adds project root to path)
3. Use pytest fixtures for common setup (e.g., `create_test_diagram()`)
4. Run with `python -m pytest tests/test_{module}.py`

#### Updating Configuration
- **Fusion 360 Manifest**: Edit `Fusion_System_Blocks.manifest` (version, description)
- **Schema**: Edit `docs/schema.json` (diagram data structure)
- **Python Dependencies**: Update `.venv/` with `pip install {package}`

### Dependency Patterns

#### Python Dependencies
- **Backend → Core Logic**: `Fusion_System_Blocks.py` imports `diagram_data` from `src/`
- **Package → Core**: `fusion_system_blocks/core/diagram_data.py` re-exports `src/diagram_data.py`
- **Tests → Source**: Tests import directly from `src/` (added to `sys.path` by pytest)

#### JavaScript Dependencies
- **Global Scope**: All modules attach to `window` object
- **Initialization Order**: Controlled by `<script>` tag order in `palette.html`:
  1. `utils/logger.js` (no dependencies)
  2. `core/diagram-editor.js` (uses logger)
  3. `ui/diagram-renderer.js` (uses editor)
  4. `ui/toolbar-manager.js` (uses editor and renderer)
  5. `features/advanced-features.js` (uses editor and renderer)
  6. `interface/python-bridge.js` (uses editor and logger)
  7. `ui/palette-tabs.js` (uses bridge and editor)
  8. `main-coordinator.js` (orchestrates all modules)
  9. `palette.js` (legacy, being phased out)

#### Python ↔ JavaScript Bridge
- **Python → JavaScript**: `palette.sendInfoToHTML(action, data)` → JavaScript global functions (e.g., `window.loadDiagramFromPython()`)
- **JavaScript → Python**: `window.pythonInterface.sendMessage(action, data)` → `adsk.fusionSendData()` → Python `PaletteHTMLEventHandler`

---

## 7. Build and Output Organization

### Build Configuration

#### Distribution Package Creation
- **Script**: `create_distribution_package.ps1`
- **Process**:
  1. Copy essential files to temporary directory
  2. Exclude tests, docs, development scripts, `.venv`, `__pycache__`
  3. Create ZIP archive in `exports/`
  4. Name format: `Fusion_System_Blocks_v{version}_{stage}.zip`

#### Beta Release Creation
- **Script**: `create_beta_release.ps1`
- **Process**:
  1. Increment version number
  2. Update `CHANGELOG.md`
  3. Create distribution package
  4. Tag Git commit with version

#### Deployment to Fusion 360
- **Script**: `deploy_simple.ps1`
- **Process**:
  1. Detect Fusion 360 add-ins directory (Windows/Mac)
  2. Copy `Fusion_System_Blocks.py`, `Fusion_System_Blocks.manifest`, `src/`, and `fusion_system_blocks/` to add-ins folder
  3. Restart Fusion 360 to load updated add-in

### Output Structure

#### Distribution ZIP Contents
```
Fusion_System_Blocks_v1.0_Beta.zip
├── Fusion_System_Blocks.py        # Entry point
├── Fusion_System_Blocks.manifest  # Manifest
├── LICENSE                        # License file
├── README.md                      # User-facing documentation
├── fusion_system_blocks/          # Package structure
│   ├── __init__.py
│   ├── main.py
│   └── core/
│       └── diagram_data.py
└── src/                           # Source code
    ├── core/
    ├── features/
    ├── interface/
    ├── ui/
    ├── utils/
    ├── *.js
    ├── *.css
    ├── palette.html
    └── diagram_data.py
```

#### Fusion 360 Installation Location
- **Windows**: `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\Fusion_System_Blocks\`
- **Mac**: `~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/Fusion_System_Blocks/`

### Environment-Specific Builds
- **Development**: Direct execution from source directory with `.venv` and `__pycache__`
- **Beta**: Distribution ZIP with version tag, excludes development artifacts
- **Production**: Same as Beta but with stable version number and complete documentation

---

## 8. Technology-Specific Organization

### Python-Specific Structure Patterns

#### Package Hierarchy
- **Root Package**: `fusion_system_blocks/` (distribution package)
- **Core Module**: `fusion_system_blocks.core.diagram_data` (wrapper re-exporting `src/diagram_data.py`)
- **Entry Point**: `fusion_system_blocks.main` (wrapper delegating to root `Fusion_System_Blocks.py`)

#### Module Import Strategy
- **Development**: Add `src/` to `sys.path`, import `diagram_data` directly
- **Distribution**: Import `from fusion_system_blocks.core import diagram_data`
- **Rationale**: Avoid code duplication; single source of truth in `src/diagram_data.py`

#### Type Hints and Annotations
- **All Public Functions**: Type-annotated (PEP 484)
- **Imports**: `from typing import Optional, Dict, Any, List, Union`
- **Docstrings**: Google-style (PEP 257)

#### Resource Organization
- **HTML/CSS/JS**: Embedded in `src/` directory, loaded by Fusion 360 palette
- **JSON Schema**: `docs/schema.json` (not embedded, used for validation)
- **Manifest**: `Fusion_System_Blocks.manifest` (JSON, required by Fusion 360)

#### Dependency Management
- **Virtual Environment**: `.venv/` at root level
- **Dependencies**: Currently none beyond Python standard library
- **Future**: `requirements.txt` or `pyproject.toml` if external packages added

### JavaScript-Specific Structure Patterns

#### Module Organization
- **No ES Modules**: Uses global `window` object for cross-file communication
- **Script Loading**: Sequential `<script>` tags in `palette.html`
- **Initialization**: Each module runs an IIFE (Immediately Invoked Function Expression) that attaches to `window`

#### Script Organization
- **Utilities First**: `utils/logger.js` loaded first (no dependencies)
- **Core Next**: `core/diagram-editor.js` (depends on logger)
- **UI Components**: `ui/*.js` (depend on core and utils)
- **Features**: `features/advanced-features.js` (depends on core and UI)
- **Bridge**: `interface/python-bridge.js` (depends on core and logger)
- **Coordination**: `main-coordinator.js` last (orchestrates all modules)

#### Configuration Management
- **CSS Variables**: `fusion-theme.css` defines all theme variables (colors, spacing, shadows, transitions)
- **No JavaScript Config Files**: Configuration embedded in modules or passed from Python

---

## 9. Extension and Evolution

### Extension Points

#### Adding a New UI Tab
1. Edit `src/palette.html`: Add `<button>` to `.sb-tabbar` and `<section>` for panel
2. Update `src/ui/palette-tabs.js`: Add tab ID to `tabs` array and wire interactions
3. Update `src/fusion-theme.css` if custom styling required

#### Adding a New Python Action
1. Add handler method to `PaletteHTMLEventHandler` in `Fusion_System_Blocks.py` (e.g., `_handle_new_action()`)
2. Update dispatcher in `HTMLEvent()` to route action to handler
3. Add corresponding JavaScript call in `src/interface/python-bridge.js` (e.g., `newAction()` method)

#### Adding a New Validation Rule
1. Add rule function to `src/diagram_data.py` (e.g., `check_new_rule()`)
2. Register rule in `check_rules()` function
3. Add tests to `tests/test_rule_checks.py`

#### Adding a New Export Format
1. Add export function to `src/diagram_data.py` (e.g., `export_xml()`)
2. Add corresponding method to `pythonInterface` in `src/interface/python-bridge.js`
3. Wire UI button in `src/ui/palette-tabs.js` or `src/ui/toolbar-manager.js`

### Scalability Patterns

#### Handling Larger Diagrams
- **Virtualization**: Implement canvas virtualization in `src/ui/diagram-renderer.js` to render only visible blocks
- **Lazy Loading**: Load hierarchical sub-diagrams on demand
- **Performance Monitoring**: Extend `src/utils/logger.js` with performance timers

#### Breaking Down Large Modules
- **Python**: Extract rule checks from `diagram_data.py` into `src/rules/` subdirectory
- **JavaScript**: Split `advanced-features.js` into separate files per feature (templates, types, multi-select)

#### Code Splitting Strategies
- **JavaScript**: Migrate to ES modules with dynamic `import()` for on-demand loading
- **Python**: Introduce subpackages under `fusion_system_blocks/` for domain separation

### Refactoring Patterns

#### Observed Incremental Patterns
- **Event Handler Refactoring**: Moved from long `if-elif` chain to dispatch-based routing with dedicated `_handle_*()` methods
- **Frontend Modularization**: Extracted UI logic from monolithic `palette.js` into focused modules (`diagram-renderer.js`, `toolbar-manager.js`, `palette-tabs.js`)

#### Structural Improvements
- **Eliminate Global State**: Migrate JavaScript from global `window` object to ES modules with explicit imports/exports
- **Decouple Python Backend**: Introduce service layer in `src/services/` to separate Fusion API calls from business logic
- **Introduce Dependency Injection**: Pass dependencies to Python/JavaScript modules instead of relying on global imports

---

## 10. Structure Templates

### New Feature Template

#### File Structure
```
src/
├── core/
│   └── {feature}-manager.js       # Core logic for feature
├── ui/
│   └── {feature}-panel.js         # UI components for feature
└── diagram_data.py                # Python backend logic
tests/
└── test_{feature}.py              # Tests for feature
docs/
└── architecture/
    └── ADR-00X-{feature}-decision.md  # Architecture decision record
```

#### Integration Steps
1. Add Python logic to `diagram_data.py`
2. Create JavaScript modules in `src/core/` and `src/ui/`
3. Add `<script>` tags to `src/palette.html` in dependency order
4. Wire UI interactions in `src/ui/palette-tabs.js` or `src/ui/toolbar-manager.js`
5. Add bridge methods to `src/interface/python-bridge.js` if Python communication required
6. Add event handler to `PaletteHTMLEventHandler` in `Fusion_System_Blocks.py`
7. Write tests in `tests/test_{feature}.py`
8. Document decision in `docs/architecture/ADR-00X-{feature}-decision.md`

### New Component Template

#### JavaScript UI Component
```javascript
/**
 * {COMPONENT NAME}
 * 
 * {Description of component purpose}
 * 
 * Author: {Your Name}
 * Created: {Date}
 * Module: {Module Category}
 */

const logger = window.getSystemBlocksLogger
  ? window.getSystemBlocksLogger()
  : { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

class {ComponentName} {
  constructor() {
    this.initialize();
  }

  initialize() {
    logger.info('{ComponentName} initialized');
    // Setup code
  }

  // Public methods
}

// Attach to window for global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {ComponentName};
} else {
  window.{componentInstance} = new {ComponentName}();
}
```

#### Python Module Function
```python
def new_function(param: str, optional: Optional[int] = None) -> Dict[str, Any]:
    """Brief description of function purpose.

    Args:
        param: Description of parameter.
        optional: Description of optional parameter.

    Returns:
        Dictionary containing result data with keys:
        - 'success': Boolean indicating operation success
        - 'data': Result data
        - 'error': Error message if failed

    Raises:
        ValueError: If param is invalid.
    """
    try:
        # Implementation
        return {'success': True, 'data': result}
    except Exception as e:
        notify_error(f"Operation failed: {str(e)}")
        return {'success': False, 'error': str(e)}
```

### New Test Structure

#### Test File Template
```python
"""Tests for {module_name} functionality."""

import pytest
from src.diagram_data import {function_to_test}


@pytest.fixture
def sample_diagram():
    """Create a sample diagram for testing."""
    return {
        'blocks': [
            {'id': 'block1', 'name': 'Block 1', 'type': 'Generic'},
        ],
        'connections': [],
        'metadata': {'version': '2.0'}
    }


def test_{function_name}_success(sample_diagram):
    """Test successful execution of {function_name}."""
    result = {function_to_test}(sample_diagram)
    assert result['success'] is True
    assert 'data' in result


def test_{function_name}_failure():
    """Test {function_name} handles invalid input."""
    result = {function_to_test}(None)
    assert result['success'] is False
    assert 'error' in result
```

---

## 11. Structure Enforcement

### Structure Validation

#### Git Pre-commit Hooks (Future)
- **File Naming**: Enforce `snake_case.py`, `kebab-case.js`, `kebab-case.css`
- **Module Imports**: Verify Python imports from `src/` are valid
- **Test Coverage**: Require test file for each new module

#### Build Checks
- **Distribution Package**: `create_distribution_package.ps1` validates required files exist
- **Manifest Validation**: Check `Fusion_System_Blocks.manifest` against Fusion 360 schema
- **Schema Validation**: Validate diagram JSON against `docs/schema.json`

#### Linting Rules
- **Python**: PEP 8 compliance (use `flake8` or `pylint`)
- **JavaScript**: Consistent naming and formatting (use `eslint` with custom config)
- **CSS**: Class naming conventions (use `stylelint`)

### Documentation Practices

#### Structural Changes
- **ADR Creation**: New architecture decisions documented in `docs/architecture/ADR-{number}-{title}.md`
- **README Updates**: Major structural changes reflected in root `README.md`
- **CHANGELOG**: All structural changes logged in `CHANGELOG.md`

#### Code Documentation
- **Python Docstrings**: Google-style docstrings for all public functions
- **JavaScript JSDoc**: JSDoc comments for module and class-level documentation
- **Inline Comments**: Explain non-obvious logic, especially in bridge communication

#### Structure Evolution History
- **Git Commits**: Structural changes tagged with `[REFACTOR]` or `[STRUCTURE]` prefix
- **Milestone Tracking**: Structural improvements tracked in `docs/MILESTONES.md`
- **Architecture Reviews**: Periodic reviews documented in `docs/architecture/REVIEW_REPORT.md`

---

## 12. Recommendations for Structure Improvement

### Immediate Wins (Low Effort, High Impact) - ✅ COMPLETED

1. **✅ Consolidate Empty Directories**
   - **Issue**: `assets/` and `media/` folders were empty placeholders
   - **Action**: Merged `media/README.md` into `assets/` directory
   - **Impact**: Reduced clutter, clearer structure
   - **Status**: Complete

2. **✅ Move Scripts to Dedicated Folder**
   - **Issue**: Root level had 5+ PowerShell scripts creating visual noise
   - **Action**: Created `scripts/` directory for all `*.ps1` files
   - **Impact**: Cleaner root directory, easier navigation
   - **Status**: Complete

3. **✅ Standardize Documentation Location**
   - **Issue**: Mix of meta docs at root level (`CRITICAL_ISSUES.md`, `TESTING_CHECKLIST.md`, `DETAILED_TESTING_DOCUMENTATION.md`)
   - **Action**: Moved all meta docs to `docs/` with consistent organization
   - **Impact**: Single location for all documentation
   - **Status**: Complete

4. **✅ Create `src/types/` Directory**
   - **Issue**: Block type files (`electrical-blocks.js`, `mechanical-blocks.js`, `software-blocks.js`, `block-templates.js`) scattered in `src/` root
   - **Action**: Moved to `src/types/` subdirectory
   - **Impact**: Clearer organization, easier to find type definitions
   - **Status**: Complete

### Medium-Term Improvements (Moderate Effort)

5. **Introduce Python Package Structure**
   - **Issue**: Single monolithic `src/diagram_data.py` (1000+ lines)
   - **Action**: Break into `src/diagram/` package with modules:
     - `validation.py` (diagram validation logic)
     - `rules.py` (rule checking functions)
     - `export.py` (export functionality)
     - `hierarchy.py` (hierarchical diagram support)
   - **Impact**: Better maintainability, easier testing, clearer responsibilities

6. **Migrate JavaScript to ES Modules**
   - **Issue**: Global `window` object creates implicit dependencies
   - **Action**: Migrate to ES modules with explicit `import`/`export`
   - **Impact**: Better dependency management, tree-shaking, code splitting

7. **Separate Styles by Responsibility**
   - **Issue**: Theme, ribbon, and icons mixed in `src/` root
   - **Action**: Create `src/styles/` directory with subdirectories:
     - `theme/` (color variables, spacing, shadows)
     - `components/` (button, toolbar, panel styles)
     - `icons/` (icon definitions)
   - **Impact**: Clearer style organization, easier theming

8. **Add `config/` Directory**
   - **Issue**: Configuration scattered across root (manifest) and docs (schema)
   - **Action**: Create `config/` directory for:
     - `schema.json`
     - `fusion-manifest.json` (rename from `.manifest`)
     - `build-config.json` (build settings)
   - **Impact**: Single location for all configuration

### Long-Term Strategic Improvements (High Effort)

9. **Introduce Service Layer Architecture**
   - **Issue**: Business logic tightly coupled to Fusion API calls
   - **Action**: Create `src/services/` with clean interfaces:
     - `FusionService` (Fusion API interactions)
     - `DiagramService` (diagram operations)
     - `ValidationService` (validation and rules)
     - `ExportService` (export functionality)
   - **Impact**: Testability, portability to other platforms, clearer boundaries

10. **Implement Plugin Architecture**
    - **Issue**: Block types, validators, exporters hardcoded
    - **Action**: Create plugin system with:
      - `plugins/block-types/` (electrical, mechanical, software)
      - `plugins/validators/` (rule check plugins)
      - `plugins/exporters/` (export format plugins)
    - **Impact**: Extensibility, community contributions, easier customization

11. **Add `examples/` with Sample Diagrams**
    - **Issue**: No example diagrams for new users
    - **Action**: Create `examples/` directory with:
      - `simple-circuit.json` (basic electrical diagram)
      - `motor-controller.json` (mechanical system)
      - `embedded-system.json` (software + hardware)
    - **Impact**: Faster onboarding, documentation examples, testing fixtures

12. **Introduce `docs/api/` for Generated API Docs**
    - **Issue**: No API reference documentation
    - **Action**: Generate API docs from docstrings/JSDoc:
      - Python: Use Sphinx or pdoc
      - JavaScript: Use JSDoc or TypeDoc
      - Output to `docs/api/python/` and `docs/api/javascript/`
    - **Impact**: Better developer experience, clearer interfaces

---

## 13. Proposed Improved Structure

### Recommended Target Structure (After Improvements)

```
Fusion_System_Blocks/
├── .git/
├── .github/
│   ├── agents/
│   ├── instructions/
│   ├── prompts/
│   └── workflows/
├── .gitignore
├── .venv/                         # (excluded from source control)
├── .vscode/
├── assets/                        # Consolidated (merge media/)
│   └── screenshots/
├── config/                        # NEW: Configuration files
│   ├── build-config.json
│   ├── fusion-manifest.json       # Renamed from Fusion_System_Blocks.manifest
│   └── schema.json                # Moved from docs/
├── docs/
│   ├── api/                       # NEW: Generated API docs
│   │   ├── python/
│   │   └── javascript/
│   ├── architecture/
│   ├── ux/
│   ├── critical-issues.md         # Moved from root
│   ├── testing-checklist.md       # Moved from root
│   ├── DESIGN_NOTES.md
│   └── MILESTONES.md
├── examples/                      # NEW: Sample diagrams
│   ├── simple-circuit.json
│   ├── motor-controller.json
│   └── embedded-system.json
├── exports/
├── fusion_system_blocks/          # Distribution package
│   ├── __init__.py
│   ├── main.py
│   └── services/                  # NEW: Service layer
│       ├── diagram_service.py
│       ├── validation_service.py
│       └── export_service.py
├── plugins/                       # NEW: Plugin architecture
│   ├── block-types/
│   │   ├── electrical.py
│   │   ├── mechanical.py
│   │   └── software.py
│   ├── validators/
│   └── exporters/
├── scripts/                       # NEW: Consolidated scripts
│   ├── cleanup_obsolete.ps1       # Moved from root
│   ├── create_beta_release.ps1    # Moved from root
│   ├── create_distribution_package.ps1  # Moved from root
│   ├── deploy_simple.ps1          # Moved from root
│   └── update_public_readme.ps1   # Moved from root
├── src/
│   ├── core/
│   │   └── diagram-editor.js
│   ├── diagram/                   # NEW: Python package (split from diagram_data.py)
│   │   ├── __init__.py
│   │   ├── validation.py
│   │   ├── rules.py
│   │   ├── export.py
│   │   └── hierarchy.py
│   ├── features/
│   │   └── advanced-features.js
│   ├── interface/
│   │   └── python-bridge.js
│   ├── styles/                    # NEW: Organized styles
│   │   ├── theme/
│   │   │   └── fusion-theme.css
│   │   ├── components/
│   │   │   ├── fusion-ribbon.css
│   │   │   └── fusion-icons.css
│   ├── types/                     # NEW: Block type definitions
│   │   ├── electrical-blocks.js   # Moved from root
│   │   ├── mechanical-blocks.js   # Moved from root
│   │   ├── software-blocks.js     # Moved from root
│   │   └── block-templates.js     # Moved from root
│   ├── ui/
│   │   ├── diagram-renderer.js
│   │   ├── palette-tabs.js
│   │   └── toolbar-manager.js
│   ├── utils/
│   │   └── logger.js
│   ├── main-coordinator.js
│   ├── palette.html
│   └── palette.js
├── tests/
│   ├── test_diagram_validation.py  # Split from test_diagram_data.py
│   ├── test_diagram_rules.py       # Split from test_rule_checks.py
│   ├── test_diagram_export.py      # Split from test_export_reports.py
│   ├── test_hierarchy.py
│   ├── test_import.py
│   ├── test_schema.py
│   ├── test_status_tracking.py
│   └── test_validation.py
├── CHANGELOG.md
├── Fusion_System_Blocks.py        # Entry point (keep at root for Fusion)
├── LICENSE
├── PROJECT_FOLDER_STRUCTURE_BLUEPRINT.md  # This document
├── README.md
└── tasks.md
```

### Migration Path
1. **Phase 1** (Immediate): Consolidate directories, move scripts, reorganize types
2. **Phase 2** (1-2 weeks): Split `diagram_data.py`, organize styles, add examples
3. **Phase 3** (1-2 months): Introduce service layer, migrate to ES modules
4. **Phase 4** (Future): Plugin architecture, API documentation generation

---

## Maintenance

This blueprint should be updated:
- When adding new directories or major file reorganization
- When architectural decisions change (document in ADRs first)
- When migrating to new frameworks or build systems
- After completing major refactoring milestones

**Last Updated:** December 22, 2025  
**Next Review:** After Milestone 15 completion
