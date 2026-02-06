# Fusion 360 Manual Test Plan

Quick validation checklist for testing the add-in inside Fusion 360.
Run this when you need to verify the add-in works correctly before releases.

## Prerequisites

- [ ] Fusion 360 installed and running
- [ ] Add-in deployed to `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`
- [ ] Fusion 360 restarted after deployment

## Phase 1: Add-in Loading (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 1.1 | Open Fusion 360 | Application starts normally | [ ] |
| 1.2 | Click Scripts and Add-Ins (Shift+S) | Dialog opens, "Fusion System Blocks" visible | [ ] |
| 1.3 | Select add-in → click "Run" | Palette appears in right panel | [ ] |
| 1.4 | Check palette loads | Block diagram canvas visible | [ ] |

**Troubleshooting**: If add-in fails to load, check `~/FusionSystemBlocks/logs/` for error logs.

## Phase 2: Run Diagnostics (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 2.1 | Find "Run Diagnostics" button in Add-Ins panel | Button visible | [ ] |
| 2.2 | Click "Run Diagnostics" | Message box shows 6/6 tests passed | [ ] |
| 2.3 | Open log file (path shown in dialog) | Log contains diagnostic output with session ID | [ ] |

**Expected Diagnostics**:

- `check_environment` - adsk modules import successfully
- `check_active_document` - A document is open (or reports none)
- `check_core_valid_graph` - Core validation accepts valid graph
- `check_core_invalid_graph` - Core validation catches errors
- `check_fusion_write_access` - Can create/delete temp component
- `check_fusion_geometry_creation` - Can create/delete temp geometry

## Phase 3: Block Operations (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 3.1 | Click "Add Block" button | Block creation dialog opens | [ ] |
| 3.2 | Enter name "MCU", select type "Microcontroller" | Fields accept input | [ ] |
| 3.3 | Click OK | Block appears on canvas | [ ] |
| 3.4 | Click block to select | Orange selection highlight appears | [ ] |
| 3.5 | Drag block | Block moves smoothly | [ ] |
| 3.6 | Right-click block | Context menu appears | [ ] |
| 3.7 | Click "Delete" from context menu | Block removed from canvas | [ ] |
| 3.8 | Press Ctrl+Z | Block restored (undo works) | [ ] |

## Phase 4: Connection Operations (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 4.1 | Add two blocks (MCU and Sensor) | Both blocks on canvas | [ ] |
| 4.2 | Click port on MCU, drag to port on Sensor | Connection line appears | [ ] |
| 4.3 | Click connection to select | Connection highlighted | [ ] |
| 4.4 | Right-click connection | Context menu with options | [ ] |
| 4.5 | Delete connection | Connection removed | [ ] |

## Phase 5: Save/Load (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 5.1 | Create a diagram with 3+ blocks | Diagram populated | [ ] |
| 5.2 | Click "Save" | Success notification appears | [ ] |
| 5.3 | Click "New" (clear diagram) | Canvas clears | [ ] |
| 5.4 | Click "Load" | Previous diagram restored | [ ] |
| 5.5 | Close Fusion, reopen, run add-in, Load | Diagram persists across sessions | [ ] |

## Phase 6: CAD Linking (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 6.1 | Create or open a Fusion document with components | Document has visible components | [ ] |
| 6.2 | Select a block in diagram | Block selected | [ ] |
| 6.3 | Click "Link to CAD" | Selection prompt appears | [ ] |
| 6.4 | Select a component in viewport | Link created, block shows link indicator | [ ] |
| 6.5 | Check block status | Status changes to In-Work or Implemented | [ ] |

## Phase 7: Export (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 7.1 | Click "Export Report" | Export dialog/action triggers | [ ] |
| 7.2 | Check `/exports/` folder | Report file created (Markdown or HTML) | [ ] |

## Quick Smoke Test (Use for CI/Quick Checks)

Minimal 3-step validation:

1. [ ] Add-in loads without errors
2. [ ] "Run Diagnostics" shows 6/6 passed
3. [ ] Can create and save a block

## Error Log Location

All errors are logged to:

```text
Windows: %USERPROFILE%\FusionSystemBlocks\logs\
macOS:   ~/FusionSystemBlocks/logs/
```

Log filename format: `systemblocks_YYYYMMDD_HHMMSS_<session>.log`

## Results Summary

| Phase | Tests | Passed | Failed |
|-------|-------|--------|--------|
| 1. Add-in Loading | 4 | _ | _ |
| 2. Diagnostics | 3 | _ | _ |
| 3. Block Operations | 8 | _ | _ |
| 4. Connections | 5 | _ | _ |
| 5. Save/Load | 5 | _ | _ |
| 6. CAD Linking | 5 | _ | _ |
| 7. Export | 2 | _ | _ |
| **TOTAL** | **32** | _ | _ |

**Tested By**: _________________ **Date**: _________________

**Overall Result**: [ ] PASS / [ ] FAIL

**Notes**:
