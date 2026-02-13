# Fusion 360 Manual Test Plan

Comprehensive pre-release validation checklist for the
Fusion System Blocks add-in. Every testable feature is
covered. Estimated total time: **45–60 min**.

## Prerequisites

- [ ] Fusion 360 installed and running
- [ ] Add-in deployed to
  `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`
- [ ] Fusion 360 restarted after deployment
- [ ] A Fusion document with at least 3 components is open

## Phase 1: Add-in Loading (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 1.1 | Open Fusion 360 | Application starts normally | [ ] |
| 1.2 | Press Shift+S (Scripts and Add-Ins) | Dialog opens, "Fusion System Blocks" listed | [ ] |
| 1.3 | Select add-in → click "Run" | Palette appears in right panel | [ ] |
| 1.4 | Inspect palette | Block diagram canvas with ribbon visible, empty-state CTA ("No blocks yet — Add Block") shown | [ ] |

## Phase 2: Diagnostics (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 2.1 | Find "Run Diagnostics" in Add-Ins panel | Button visible | [ ] |
| 2.2 | Click "Run Diagnostics" | Message box shows 14/14 tests passed | [ ] |
| 2.3 | Open log file (path shown in dialog) | Log contains all 14 diagnostic results with session ID | [ ] |

**Diagnostic tests verified**:
environment, active document, core validation (valid + invalid),
Fusion write access, geometry creation, serialization roundtrip,
action plan generation, log file writable, attribute read/write,
rule engine, hierarchy operations, typed connection roundtrip,
palette HTML integrity.

## Phase 3: Ribbon UI (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 3.1 | Inspect ribbon groups | 9 groups visible: File, Edit, Create, Navigate, Select, Arrange, Annotate, View, Validate + CAD Links group | [ ] |
| 3.2 | Hover any ribbon button for ~0.5 s | Custom tooltip appears below button with description + shortcut | [ ] |
| 3.3 | Move mouse away from button | Tooltip disappears | [ ] |
| 3.4 | Check disabled buttons (Undo, Redo, Navigate group, alignment buttons) | Buttons appear dimmed, do not respond to click | [ ] |
| 3.5 | Select a block, then check button states | Link to CAD, Delete enabled; Alignment buttons enabled | [ ] |
| 3.6 | Resize palette panel narrower | Ribbon scrolls horizontally; groups do not overlap or compress | [ ] |
| 3.7 | Resize palette panel wider | All groups visible without scrolling | [ ] |

