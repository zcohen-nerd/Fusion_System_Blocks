# Copilot Instructions for Fusion System Blocks

## Project Overview
Fusion System Blocks is a sophisticated Fusion add-in that provides block-based system design capabilities with a professional ribbon interface. The project is split into public (documentation/releases) and private (source code) repositories.

## Architecture Guidelines

### Frontend (JavaScript)
- **Modular Architecture**: 6 specialized modules with clear separation of concerns
- **Core Module** (`core/diagram-editor.js`): Foundation classes and core editing functionality
- **UI Modules** (`ui/`): Visual rendering and toolbar management
- **Features Module** (`features/advanced-features.js`): Multi-selection and advanced operations
- **Interface Module** (`interface/python-bridge.js`): Backend communication
- **Coordinator** (`main-coordinator.js`): System orchestration

### Backend (Python) - Two-Layer Architecture
- **Core Library** (`fsb_core/`): Pure Python business logic with NO Fusion dependencies
  - `models.py`: Dataclasses for Block, Port, Connection, Graph; Requirement, Snapshot, DiffResult, ComparisonOperator, block_fingerprint
  - `validation.py`: Graph validation with structured error codes
  - `action_plan.py`: Deferred action planning for Fusion operations
  - `graph_builder.py`: Fluent API for graph construction
  - `serialization.py`: JSON serialization with legacy format support
  - `bridge_actions.py`: BridgeAction / BridgeEvent enums (shared constants for Python and JS)
  - `delta.py`: compute_patch / apply_patch / is_trivial_patch (JSON-Patch style delta serialization)
  - `requirements.py`: Requirements validation engine (aggregate_attribute, validate_requirements)
  - `version_control.py`: Snapshot creation, graph diffing, restore, SnapshotStore
- **Fusion Adapter** (`fusion_addin/`): Thin wrappers for Fusion integration
  - `adapter.py`: FusionAdapter class for core ↔ Fusion translation
  - `selection.py`: SelectionHandler for Fusion selection workflows
  - `document.py`: DocumentManager for Fusion document operations
  - `logging_util.py`: Production logging with session IDs
  - `diagnostics.py`: DiagnosticsRunner with self-test suite
- **Entry Point**: `Fusion_System_Blocks.py` orchestrates both layers (hard-fail imports, no fallback)
- **Legacy Data Management**: `src/diagram_data.py` for backward compatibility
- **Testing**: 605 pytest tests in `tests/` across 23 files (runs outside Fusion)

## Development Standards

### Code Style
- **JavaScript**: Use ES6+ features, clear class structures, comprehensive comments
- **Python**: Follow PEP 8, use type hints where appropriate, maintain docstrings
- **CSS**: Fusion-style theming, organized component-based styles

### Naming Conventions
- **Classes**: PascalCase (e.g., `DiagramEditorCore`, `ToolbarManager`)
- **Functions/Methods**: camelCase for JS, snake_case for Python
- **Files**: kebab-case for JS modules, snake_case for Python files
- **Constants**: UPPER_SNAKE_CASE

### Documentation
- **Public Docs**: Focus on usage, installation, and API reference
- **Internal Docs**: Technical implementation details, architecture decisions
- **Code Comments**: Explain why, not what; include TODO/FIXME markers

## Testing Approach

### Test Coverage (605 tests across 23 files)
- **Core Library Tests**: `test_core_validation.py`, `test_core_action_plan.py`, `test_models.py`, `test_serialization.py`, `test_delta.py`, `test_requirements.py`, `test_version_control.py`
- **Adapter Tests**: `test_adapter.py`, `test_selection.py`, `test_document.py`, `test_cad.py`
- **Legacy Logic Tests**: `test_diagram_data.py`, `test_validation.py` 
- **Integration Tests**: `test_integration.py`, `test_property_based.py`
- **Feature Tests**: `test_export_reports.py`, `test_hierarchy.py`, `test_import.py`, `test_rule_checks.py`, `test_schema.py`, `test_status_tracking.py`, `test_graph_builder.py`, `test_logging_util.py`
- **Diagnostics**: Built-in "Run Diagnostics" command for runtime self-testing

### Test Organization
- **Quick Tests**: 30-minute practical validation checklist (FUSION_MANUAL_TEST_PLAN.md)
- **Comprehensive Tests**: Full milestone validation procedures (DETAILED_TESTING_DOCUMENTATION.md)
- **Automated Tests**: GitHub Actions CI with ruff, mypy, and pytest on Python 3.9–3.12

