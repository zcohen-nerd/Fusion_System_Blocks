# Design Notes: Fusion System Blocks Add-in

## Vision
Fusion-native system/block diagrams that link to CAD/ECAD with live validation.

## JSON (concept)
- **Block:** id, name, type, status, attributes, interfaces, links
- **Connection:** from block/interface → to block/interface, kind/protocol

## Initial Rules
- Logic-level compatibility for digital interfaces
- Power budget checks on rails
- Implementation completeness (linked vs unlinked)

## Next Steps
- Palette <-> Python messaging
- Persistence to design attributes
- Linking commands to CAD/ECAD occurrences
- Exports (Markdown/CSV) and Mermaid import
