# Copilot Instructions for Fusion System Blocks

## Project Overview
Fusion System Blocks is a sophisticated Fusion 360 add-in that provides block-based system design capabilities with a professional ribbon interface. The project is split into public (documentation/releases) and private (source code) repositories.

## Architecture Guidelines

### Frontend (JavaScript)
- **Modular Architecture**: 6 specialized modules with clear separation of concerns
- **Core Module** (`core/diagram-editor.js`): Foundation classes and core editing functionality
- **UI Modules** (`ui/`): Visual rendering and toolbar management
- **Features Module** (`features/advanced-features.js`): Multi-selection and advanced operations
- **Interface Module** (`interface/python-bridge.js`): Backend communication
- **Coordinator** (`main-coordinator.js`): System orchestration

### Backend (Python)
- **Single Entry Point**: `Fusion_System_Blocks.py` contains all functionality
- **Fusion 360 Integration**: Native API usage for CAD operations
- **Data Management**: Centralized in `src/diagram_data.py`
- **Testing**: Comprehensive pytest suite in `tests/`

## Development Standards

### Code Style
- **JavaScript**: Use ES6+ features, clear class structures, comprehensive comments
- **Python**: Follow PEP 8, use type hints where appropriate, maintain docstrings
- **CSS**: Fusion 360-style theming, organized component-based styles

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

### Test Coverage
- **Unit Tests**: Individual function/class testing
- **Integration Tests**: Module interaction validation
- **System Tests**: Full workflow testing
- **UI Tests**: Interface functionality validation

### Test Organization
- **Quick Tests**: 30-minute practical validation checklist
- **Comprehensive Tests**: Full milestone validation procedures
- **Automated Tests**: CI/CD pipeline with pytest and flake8

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

### Milestone System
- **Basic Operations**: Core block manipulation (Milestones 1-5)
- **Advanced Features**: Multi-selection, grouping, complex operations (Milestones 6-10)
- **Integration Features**: CAD linking, 3D visualization (Milestones 11-15)

### Ribbon Interface
- **File Group**: New, Open, Save, Export operations
- **Edit Group**: Undo, Redo, Copy, Paste, Delete
- **Create Group**: Block creation tools and templates
- **Select Group**: Selection modes and filters
- **Arrange Group**: Alignment, distribution, grouping

## Integration Guidelines

### Fusion 360 API
- **Native Integration**: Use official Fusion 360 Python API
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
1. **Testing**: Automated pytest and flake8 validation
2. **Building**: Package creation with all required files
3. **Release**: Automated GitHub release creation
4. **Distribution**: Public repository asset publishing

## Common Patterns

### Error Handling
```javascript
// JavaScript
try {
    const result = await operation();
    return { success: true, data: result };
} catch (error) {
    console.error('Operation failed:', error);
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
- **Python Bridge**: Verify Fusion 360 API availability
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