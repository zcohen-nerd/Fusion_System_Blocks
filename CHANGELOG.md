# Changelog

All notable changes to the Fusion System Blocks project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Two-Layer Architecture (Milestone 16):**
  - `core/` pure Python library with NO Fusion 360 dependencies
  - `fusion_addin/` adapter layer for Fusion 360 integration
- **Core Library Modules:**
  - `models.py` – Block, Port, Connection, Graph dataclasses with enums
  - `validation.py` – Graph validation with structured error codes (ValidationError)
  - `action_plan.py` – Action plan builder for deferred Fusion operations
  - `graph_builder.py` – Fluent API for constructing graphs
  - `serialization.py` – JSON serialization with legacy format support
- **Fusion Adapter Modules:**
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
- **48 new tests** for core library validation and action planning (total: 128 tests)

### Changed
- Updated repository structure to include `core/` and `fusion_addin/` directories
- README and milestone documentation refreshed to reflect new architecture
- Deployment guide aligned with current two-layer architecture

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
- Python 3.11+ backend
- Modern JavaScript frontend with modular architecture
- Fusion 360 Add-in compatibility
- Cross-platform support (Windows, macOS, Linux)
- Git-based version control and CI/CD