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
| 1.4 | Check palette loads | Block diagram canvas with ribbon visible | [ ] |

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
| 3.1 | Click "Block" button in Create ribbon group | New block appears on canvas | [ ] |
| 3.2 | Click block to select | Orange selection highlight appears | [ ] |
| 3.3 | Drag block | Block moves smoothly | [ ] |
| 3.4 | Double-click block | Inline text editor appears, type new name, press Enter | [ ] |
| 3.5 | Right-click block | Context menu with Type, Status, Connect, Delete | [ ] |
| 3.6 | Change type via context menu | Block type updates | [ ] |
| 3.7 | Change status via context menu | Block status updates | [ ] |
| 3.8 | Delete block via context menu | Block removed from canvas | [ ] |

## Phase 4: Connection Operations (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 4.1 | Add two blocks | Both blocks on canvas | [ ] |
| 4.2 | Hover a block | Connection port dots appear on left/right sides | [ ] |
| 4.3 | Select a block, press C (or click Connect button) | Dashed line follows cursor from source block | [ ] |
| 4.4 | Click second block | Connection line drawn between blocks | [ ] |
| 4.5 | Right-click block → "Connect to..." | Same connection mode enters | [ ] |
| 4.6 | Press Escape during connection | Connection mode cancels cleanly | [ ] |

## Phase 5: Ribbon UI (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 5.1 | Inspect ribbon layout | Commands in logical groups (File, Edit, Create, etc.) | [ ] |
| 5.2 | Hover ribbon buttons | Professional highlight and tooltip feedback | [ ] |
| 5.3 | Check button states | Buttons enable/disable based on selection context | [ ] |
| 5.4 | Resize palette panel | Ribbon adapts to width changes | [ ] |

## Phase 6: Save/Load (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 6.1 | Create a diagram with 3+ blocks and connections | Diagram populated | [ ] |
| 6.2 | Click "Save" | Success notification appears | [ ] |
| 6.3 | Click "New" (clear diagram) | Canvas clears | [ ] |
| 6.4 | Click "Load" | Previous diagram restored with connections | [ ] |
| 6.5 | Close Fusion, reopen, run add-in, Load | Diagram persists across sessions | [ ] |

## Phase 7: CAD Linking (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 7.1 | Create or open a Fusion document with components | Document has visible components | [ ] |
| 7.2 | Select a block in diagram | Block selected | [ ] |
| 7.3 | Click "Link to CAD" | Selection prompt appears | [ ] |
| 7.4 | Select a component in viewport | Link created, block shows link indicator | [ ] |
| 7.5 | Check block status | Status changes to In-Work or Implemented | [ ] |

## Phase 8: Export (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 8.1 | Click "Export Report" | Export dialog/action triggers | [ ] |
| 8.2 | Check `/exports/` folder | Report file created (Markdown or HTML) | [ ] |

## Quick Smoke Test

Minimal 3-step validation:

1. [ ] Add-in loads without errors
2. [ ] "Run Diagnostics" shows 6/6 passed
3. [ ] Can create, rename, connect, and save blocks

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
| 4. Connections | 6 | _ | _ |
| 5. Ribbon UI | 4 | _ | _ |
| 6. Save/Load | 5 | _ | _ |
| 7. CAD Linking | 5 | _ | _ |
| 8. Export | 2 | _ | _ |
| **TOTAL** | **37** | _ | _ |

**Tested By**: _________________ **Date**: _________________

**Overall Result**: [ ] PASS / [ ] FAIL

**Notes**:
