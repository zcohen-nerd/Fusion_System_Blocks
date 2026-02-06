# Design Notes: Fusion System Blocks Add-in

## Vision
Fusion-native system/block diagrams that link to CAD/ECAD with live validation.

## Architecture (Updated February 2026)

### Two-Layer Python Architecture
- **Core Library (`core/`)**: Pure Python with NO Fusion dependencies
  - `models.py`: Block, Port, Connection, Graph dataclasses
  - `validation.py`: Graph validation with structured errors
  - `action_plan.py`: Deferred action planning
  - `serialization.py`: JSON serialization
- **Fusion Adapter (`fusion_addin/`)**: Thin Fusion 360 wrappers
  - `adapter.py`: Core ↔ Fusion translation
  - `logging_util.py`: Production logging
  - `diagnostics.py`: Self-test suite

### Benefits
- 128 pytest tests run outside Fusion 360 (<0.2s)
- Clear separation of business logic from platform code
- Production logging with session IDs and tracebacks

## JSON (concept)
- **Block:** id, name, type, status, attributes, interfaces, links
- **Connection:** from block/interface → to block/interface, kind/protocol

## Initial Rules
- Logic-level compatibility for digital interfaces
- Power budget checks on rails
- Implementation completeness (linked vs unlinked)

## Completed Steps
- Palette <-> Python messaging ✅
- Persistence to design attributes ✅
- Linking commands to CAD/ECAD occurrences ✅
- Exports (Markdown/CSV) and Mermaid import ✅
- Two-layer architecture ✅
- Production logging ✅
- Diagnostics system ✅

## Next Steps
- Complete 3D visualization (Milestone 13)
- Explore AI-powered design assistant (Milestone 15)