## Repository Management

### Public Repository
- Documentation, guides, and tutorials
- Release artifacts and changelog
- Community support and issue tracking
- No source code or proprietary information

### Private Repository
- Full source code and development files
- Internal documentation and testing
- CI/CD workflows and automation
- Development environment configuration

## Feature Development

### Milestone System (18 total, 16 complete)
- **Foundation** (Milestones 1-3): Core block manipulation, persistence, status tracking
- **Core Features** (Milestones 4-7): Hierarchy, import/export, rules, search
- **Advanced Features** (Milestones 8-11): Undo/redo, connections, UI, templates
- **Integration** (Milestones 12, 14): CAD linking, advanced diagram tools
- **Tooling** (Milestone 16): Two-layer architecture, logging, diagnostics
- **UI/UX** (Milestone 10.5): Responsive ribbon, accessibility, keyboard help, crash recovery
- **Reporting** (Milestone 17): 11-format export pipeline with profiles (including PDF)
- **Requirements** (Milestone 18): Requirements engine, version control, adapter integration, frontend tabs
- **Not Started** (Milestones 13, 15): 3D visualization, AI assistant

### Ribbon Interface
- **File Group**: New, Open, Save, Export operations
- **Edit Group**: Undo, Redo, Copy, Paste, Delete
- **Create Group**: Block creation tools and templates
- **Select Group**: Selection modes and filters
- **Arrange Group**: Alignment, distribution, grouping

## Integration Guidelines

### Fusion API
- **Native Integration**: Use official Fusion Python API
- **Event Handling**: Proper event registration and cleanup
- **Error Handling**: Graceful failure with user feedback
- **Performance**: Minimize API calls, batch operations when possible

### JavaScript-Python Bridge
- **Message Passing**: Structured JSON communication
- **Error Propagation**: Consistent error handling across layers
- **State Synchronization**: Keep frontend and backend in sync
- **Performance**: Optimize data transfer and processing

## Release Process

### Version Management
- **Semantic Versioning**: MAJOR.MINOR.PATCH format
- **Tag-based Releases**: Git tags trigger automated builds
- **Release Notes**: Clear changelog with features, fixes, and breaking changes

### CI/CD Pipeline
1. **Linting**: ruff check and ruff format on every push/PR
2. **Type Checking**: mypy on `fsb_core/`
3. **Testing**: pytest on Python 3.9–3.12 with coverage
4. **Release**: Automated GitHub release creation
5. **Distribution**: Public repository asset publishing

## Common Patterns

### Error Handling
```javascript
// JavaScript
try {
    const result = await operation();
    return { success: true, data: result };
} catch (error) {
    const loggerGetter = window.getSystemBlocksLogger;
    const logger = typeof loggerGetter === 'function'
        ? loggerGetter()
        : (window.SystemBlocksLogger || {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {}
        });
    logger.error('Operation failed:', error);
    return { success: false, error: error.message };
}
```

```python
# Python
try:
    result = perform_operation()
    return {"success": True, "data": result}
except Exception as e:
    logger.error(f"Operation failed: {e}")
    return {"success": False, "error": str(e)}
```

### Module Communication
```javascript
// Event-based communication between modules
class ModuleBase {
    constructor() {
        this.eventBus = window.eventBus || new EventTarget();
    }
    
    emit(eventType, data) {
        this.eventBus.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    on(eventType, handler) {
        this.eventBus.addEventListener(eventType, handler);
    }
}
```

## Troubleshooting Guidelines

### Common Issues
- **Module Loading**: Check script order in HTML
- **Python Bridge**: Verify Fusion API availability
- **Performance**: Profile operations, optimize data structures
- **UI Responsiveness**: Use async operations, avoid blocking

### Debug Process
1. **Console Logging**: Use structured logging with levels
2. **Error Boundaries**: Implement try-catch blocks strategically
3. **State Inspection**: Provide debug tools for state examination
4. **Test Isolation**: Create minimal reproducible test cases

## Security Considerations

### Code Protection
- **Private Repository**: Keep source code and sensitive logic private
- **Public API**: Only expose necessary interfaces publicly
- **Input Validation**: Sanitize all user inputs and API parameters
- **Error Messages**: Avoid exposing internal implementation details

This document should be updated as the project evolves and new patterns emerge.