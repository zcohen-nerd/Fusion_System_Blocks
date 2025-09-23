# Copilot Instructions for Fusion System Blocks

## Project Overview
This is a Fusion 360 add-in for creating system-level block diagrams within CAD. The architecture bridges Python (Fusion API) with HTML/JS (palette UI) using Fusion's palette messaging system.

## Core Architecture

**Three-layer design:**
- `src/main.py`: Fusion 360 add-in entry point, creates palette and toolbar button
- `src/palette.html` + `src/palette.js`: Web-based diagram editor (HTML palette in Fusion)
- `docs/schema.json`: JSON schema defining the data model for blocks, connections, and CAD/ECAD links

**Data flow:** User draws diagrams in HTML palette → JS creates JSON conforming to schema → Python persists to Fusion attributes using `ATTR_GROUP = 'systemBlocks'`

## Key Patterns

**Fusion Add-in Structure:**
- Use `_handlers = []` to keep event handlers alive (prevents garbage collection)
- Palette paths must use `pathlib.Path(__file__).with_name('palette.html').as_uri()`
- Always wrap Fusion API calls in try/except with `UI.messageBox()` for user-visible errors

**Schema-Driven Development:**
- All diagram data must validate against `docs/schema.json`
- Blocks have: id, name, type, status (Placeholder→Verified), interfaces, CAD/ECAD links
- Connections link block interfaces with typed relationships (electrical/power/data/mechanical)

**Status Tracking:**
Use enum: `["Placeholder", "Planned", "In-Work", "Implemented", "Verified"]`
- Drives UI visual feedback (color halos)
- Powers completeness reporting

## Development Workflow

**Testing:** `pytest -q` (validates schema, basic functionality)
**Linting:** `flake8 src tests --max-line-length=100`
**CI:** GitHub Actions on push/PR to main branch

**Local Development:**
1. Install in Fusion 360 Scripts and Add-Ins panel
2. Edit files in-place, restart add-in to reload
3. Use browser dev tools on palette for JS debugging

## Critical Integration Points

**Fusion Persistence:**
- Store diagram JSON in `adsk.core.Attributes` with group `ATTR_GROUP = 'systemBlocks'`
- Persist per-design (not global)

**CAD/ECAD Linking:**
- Block links reference Fusion occurrences via `occToken` and `docId`
- ECAD links use `device` and `footprint` fields
- Status workflow: draw block → link to CAD → mark "Implemented"

## File Conventions

- `src/`: All implementation code
- `docs/`: Schema and design documentation  
- `tests/`: JSON schema validation, minimal unit tests
- No external Python dependencies beyond Fusion API + stdlib (keep installation simple)

## Anti-Patterns to Avoid

- Don't use complex build systems - this is a simple Fusion add-in
- Don't bypass the schema - all data changes must validate
- Don't use `adsk.fusion.Design.attributes` directly - use the established `ATTR_GROUP`
- Avoid large external JS frameworks - keep palette lightweight