## Phase 4: Block Operations (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 4.1 | Click "Block" button (or press B) | Block type dropdown appears (Generic, Electrical, Mechanical, Software) | [ ] |
| 4.2 | Select "Electrical" | New Electrical block appears at canvas center, empty-state CTA disappears | [ ] |
| 4.3 | Click block to select | Orange selection halo appears around block | [ ] |
| 4.4 | Drag block | Block moves smoothly following cursor, snaps to 20px grid | [ ] |
| 4.5 | Double-click block | Inline text editor appears at block position | [ ] |
| 4.6 | Type new name, press Enter | Block label updates to new name, word-wraps if long | [ ] |
| 4.7 | Right-click block | Context menu appears with: Rename, Properties, Type ▸, Status ▸, Connect to…, Delete | [ ] |
| 4.8 | Change type via Type submenu | Block type updates (color changes to match type) | [ ] |
| 4.9 | Change status via Status submenu → "In-Work" | Status indicator dot changes to yellow (#ffc107) | [ ] |
| 4.10 | Set status to each value: Placeholder, Planned, In-Work, Implemented, Verified | Dot colors: gray, light-blue, yellow, green, teal | [ ] |
| 4.11 | Delete block via context menu → Delete | Block removed from canvas with fade animation | [ ] |
| 4.12 | Press Insert key | Block type dropdown appears (same as pressing B) | [ ] |

## Phase 5: Connection Operations (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 5.1 | Add two blocks | Both blocks visible on canvas | [ ] |
| 5.2 | Hover a block | Connection port dots appear on left and right sides | [ ] |
| 5.3 | Select a block, press C | Dashed line follows cursor from source block (connection mode) | [ ] |
| 5.4 | Click second block | Connection line drawn (cubic Bezier curve) between blocks | [ ] |
| 5.5 | Right-click a block → "Connect to…" | Same connection mode enters | [ ] |
| 5.6 | Press Escape during connection mode | Connection mode cancels cleanly, dashed line disappears | [ ] |
| 5.7 | Set connection type dropdown to "Power" | — | [ ] |
| 5.8 | Draw a new connection | Connection rendered in red (#dc3545), 3px width, solid line with arrowhead | [ ] |
| 5.9 | Set connection type to "Data" | — | [ ] |
| 5.10 | Draw a new connection | Connection rendered in blue (#007bff), 2px width, dashed (8,4) | [ ] |
| 5.11 | Set connection type to "Electrical" | — | [ ] |
| 5.12 | Draw a connection | Green (#28a745), 2px, dash 4,2 | [ ] |
| 5.13 | Set connection type to "Mechanical" | — | [ ] |
| 5.14 | Draw a connection | Gray (#6c757d), 2px, dash 12,6 | [ ] |
| 5.15 | Set arrow direction dropdown to "Bidirectional" | — | [ ] |
| 5.16 | Draw a connection | Arrowheads appear at both ends | [ ] |
| 5.17 | Set arrow direction to "None" | — | [ ] |
| 5.18 | Draw a connection | No arrowheads on the line | [ ] |
| 5.19 | Set arrow direction to "Backward" | — | [ ] |
| 5.20 | Draw a connection | Arrow points from target back to source | [ ] |
| 5.21 | Try to connect a block to itself | Connection rejected (no self-loops) | [ ] |
| 5.22 | Try to create a duplicate connection | Duplicate rejected | [ ] |

## Phase 6: Canvas Navigation (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 6.1 | Click and drag on empty canvas area | Canvas pans | [ ] |
| 6.2 | Scroll mouse wheel | Canvas zooms in/out | [ ] |
| 6.3 | Press Ctrl+= | Zooms in | [ ] |
| 6.4 | Press Ctrl+- | Zooms out | [ ] |
| 6.5 | Press Ctrl+0 | Zoom resets to default | [ ] |
| 6.6 | Click "Fit to View" button | All blocks fit within visible area | [ ] |
| 6.7 | Click "Snap to Grid" toggle | Button toggles active state; when OFF blocks move freely, when ON they snap to 20px grid | [ ] |

## Phase 7: Selection Operations (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 7.1 | Click a block | Block selected (orange halo) | [ ] |
| 7.2 | Click empty canvas | Selection clears | [ ] |
| 7.3 | Press Ctrl+A | All blocks selected (all show orange highlight) | [ ] |
| 7.4 | Press Escape | All selections clear | [ ] |
| 7.5 | Ctrl+click multiple blocks | Each clicked block adds to selection | [ ] |
| 7.6 | Click-drag on empty canvas (lasso) | Rubber-band selection rectangle appears | [ ] |
| 7.7 | Release drag | All blocks within lasso rectangle are selected | [ ] |
| 7.8 | Press Delete with blocks selected | All selected blocks deleted | [ ] |

## Phase 8: Search and Filter (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 8.1 | Press Ctrl+F | Search input in secondary toolbar is focused | [ ] |
| 8.2 | Type a block name | Matching blocks highlighted; non-matching dimmed | [ ] |
| 8.3 | Clear search | All blocks visible again | [ ] |
| 8.4 | Click "Placeholder" filter button | Only Placeholder blocks highlighted | [ ] |
| 8.5 | Click "Implemented" filter button | Only Implemented blocks highlighted | [ ] |
| 8.6 | Click "All" filter button | All blocks visible | [ ] |

## Phase 9: Keyboard Shortcuts (3 min)

Test the following shortcuts are functional (create a few
blocks and connections first):

| Step | Shortcut | Expected Result | Pass |
|------|----------|-----------------|------|
| 9.1 | Ctrl+N | Canvas clears (new diagram) | [ ] |
| 9.2 | B | Block type dropdown appears | [ ] |
| 9.3 | Delete / Backspace | Selected block deleted | [ ] |
| 9.4 | Ctrl+Z | Last action undone | [ ] |
| 9.5 | Ctrl+Y | Action redone | [ ] |
| 9.6 | Ctrl+Shift+Z | Redo (alt shortcut) | [ ] |
| 9.7 | Ctrl+D | Selected block duplicated | [ ] |
| 9.8 | Shift+P | Connection type set to Power | [ ] |
| 9.9 | Shift+D | Connection type set to Data | [ ] |
| 9.10 | Shift+E | Connection type set to Electrical | [ ] |
| 9.11 | Shift+M | Connection type set to Mechanical | [ ] |

## Phase 10: Context Menu (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 10.1 | Right-click a block | Context menu shows block items: Rename, Properties, Type ▸, Status ▸, Connect to…, Delete | [ ] |
| 10.2 | Right-click empty canvas | Context menu shows: Add Block, Fit to View | [ ] |
| 10.3 | Click "Add Block" from empty-canvas context menu | Block added at right-click position | [ ] |
| 10.4 | Click "Rename" in block context menu | Inline text editor opens | [ ] |
| 10.5 | Click away from context menu | Menu dismisses cleanly | [ ] |

## Phase 11: Undo / Redo (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 11.1 | Add a block | Block appears | [ ] |
| 11.2 | Click Undo (or Ctrl+Z) | Block disappears | [ ] |
| 11.3 | Click Redo (or Ctrl+Y) | Block reappears | [ ] |
| 11.4 | Move a block, then Undo | Block returns to original position | [ ] |
| 11.5 | Delete a connection, then Undo | Connection is restored | [ ] |
| 11.6 | Perform 3 actions, then Undo 3 times | State returns to original | [ ] |

## Phase 12: Save / Load (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 12.1 | Create a diagram with 3+ blocks and connections | Diagram populated | [ ] |
| 12.2 | Click "Save" (or Ctrl+S) | Success notification appears | [ ] |
| 12.3 | Check status bar | "Last saved" timestamp updates | [ ] |
| 12.4 | Click "New" (Ctrl+N) | Canvas clears | [ ] |
| 12.5 | Click "Load" (Ctrl+O) | Previous diagram restored with all connections | [ ] |
| 12.6 | Close Fusion, reopen, run add-in, Load | Diagram persists across sessions | [ ] |

## Phase 13: Save As / Named Documents (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 13.1 | Press Ctrl+Shift+S (Save As) | "Save As" dialog appears with name input | [ ] |
| 13.2 | Type a name, click Save | Success notification; dialog closes | [ ] |
| 13.3 | Modify diagram, Save As with a different name | Second named document saved | [ ] |
| 13.4 | Press Ctrl+Shift+O (Open Named) | "Open Document" dialog appears with list of saved documents | [ ] |
| 13.5 | Click the first document name | Diagram loads, dialog closes | [ ] |
| 13.6 | Open Named dialog again, click delete (✕) on a document | Document removed from list | [ ] |

## Phase 14: Autosave (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 14.1 | Check "Autosave" toggle in status bar | Toggle turns on | [ ] |
| 14.2 | Make a change, wait ~5 seconds | "Last saved" timestamp updates automatically | [ ] |
| 14.3 | Uncheck "Autosave" | Toggle turns off; auto-saving stops | [ ] |

## Phase 15: Import — Mermaid (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 15.1 | Click "Import" button in ribbon (Edit group) | Import dialog appears with Mermaid/CSV radio toggle | [ ] |
| 15.2 | Select "Mermaid" radio | Mermaid textarea visible, CSV textareas hidden | [ ] |
| 15.3 | Paste valid Mermaid: `flowchart TD\n  A[Start] --> B[End]` | Text entered in textarea | [ ] |
| 15.4 | Click "Import" (OK button) | Diagram imports; 2 blocks and 1 connection appear | [ ] |
| 15.5 | Click "Cancel" instead | Dialog closes without importing | [ ] |

## Phase 16: Import — CSV (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 16.1 | Open import dialog, select "CSV" radio | Two textareas visible: Blocks CSV + Connections CSV | [ ] |
| 16.2 | Enter blocks CSV: `name,type,x,y,status\nPSU,PowerSupply,100,100,Verified\nMCU,Microcontroller,300,100,Planned` | Text entered | [ ] |
| 16.3 | Enter connections CSV: `from,to,kind,protocol\nPSU,MCU,electrical,3.3V` | Text entered | [ ] |
| 16.4 | Click Import | Diagram imports; 2 blocks and 1 connection appear | [ ] |

## Phase 17: CAD Linking (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 17.1 | Open (or create) a Fusion document with components | Document has visible components in viewport | [ ] |
| 17.2 | Create and select a block in diagram | Block selected (orange halo) | [ ] |
| 17.3 | Click "Link to CAD" button | Palette hides; Fusion selection prompt appears in viewport | [ ] |
| 17.4 | Select a component in viewport | Palette reappears | [ ] |
| 17.5 | Check the block | Blue banner with 🔗 icon and component name appears at top of block | [ ] |
| 17.6 | Check notification toast | Toast says "CAD component linked to {block name}" | [ ] |
| 17.7 | Save diagram, then Load | CAD link badge still visible after reload | [ ] |
| 17.8 | Select block, click "Link to CAD" again | Previous link replaced; banner updates to new component name | [ ] |
| 17.9 | Linking panel (tab): click "Start CAD Selection" | Same flow as above (palette hides, select component) | [ ] |
| 17.10 | Cancel CAD selection (press Escape in viewport) | Palette reappears; toast says "CAD link cancelled" | [ ] |

## Phase 18: Export (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 18.1 | Click "Export" in ribbon | Export dialog appears with 10 format checkboxes | [ ] |
| 18.2 | Verify all 10 formats listed | Markdown, HTML, Pin Map CSV, C Header, BOM CSV, BOM JSON, Assembly MD, Assembly JSON, Connection Matrix, SVG | [ ] |
| 18.3 | Verify checked-by-default: Markdown, HTML, Pin Map CSV, C Header, BOM CSV | 5 checkboxes checked | [ ] |
| 18.4 | Click "Select None" | All 10 unchecked | [ ] |
| 18.5 | Click "Select All" | All 10 checked | [ ] |
| 18.6 | Check only Markdown + HTML | Only 2 checked | [ ] |
| 18.7 | Click "Browse…" | Native folder picker dialog opens | [ ] |
| 18.8 | Choose a folder and confirm | Folder path shown in destination field | [ ] |
| 18.9 | Click "Export" | Toast says "Exported 2 files to {path}" | [ ] |
| 18.10 | Open chosen folder | Only `system_blocks_report.md` and `.html` present | [ ] |
| 18.11 | Click "Cancel" button | Dialog closes without exporting | [ ] |
| 18.12 | Report panel (tab): click "Export…" | Same export dialog opens | [ ] |
| 18.13 | Select All, use default path, click Export | Toast reports 10 files; check `exports/` folder | [ ] |
| 18.14 | Open each exported file | All 10 files have valid content (not empty, properly formatted) | [ ] |
| 18.15 | Try exporting with no formats selected | Warning notification: "Select at least one export format" | [ ] |

## Phase 19: Rule Checking / Validation (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 19.1 | Click "Check Rules" in ribbon (Validate group) | Rule check results appear (panel or notification) | [ ] |
| 19.2 | With all-Placeholder blocks | Implementation completeness warnings reported | [ ] |
| 19.3 | Set one block to "Implemented" (no attributes/links) | Incomplete implementation warning for that block | [ ] |
| 19.4 | Add a Power connection between two blocks with no power specs | Power budget check runs (passes — no specs to violate) | [ ] |
| 19.5 | Validation panel (tab): check "Errors" filter, click "Run Checks" | Results filtered to errors only | [ ] |
| 19.6 | Check "Warnings" filter | Results filtered to warnings only | [ ] |
| 19.7 | Use category dropdown (All, Power, Data, Hierarchy) | Results filter by category | [ ] |

## Phase 20: Hierarchy / Child Diagrams (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 20.1 | Select a block | Block selected | [ ] |
| 20.2 | Click "Create Child" (or Ctrl+Shift+N) | Child diagram created; canvas navigates into child; breadcrumb updates to "Root › {block name}" | [ ] |
| 20.3 | Add blocks inside child diagram | Blocks visible in child context | [ ] |
| 20.4 | Click "Go Up" (or Ctrl+Up) | Navigates back to parent; parent block shows nested-squares child indicator at bottom-left | [ ] |
| 20.5 | Select block with child, click "Drill Down" (or Ctrl+Down) | Navigates into child diagram again | [ ] |
| 20.6 | Check breadcrumb path | Shows "Root › {block name}" correctly | [ ] |

## Phase 21: Connection Type Shortcuts (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 21.1 | Press Shift+P | Connection type dropdown changes to "Power" | [ ] |
| 21.2 | Press Shift+D | Dropdown changes to "Data" | [ ] |
| 21.3 | Press Shift+E | Dropdown changes to "Electrical" | [ ] |
| 21.4 | Press Shift+M | Dropdown changes to "Mechanical" | [ ] |

## Phase 22: Arrange / Layout (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 22.1 | Add 4+ blocks in random positions | Blocks scattered | [ ] |
| 22.2 | Click "Auto Layout" button | Blocks rearranged into organized layout | [ ] |
| 22.3 | Select 3 blocks, click "Align Left" | All 3 blocks left-aligned | [ ] |
| 22.4 | Click "Align Center" | All 3 blocks center-aligned horizontally | [ ] |
| 22.5 | Click "Align Right" | All 3 blocks right-aligned | [ ] |

## Phase 23: Grouping (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 23.1 | Select 2+ blocks | Multiple blocks selected | [ ] |
| 23.2 | Click "Create Group" button | Dashed boundary rectangle appears around selected blocks | [ ] |
| 23.3 | Click "Ungroup" button | Group boundary removed; blocks become independent again | [ ] |

## Phase 24: Visual Verification (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 24.1 | Check status legend (bottom of canvas) | Shows all 5 statuses with correct colors | [ ] |
| 24.2 | Check connection legend | Shows Power (red), Data (blue), Electrical (green), Mechanical (gray) + arrow types | [ ] |
| 24.3 | Verify arrow sizes are consistent | Arrows are the same size regardless of connection thickness (fixed 10×7 markers) | [ ] |
| 24.4 | Verify block text wrapping | Long names wrap to 2–3 lines; very long names truncate with "…" | [ ] |
| 24.5 | Verify status indicator dots | Small colored circle at top-right corner of each block | [ ] |

## Phase 25: Status Bar (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 25.1 | Check "Bridge" pill | Shows "Bridge: connected" (green) when Python connected | [ ] |
| 25.2 | Check "Health" pill | Shows "Health: …" status | [ ] |
| 25.3 | Click "Save" button in status bar | Diagram saves; "Last saved" timestamp updates | [ ] |

## Phase 26: Tab Panels (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 26.1 | Click "Home" tab | Home panel shows with "New Diagram" and "Load Diagram" buttons, Quick Tips | [ ] |
| 26.2 | Click "Diagram" tab | Diagram panel shows (main canvas area) | [ ] |
| 26.3 | Click "Linking" tab | Linking panel shows "Start CAD Selection" button and linking status | [ ] |
| 26.4 | Click "Validation" tab | Validation panel shows filter checkboxes (Errors, Warnings), category dropdown, "Run Checks" button, results list | [ ] |
| 26.5 | Click "Reports" tab | Reports panel shows "Export…" button, export status pill, export path, file list | [ ] |
| 26.6 | Test Home panel: "New Diagram" button | Creates new diagram (same as Ctrl+N) | [ ] |
| 26.7 | Test Home panel: "Load Diagram" button | Loads saved diagram (same as Ctrl+O) | [ ] |

## Phase 27: Save/Load Regression — M18 (3 min)

Verify the requirements engine's `"requirements"` key
doesn't break save/load for old and new diagrams.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 27.1 | Create diagram with 3+ blocks and connections | Diagram populated | [ ] |
| 27.2 | Save diagram | Success notification, no errors | [ ] |
| 27.3 | Clear diagram (New), then Load | Diagram restored with all blocks and connections | [ ] |
| 27.4 | Open a document saved before M18 | Add-in loads without errors | [ ] |
| 27.5 | Load the pre-M18 diagram | Diagram loads (missing `requirements` defaults to `[]`) | [ ] |
| 27.6 | Save the pre-M18 diagram | Save succeeds; JSON now includes `"requirements": []` | [ ] |
| 27.7 | Load the re-saved diagram | All blocks, connections, metadata intact | [ ] |

**Check logs**: No `KeyError`, `TypeError`, or `ValueError`
related to `requirements` parsing.

## Phase 28: Export Pipeline Validation (3 min)

Verify all 10 export generators produce valid output.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 28.1 | Create diagram with 4+ blocks (mix of types), typed connections, at least 1 CAD-linked block | Diagram populated | [ ] |
| 28.2 | Export all 10 formats | Export completes without errors | [ ] |
| 28.3 | Open `system_blocks_report.md` | Markdown report with block table, connection table, rule results | [ ] |
| 28.4 | Open `system_blocks_report.html` | HTML report renders in browser, blocks and connections listed | [ ] |
| 28.5 | Open `pin_map.csv` | CSV with pin data | [ ] |
| 28.6 | Open `pins.h` | C header with pin definitions | [ ] |
| 28.7 | Open `bom.csv` | BOM CSV with columns, data matches diagram | [ ] |
| 28.8 | Open `bom.json` | BOM JSON with block data | [ ] |
| 28.9 | Open `assembly_sequence.md` | Assembly sequence in Markdown | [ ] |
| 28.10 | Open `assembly_sequence.json` | Assembly sequence in JSON | [ ] |
| 28.11 | Open `connection_matrix.csv` | Block × block adjacency matrix | [ ] |
| 28.12 | Open `diagram.svg` | SVG diagram snapshot renders correctly | [ ] |

## Phase 29: Edge Cases & Error Handling (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 29.1 | Load with no saved diagram | Notification says "No saved diagram found" or loads empty | [ ] |
| 29.2 | Export with empty diagram (0 blocks) | Export succeeds (empty reports generated) or clear error message | [ ] |
| 29.3 | Create block, immediately delete, then Undo | Block is restored by undo | [ ] |
| 29.4 | Delete a block that has connections | Block and all its connections removed | [ ] |
| 29.5 | Try linking CAD with no block selected | Warning: "Select a block first to link CAD" | [ ] |
| 29.6 | Save As with empty name | Error or name field required validation | [ ] |
| 29.7 | Open Named when no documents exist | Dialog shows empty state or "No documents" message | [ ] |

## Phase 30: Performance & Stress (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 30.1 | Create 20+ blocks rapidly | All blocks render without lag | [ ] |
| 30.2 | Connect all 20 blocks in a chain | All connections render correctly | [ ] |
| 30.3 | Select All, then drag | All blocks move together smoothly | [ ] |
| 30.4 | Save large diagram, then Load | Save/Load completes in < 3 seconds | [ ] |
| 30.5 | Auto Layout on 20+ blocks | Layout completes without freezing | [ ] |

## Quick Smoke Test

Minimal 3-step validation for quick checks:

1. [ ] Add-in loads without errors
2. [ ] "Run Diagnostics" shows 14/14 passed
3. [ ] Can create, rename, connect, save, and load blocks

## Error Log Location

All errors are logged to:

```text
Windows: %USERPROFILE%\FusionSystemBlocks\logs\
macOS:   ~/FusionSystemBlocks/logs/
```

Log filename format:
`systemblocks_YYYYMMDD_HHMMSS_<session>.log`

## Results Summary

| Phase | Area | Steps | Passed | Failed |
|-------|------|-------|--------|--------|
| 1 | Add-in Loading | 4 | _ | _ |
| 2 | Diagnostics | 3 | _ | _ |
| 3 | Ribbon UI | 7 | _ | _ |
| 4 | Block Operations | 12 | _ | _ |
| 5 | Connection Operations | 22 | _ | _ |
| 6 | Canvas Navigation | 7 | _ | _ |
| 7 | Selection Operations | 8 | _ | _ |
| 8 | Search and Filter | 6 | _ | _ |
| 9 | Keyboard Shortcuts | 11 | _ | _ |
| 10 | Context Menu | 5 | _ | _ |
| 11 | Undo / Redo | 6 | _ | _ |
| 12 | Save / Load | 6 | _ | _ |
| 13 | Save As / Named Docs | 6 | _ | _ |
| 14 | Autosave | 3 | _ | _ |
| 15 | Import — Mermaid | 5 | _ | _ |
| 16 | Import — CSV | 4 | _ | _ |
| 17 | CAD Linking | 10 | _ | _ |
| 18 | Export | 15 | _ | _ |
| 19 | Rule Checking | 7 | _ | _ |
| 20 | Hierarchy / Child Diagrams | 6 | _ | _ |
| 21 | Connection Type Shortcuts | 4 | _ | _ |
| 22 | Arrange / Layout | 5 | _ | _ |
| 23 | Grouping | 3 | _ | _ |
| 24 | Visual Verification | 5 | _ | _ |
| 25 | Status Bar | 3 | _ | _ |
| 26 | Tab Panels | 7 | _ | _ |
| 27 | Save/Load Regression (M18) | 7 | _ | _ |
| 28 | Export Pipeline Validation | 12 | _ | _ |
| 29 | Edge Cases & Errors | 7 | _ | _ |
| 30 | Performance & Stress | 5 | _ | _ |
| **TOTAL** | | **200** | _ | _ |

**Tested By**: _________________ **Date**: _________________

**Fusion 360 Version**: _________________

**OS**: _________________

**Overall Result**: [ ] PASS / [ ] FAIL

**Notes**:
