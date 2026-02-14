# Fusion 360 Manual Test Plan

Comprehensive pre-release validation checklist for the
Fusion System Blocks add-in. Every testable feature is
covered exactly once. Estimated total time: **75–95 min**.

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
| 1.4 | Inspect palette | Ribbon visible, empty-state CTA ("No blocks yet — Add Block") shown | [ ] |

## Phase 2: Diagnostics (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 2.1 | Find "Run Diagnostics" in Add-Ins panel | Button visible | [ ] |
| 2.2 | Click "Run Diagnostics" | Message box shows 32/32 tests passed | [ ] |
| 2.3 | Open log file (path shown in dialog) | Log contains all 32 diagnostic results with session ID | [ ] |

**Diagnostic tests verified**:
environment, active document, core validation (valid + invalid),
Fusion write access, geometry creation, serialization roundtrip,
action plan generation, log file writable, attribute read/write,
rule engine, hierarchy operations, typed connection roundtrip,
palette HTML integrity.

## Phase 3: Ribbon UI (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 3.1 | Inspect ribbon groups | 10 groups visible: File, Edit, Create, Navigate, Select, Arrange, Annotate, View, Validate, Links | [ ] |
| 3.2 | Hover any ribbon button for ~0.5 s | Tooltip appears with description + shortcut hint | [ ] |
| 3.3 | Move mouse away | Tooltip disappears | [ ] |
| 3.4 | Check disabled buttons (Undo, Redo, Navigate, alignment) | Buttons appear dimmed, do not respond to click | [ ] |
| 3.5 | Select a block, then check button states | Link to CAD, Delete, alignment buttons become enabled | [ ] |
| 3.6 | Resize palette narrower | Ribbon scrolls; groups do not overlap | [ ] |
| 3.7 | Resize palette wider | All groups visible without scrolling | [ ] |

## Phase 4: Block Operations (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 4.1 | Click "Block" button (or press **B**) | Type dropdown: Generic ⬜, Electrical ⚡, Mechanical ⚙️, Software 💻 | [ ] |
| 4.2 | Select "Electrical" | Blue Electrical block appears; empty-state CTA disappears | [ ] |
| 4.3 | Press **Insert** — select "Mechanical" | Type dropdown opens again; orange Mechanical block created, offset from first (cascading placement) | [ ] |
| 4.4 | Click a block | Orange selection halo appears around block | [ ] |
| 4.5 | Drag block | Block follows cursor, snaps to 20 px grid | [ ] |
| 4.6 | Double-click block | Inline text editor appears at block position | [ ] |
| 4.7 | Type a new name, press **Enter** | Block label updates; long names word-wrap (max 3 lines, truncates with "…") | [ ] |
| 4.8 | Press **Escape** during inline edit | Edit cancelled, original label remains | [ ] |
| 4.9 | Right-click block → **Type ▸** → change type | Block color changes to match new type | [ ] |
| 4.10 | Right-click → **Status ▸** → cycle all 5 | Dot colors: Placeholder (gray), Planned (light-blue), In-Work (yellow), Implemented (green), Verified (teal) | [ ] |
| 4.11 | Select a block, press **Ctrl+D** | Block duplicated with "(copy)" suffix, offset by one grid step | [ ] |
| 4.12 | Select a block, press **Delete** | Block removed with fade animation | [ ] |
| 4.13 | Select a block, press **Backspace** | Same as Delete — block removed | [ ] |
| 4.14 | Delete a block that has connections | Block AND all its connections removed; no orphan lines remain | [ ] |

## Phase 5: Block Shapes (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 5.1 | Right-click block → **Shape ▸** submenu | 8 shapes listed: Rectangle, Rounded, Diamond, Ellipse, Hexagon, Parallelogram, Cylinder, Triangle | [ ] |
| 5.2 | Set shape → **Rectangle** | Standard rect with corner radius (default) | [ ] |
| 5.3 | Set shape → **Rounded** | Heavily rounded rectangle | [ ] |
| 5.4 | Set shape → **Diamond** | Rotated square / decision diamond | [ ] |
| 5.5 | Set shape → **Ellipse** | Elliptical shape fitting block dimensions | [ ] |
| 5.6 | Set shape → **Hexagon** | Six-sided polygon | [ ] |
| 5.7 | Set shape → **Parallelogram** | Skewed quadrilateral (I/O block) | [ ] |
| 5.8 | Set shape → **Cylinder** | SVG path with elliptical top/bottom caps (storage/database) | [ ] |
| 5.9 | Set shape → **Triangle** | Triangle pointing up | [ ] |
| 5.10 | Open Property Editor → change Shape dropdown | Block shape updates to match dropdown selection | [ ] |

## Phase 6: Connections (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 6.1 | Add two blocks | Both visible on canvas | [ ] |
| 6.2 | Hover a block | Connection port dots appear (left = input, right = output) | [ ] |
| 6.3 | Click the output port dot | Dashed line follows cursor (connection mode) | [ ] |
| 6.4 | Click second block | Cubic Bezier curve drawn between blocks with arrowhead | [ ] |
| 6.5 | Select a block, press **C** | Same connection mode enters | [ ] |
| 6.6 | Right-click block → **Connect to…** | Same connection mode enters | [ ] |
| 6.7 | Press **Escape** during connection mode | Mode cancels; dashed line disappears | [ ] |
| 6.8 | Set type dropdown to **Electrical**, draw | Green (#28a745), 2 px, dash 4,2 | [ ] |
| 6.9 | Set type to **Power**, draw | Red (#dc3545), 3 px, solid | [ ] |
| 6.10 | Set type to **Data**, draw | Blue (#007bff), 2 px, dash 8,4 | [ ] |
| 6.11 | Set type to **Mechanical**, draw | Gray (#6c757d), 2 px, dash 12,6 | [ ] |
| 6.12 | Press **Shift+P** / **Shift+D** / **Shift+E** / **Shift+M** | Dropdown switches to Power / Data / Electrical / Mechanical respectively | [ ] |
| 6.13 | Arrow direction → **Forward** (default) | Arrow at target end only | [ ] |
| 6.14 | Arrow direction → **Bidirectional** | Arrows at both ends | [ ] |
| 6.15 | Arrow direction → **Backward** | Arrow at source end only | [ ] |
| 6.16 | Arrow direction → **None** | No arrowheads | [ ] |
| 6.17 | Click on a connection line | Connection highlighted orange (#FF6B35); click elsewhere deselects | [ ] |
| 6.18 | Select connection, press **Delete** | Connection removed from canvas | [ ] |
| 6.19 | Try connecting a block to itself | Connection rejected (no self-loops) | [ ] |
| 6.20 | Try creating a duplicate connection | Duplicate rejected | [ ] |

## Phase 7: Property Editor (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 7.1 | Right-click block → **Properties…** | Property Editor dialog opens | [ ] |
| 7.2 | Change **Name** field, click Save | Block label updates on canvas | [ ] |
| 7.3 | Change **Type** dropdown, click Save | Block color changes to match type | [ ] |
| 7.4 | Change **Status** dropdown, click Save | Status indicator dot color changes | [ ] |
| 7.5 | Change **Shape** dropdown, click Save | Block shape changes on canvas | [ ] |
| 7.6 | Click **Add Attribute** → fill key and value; add a second row; click ✕ on first row | First attribute removed, second remains | [ ] |
| 7.7 | Click **Cancel** | Changes discarded; block unchanged | [ ] |

## Phase 8: Canvas Navigation (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 8.1 | Click-drag empty canvas area | Canvas pans | [ ] |
| 8.2 | Middle-mouse-button drag | Canvas pans (Fusion-style) | [ ] |
| 8.3 | Scroll mouse wheel | Zooms in/out centered on cursor | [ ] |
| 8.4 | Press **Ctrl+=** / **Ctrl+-** | Zooms in / out | [ ] |
| 8.5 | Press **Ctrl+0** or click **Fit to View** button | All blocks fit within visible area | [ ] |
| 8.6 | Toggle **Snap to Grid** button | OFF → blocks move freely; ON → snap to 20 px grid | [ ] |
| 8.7 | Verify grid pattern | 20 px grid lines visible in SVG background | [ ] |
| 8.8 | Verify minimap visible in bottom-right (160×110 canvas) | Dark overlay with coloured rectangles representing blocks | [ ] |
| 8.9 | Pan or zoom the canvas | Minimap viewport rectangle updates in real-time | [ ] |
| 8.10 | Click on the minimap | Main canvas pans so clicked point is centred | [ ] |
| 8.11 | Click-drag on the minimap | Canvas pans continuously following the mouse | [ ] |
| 8.12 | Press **M** or click **Minimap** button in View ribbon | Minimap hides; press/click again → reappears | [ ] |

## Phase 9: Selection & Grouping (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 9.1 | Click a block | Block selected (orange halo) | [ ] |
| 9.2 | Click empty canvas | Selection clears | [ ] |
| 9.3 | **Ctrl+click** multiple blocks | Each clicked block adds to selection | [ ] |
| 9.4 | Press **Ctrl+A** | All blocks selected | [ ] |
| 9.5 | Press **Escape** | All selections clear | [ ] |
| 9.6 | Click-drag on empty canvas (lasso) | Rubber-band selection rectangle appears | [ ] |
| 9.7 | Release drag | All blocks within lasso are selected | [ ] |
| 9.8 | Select 2+ blocks → click **Create Group** | Dashed boundary rectangle appears around group | [ ] |
| 9.9 | Click **Ungroup** | Boundary removed; blocks independent | [ ] |

## Phase 10: Context Menu (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 10.1 | Right-click a block | Menu shows: Rename, Properties…, Type ▸, Status ▸, Shape ▸, Connect to…, Delete | [ ] |
| 10.2 | Right-click empty canvas | Menu shows: Add Block, Fit to View | [ ] |
| 10.3 | Click **Add Block** from empty-canvas menu | Block type dropdown at right-click position; selecting a type adds block there | [ ] |
| 10.4 | Click **Rename** from block menu | Inline text editor opens on the block | [ ] |
| 10.5 | Click away from open menu | Menu dismisses cleanly | [ ] |

## Phase 11: Search & Filter (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 11.1 | Press **Ctrl+F** | Search input in secondary toolbar is focused | [ ] |
| 11.2 | Type a block name | Matching blocks highlighted; non-matching dimmed to opacity 0.15, non-interactive | [ ] |
| 11.3 | Clear search input | All blocks visible again | [ ] |
| 11.4 | Click **Placeholder** filter button | Only Placeholder-status blocks highlighted | [ ] |
| 11.5 | Click **Implemented** filter button | Only Implemented-status blocks highlighted | [ ] |
| 11.6 | Click **All** filter button | All blocks visible | [ ] |

## Phase 12: Undo / Redo (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 12.1 | Add a block → press **Ctrl+Z** | Block disappears (undo) | [ ] |
| 12.2 | Press **Ctrl+Y** | Block reappears (redo) | [ ] |
| 12.3 | Press **Ctrl+Shift+Z** | Redo works with alt shortcut | [ ] |
| 12.4 | Move a block → **Ctrl+Z** | Block returns to original position | [ ] |
| 12.5 | Delete a connection → **Ctrl+Z** | Connection is restored | [ ] |
| 12.6 | Perform 3 actions, then undo 3 times | State returns to original | [ ] |

## Phase 13: Save / Load / Autosave (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 13.1 | Create diagram with 3+ blocks and connections | Diagram populated | [ ] |
| 13.2 | Press **Ctrl+S** | Success notification; "Last saved" timestamp updates in status bar | [ ] |
| 13.3 | Press **Ctrl+N** | Confirmation prompt → canvas clears | [ ] |
| 13.4 | Press **Ctrl+O** | Previous diagram restored with all blocks and connections | [ ] |
| 13.5 | Close Fusion, reopen, run add-in, **Load** | Diagram persists across sessions | [ ] |
| 13.6 | Click **Save** button in status bar | Diagram saves; timestamp updates | [ ] |
| 13.7 | Enable **Autosave** toggle in status bar | Toggle turns on | [ ] |
| 13.8 | Make a change, wait ~5 seconds | "Last saved" timestamp updates automatically | [ ] |
| 13.9 | Disable **Autosave** | Toggle off; auto-saving stops | [ ] |

## Phase 14: Named Documents (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 14.1 | Press **Ctrl+Shift+S** (Save As) | "Save As" dialog appears with name input | [ ] |
| 14.2 | Type a name, click Save | Success notification; dialog closes | [ ] |
| 14.3 | Modify diagram, Save As with different name | Second named document saved | [ ] |
| 14.4 | Press **Ctrl+Shift+O** (Open Named) | Dialog lists both saved documents | [ ] |
| 14.5 | Click a document name | Diagram loads; dialog closes | [ ] |
| 14.6 | Delete (✕) a document in the list | Document removed from list | [ ] |

## Phase 15: Import (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 15.1 | Click **Import** button in ribbon (Edit group) | Import dialog with Mermaid/CSV radio toggle | [ ] |
| 15.2 | Select **Mermaid** radio | Mermaid textarea visible, CSV areas hidden | [ ] |
| 15.3 | Paste `flowchart TD\n  A[Start] --> B[End]`, click Import | 2 blocks and 1 connection appear | [ ] |
| 15.4 | Click **Cancel** | Dialog closes without importing | [ ] |
| 15.5 | Reopen → select **CSV** radio | Two textareas: Blocks CSV, Connections CSV | [ ] |
| 15.6 | Enter blocks CSV: `name,type,x,y,status` / `PSU,PowerSupply,100,100,Verified` / `MCU,Micro,300,100,Planned` | Text entered | [ ] |
| 15.7 | Enter connections CSV: `from,to,kind,protocol` / `PSU,MCU,electrical,3.3V` | Text entered | [ ] |
| 15.8 | Click **Import** | 2 blocks and 1 connection appear on canvas | [ ] |

## Phase 16: CAD Linking (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 16.1 | Open a Fusion document with components | Document has components in viewport | [ ] |
| 16.2 | Select a block → click **Link to CAD** | Palette hides; Fusion selection prompt appears | [ ] |
| 16.3 | Select a component in viewport | Palette reappears | [ ] |
| 16.4 | Inspect the block | Blue banner with 🔗 icon and component name at top | [ ] |
| 16.5 | Check notification | Toast: "CAD component linked to {block name}" | [ ] |
| 16.6 | Save → Load | CAD link badge persists after reload | [ ] |
| 16.7 | Select block → Link to CAD again | Badge updates to new component | [ ] |
| 16.8 | Linking tab panel → **Start CAD Selection** | Same CAD-link flow triggers | [ ] |
| 16.9 | Cancel CAD selection (Escape in viewport) | Palette returns; toast: "CAD link cancelled" | [ ] |

## Phase 17: Export & Report Validation (5 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 17.1 | Click **Export** in ribbon | Dialog with 11 format checkboxes | [ ] |
| 17.2 | Verify all 11 formats | Markdown, HTML, Pin Map CSV, C Header, BOM CSV, BOM JSON, Assembly MD, Assembly JSON, Connection Matrix, SVG, PDF Report | [ ] |
| 17.3 | Verify defaults | Markdown, HTML, Pin Map CSV, C Header, BOM CSV checked | [ ] |
| 17.4 | Click **Select None** | All 11 unchecked | [ ] |
| 17.5 | Click **Select All** | All 11 checked | [ ] |
| 17.6 | Check only Markdown + HTML | Only 2 checked | [ ] |
| 17.7 | Click **Browse…** | Native folder picker opens; chosen path shown | [ ] |
| 17.8 | Click **Export** | Toast: "Exported 2 files to {path}" | [ ] |
| 17.9 | Open folder | Only `.md` and `.html` present | [ ] |
| 17.10 | Click **Cancel** in dialog | Dialog closes without exporting | [ ] |
| 17.11 | Try exporting with no formats selected | Warning: "Select at least one export format" | [ ] |
| 17.12 | Select All → Export all 11 | Toast reports 11 files exported | [ ] |
| 17.13 | Open `.md`, `.html` reports | Block/connection tables present, properly formatted | [ ] |
| 17.14 | Open remaining 8 files (pin_map.csv, pins.h, bom.csv, bom.json, assembly_sequence.md/.json, connection_matrix.csv, diagram.svg) | All have valid, non-empty content matching diagram data | [ ] |
| 17.15 | Open `diagram.svg` → inspect block shapes | Blocks with non-default shapes (Diamond, Ellipse, Hexagon, etc.) render as their correct shape — not plain rectangles | [ ] |
| 17.16 | Check only PDF Report → click **Export** | `.pdf` file created in export folder | [ ] |
| 17.17 | Open the PDF file | Contains header with title and timestamp, block details table, connection details table, and rule-check results | [ ] |
| 17.18 | Export PDF for diagram with 3+ blocks and connections | PDF has non-trivial multi-page content | [ ] |

## Phase 18: Rule Checking / Validation (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 18.1 | Click **Check Rules** in ribbon | Rule check results appear in panel | [ ] |
| 18.2 | With all blocks set to Placeholder | Implementation completeness warnings reported | [ ] |
| 18.3 | Set one block to Implemented (no attributes/links) | Incomplete implementation warning for that block | [ ] |
| 18.4 | Validation tab: check **Errors** filter → **Run Checks** | Results filtered to errors only | [ ] |
| 18.5 | Check **Warnings** filter | Results filtered to warnings only | [ ] |
| 18.6 | Use category dropdown (All / Power / Data / Hierarchy) | Results filter by selected category | [ ] |

## Phase 19: Hierarchy / Child Diagrams (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 19.1 | Verify breadcrumb shows **"Root"** at top level | Breadcrumb path displays "Root" | [ ] |
| 19.2 | Select block → **Create Child** (or **Ctrl+Shift+N**) | Canvas navigates into child; breadcrumb: "Root › {block name}" | [ ] |
| 19.3 | Add blocks inside child diagram | Blocks visible in child context | [ ] |
| 19.4 | Click **Go Up** (or **Ctrl+Shift+Up**) | Navigates to parent; block shows child indicator (nested squares, bottom-left) | [ ] |
| 19.5 | Select block with child → **Drill Down** (or **Ctrl+Shift+Down**) | Navigates back into child diagram | [ ] |
| 19.6 | Check breadcrumb | Shows "Root › {block name}" | [ ] |
| 19.7 | Navigate Up to root | Breadcrumb returns to "Root" | [ ] |

## Phase 20: Arrange / Layout (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 20.1 | Add 4+ blocks in random positions | Blocks scattered on canvas | [ ] |
| 20.2 | Click **Auto Layout** | Blocks rearranged into organized grid | [ ] |
| 20.3 | Select 3 blocks → click **Align Left** | All 3 left-edge aligned | [ ] |
| 20.4 | Click **Align Center** | Blocks center-aligned horizontally | [ ] |
| 20.5 | Click **Align Right** | Blocks right-edge aligned | [ ] |
| 20.6 | Drag a block near another block's horizontal edge | Blue alignment guide line appears when edges align; block snaps to guide | [ ] |
| 20.7 | Release the dragged block | Alignment guide line disappears | [ ] |
| 20.8 | Drag a block near another block's vertical edge | Vertical alignment guide line appears and block snaps | [ ] |
| 20.9 | Drag a block so its center aligns with another block's center | Center alignment guide line appears | [ ] |
| 20.10 | Drag a block 6+ px away from any alignment edge | No guide line appears (5 px snap tolerance) | [ ] |

## Phase 21: Tab Panels & Status Bar (3 min)

Verify panel structure and status bar elements.
Functional behavior of panel contents is covered in
dedicated phases above.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 21.1 | Click **Home** tab | Panel shows New Diagram / Load Diagram buttons and Quick Tips | [ ] |
| 21.2 | Click **Diagram** tab | Main canvas area shows | [ ] |
| 21.3 | Click **Linking** tab | "Start CAD Selection" button and linking status pill visible | [ ] |
| 21.4 | Click **Validation** tab | Filter checkboxes, category dropdown, "Run Checks" button, results area visible | [ ] |
| 21.5 | Click **Reports** tab | "Export…" button, status pill, path display, file list visible | [ ] |
| 21.6 | Click **Reqs** tab | "Check Requirements" button, status pill "Not checked", and empty-state message visible | [ ] |
| 21.7 | Add block-level requirements → click **Check Requirements** | Results table appears with columns: Status (✅/❌), Requirement, Actual, Op, Target, Unit | [ ] |
| 21.8 | Verify passing requirements show green ✅ | Failing requirements show red ❌; status pill updates | [ ] |
| 21.9 | Click **History** tab | Snapshot description input, "Create Snapshot" button, "Refresh" button, and "No snapshots yet." message visible | [ ] |
| 21.10 | Type a description → click **Create Snapshot** | Snapshot appears in list with description and timestamp | [ ] |
| 21.11 | Create a second snapshot | Both listed (most recent first) | [ ] |
| 21.12 | Click **Restore** on an older snapshot | Diagram reverts to that snapshot's state | [ ] |
| 21.13 | Click **Refresh** | Snapshot list refreshes from backend | [ ] |
| 21.14 | Check **Bridge** pill in status bar | "connected" (green) when bridge active; "offline" (red) otherwise | [ ] |
| 21.15 | Check **Health** pill | Displays status (e.g., "OK" or "Issues detected") | [ ] |
| 21.16 | Check **Last Saved** pill | Timestamp shown (updates after each save) | [ ] |

## Phase 22: Visual Verification (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 22.1 | Check **status legend** at canvas bottom | Shows all 5 statuses with correct colors | [ ] |
| 22.2 | Check **connection legend** | Power (red), Data (blue), Electrical (green), Mechanical (gray) + arrow direction types | [ ] |
| 22.3 | Verify arrow sizes across connections | Arrows same size regardless of connection line width (fixed 10×7 markers) | [ ] |
| 22.4 | Verify status indicator dots | Colored circle (r=6) with subtle stroke at top-right of each block | [ ] |
| 22.5 | Add a new block | Scale+fade-in animation plays on appearance | [ ] |
| 22.6 | Add 3+ connections to the same port | Connections fan out vertically (no overlap) | [ ] |
| 22.7 | Trigger Save → observe loading overlay | Spinner with "Saving diagram…" message appears and disappears on completion | [ ] |
| 22.8 | Trigger Export → observe loading overlay | Spinner with "Exporting reports…" message appears; overlay blocks user interaction | [ ] |
| 22.9 | If an async operation fails | Spinner disappears and error notification shown (spinner does not get stuck) | [ ] |

## Phase 23: Edge Cases & Error Handling (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 23.1 | Load with no saved diagram | Notification: "No saved diagram found" or empty canvas | [ ] |
| 23.2 | Export with empty diagram (0 blocks) | Export succeeds (empty reports) or clear error message | [ ] |
| 23.3 | Create block → delete → **Undo** | Block restored by undo | [ ] |
| 23.4 | Link to CAD with no block selected | Warning: "Select a block first to link CAD" | [ ] |
| 23.5 | Save As with empty name | Validation error — name required | [ ] |
| 23.6 | Open Named when no documents exist | Empty state or "No documents" message | [ ] |
| 23.7 | Focus a text input → press **B** or **Delete** | Shortcut suppressed — character types normally (no block created or deleted) | [ ] |

## Phase 24: Performance & Stress (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 24.1 | Create 20+ blocks rapidly | All blocks render without noticeable lag | [ ] |
| 24.2 | Connect all 20 blocks in a chain | All connections render correctly | [ ] |
| 24.3 | Select All → drag | All blocks move together smoothly | [ ] |
| 24.4 | Save large diagram → Load | Complete in < 3 seconds | [ ] |
| 24.5 | Auto Layout on 20+ blocks | Layout completes without freezing | [ ] |

## Phase 25: Annotations (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 25.1 | Click **Text** button in Annotate ribbon group | Text annotation created on canvas at default/offset position | [ ] |
| 25.2 | Double-click text annotation | Inline editor opens; type new text, press **Enter** | [ ] |
| 25.3 | Click **Note** button | Note annotation (yellow/styled) created on canvas | [ ] |
| 25.4 | Click **Dimension** button | Dimension annotation (measurement-style) created | [ ] |
| 25.5 | Click **Callout** button | Callout annotation (highlighted/boxed) created | [ ] |
| 25.6 | Select annotation → press **Delete** | Annotation removed from canvas | [ ] |

## Phase 26: Keyboard Shortcuts Help (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 26.1 | Press **?** (Shift+/) | Keyboard shortcuts overlay dialog appears | [ ] |
| 26.2 | Inspect dialog content | Shortcuts grouped by category (File, Edit, Create, Navigate, View, Selection, Connection Types) with correct key bindings | [ ] |
| 26.3 | Verify **M** → "Toggle Minimap" listed under View | Entry present | [ ] |
| 26.4 | Press **?** again or click **×** button | Dialog closes | [ ] |

## Phase 27: Crash Recovery (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 27.1 | Create a diagram with 3+ blocks (do NOT save) | Diagram has unsaved changes | [ ] |
| 27.2 | Wait ~30 seconds | Auto-backup timer fires (internal; no visible UI) | [ ] |
| 27.3 | Force-close the palette (simulate crash) | Palette closes | [ ] |
| 27.4 | Reopen the add-in palette | Recovery prompt appears: "Recover unsaved diagram?" | [ ] |
| 27.5 | Click **Recover** | Previous diagram restored with blocks and connections | [ ] |

## Phase 28: Unsaved Changes Warning (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 28.1 | Create or modify a diagram (do NOT save) | Canvas has unsaved changes | [ ] |
| 28.2 | Attempt to close the palette | Browser-level "unsaved changes" confirmation dialog appears | [ ] |
| 28.3 | Cancel the close | Palette remains open; diagram intact | [ ] |
| 28.4 | Save the diagram, then close | No warning — palette closes cleanly | [ ] |

## Phase 29: Accessibility (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 29.1 | Inspect ribbon buttons with dev tools | All buttons have `aria-label` attributes | [ ] |
| 29.2 | Inspect modal dialogs | Dialogs have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to title | [ ] |
| 29.3 | Open a modal → press **Tab** | Focus cycles through interactive elements inside the modal | [ ] |
| 29.4 | Press **Escape** inside a modal | Modal closes and focus returns to canvas | [ ] |
| 29.5 | Check minimap container | Has `aria-hidden="true"` (decorative canvas) | [ ] |
| 29.6 | Perform an action (e.g. add block) → inspect `#aria-live-announcer` | Screen reader live region announces the change (e.g., "Block added") | [ ] |
| 29.7 | Enable high-contrast mode in OS settings | Ribbon buttons show increased border visibility and brighter focus outlines per `@media (prefers-contrast: more)` rules | [ ] |
| 29.8 | Tab through ribbon buttons with keyboard | `:focus-visible` outline indicator appears on each focused button | [ ] |
| 29.9 | Use Left/Right arrow keys in tab bar | Focus moves between tabs; `aria-selected` attribute updates on the focused tab | [ ] |

## Phase 30: Orthogonal Routing & Waypoints (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 30.1 | Click **Ortho** toggle button in View ribbon | Notification shows "Routing: Orthogonal"; button appears highlighted/active | [ ] |
| 30.2 | Draw a connection between two blocks | Connection renders with right-angle segments only (no curves) | [ ] |
| 30.3 | Place a third block between two connected blocks | Orthogonal route recalculates to avoid the obstacle | [ ] |
| 30.4 | Move a connected block | Orthogonal path recalculates around obstacles | [ ] |
| 30.5 | Click **Ortho** toggle again | Notification shows "Routing: Bezier"; connections revert to cubic Bezier curves | [ ] |
| 30.6 | In orthogonal mode, double-click a connection | Waypoint handle appears on the connection | [ ] |
| 30.7 | Drag a waypoint handle to a new position | Route bends through the new waypoint position | [ ] |
| 30.8 | Right-click a waypoint handle | Waypoint is removed; route recalculates | [ ] |

## Phase 31: Undo History Panel (3 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 31.1 | Click **History** button in Edit ribbon group | Undo history panel opens on the right side | [ ] |
| 31.2 | Verify initial state entry | "Initial state" entry with 🏁 icon shown | [ ] |
| 31.3 | Add a block | "Add block" entry with ➕ icon appears at top of history list | [ ] |
| 31.4 | Delete a block | "Delete block" entry with 🗑️ icon appears | [ ] |
| 31.5 | Rename a block | "Rename block" entry with ✏️ icon appears | [ ] |
| 31.6 | Inspect time labels on entries | Each entry shows a time-ago label (e.g., "now", "5s ago") | [ ] |
| 31.7 | Verify current state entry | Current state entry is highlighted / distinguished from others | [ ] |
| 31.8 | Undo an action → inspect panel | Current-state highlight moves up one entry; undone entry is dimmed (redo at 0.45 opacity) | [ ] |
| 31.9 | Click an earlier entry in the history panel | Diagram jumps to that state (jumpToState) | [ ] |
| 31.10 | Check entry count label | Label updates accurately (e.g., "(5/50)") | [ ] |
| 31.11 | Click the × close button on the panel | Panel hides | [ ] |

## Phase 32: Connection Context Menu (2 min)

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 32.1 | Right-click a connection line | Context menu shows: Type ▸, Direction ▸, Select Connected Blocks, Delete | [ ] |
| 32.2 | Inspect the connection while menu is open | Connection highlighted orange while menu is visible | [ ] |
| 32.3 | Click **Type ▸ → Power** | Connection changes to red, 3 px solid | [ ] |
| 32.4 | Click **Type ▸ → Data** | Connection changes to blue, dash 8,4 | [ ] |
| 32.5 | Click **Direction ▸ → Bidirectional** | Arrows appear at both ends of the connection | [ ] |
| 32.6 | Click **Direction ▸ → None** | No arrowheads on the connection | [ ] |
| 32.7 | Click **Select Connected Blocks** | Both endpoint blocks become selected | [ ] |
| 32.8 | Click **Delete** | Connection is removed from the canvas | [ ] |
| 32.9 | Click away from the open context menu | Menu dismisses; connection highlight clears | [ ] |

## Phase 33: Schema Versioning & Migration (5 min)

### Prerequisites

- A diagram with at least two blocks and one connection already exists.

### Steps

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 33.1 | **Inspect saved data for schema version.** (1) Save the current diagram with **Save** (Ctrl+S). (2) In the Fusion 360 Text Commands panel click **Scripts → Show API Messages**. (3) In the ribbon click **Open** (Ctrl+O) to reload the diagram — watch the Text Commands output for the JSON payload. (4) Inside the JSON look for the key `"schemaVersion"`. | The saved data contains `"schemaVersion": "1.0"` at the top level of the JSON object. | [ ] |
| 33.2 | **Load a valid v1.0 diagram.** (1) Using the same saved diagram from 33.1, close the palette and re-open it. (2) Click **Open** and load the diagram. (3) Verify the block count and connections match what was saved. | Diagram loads without errors; block count and connections are preserved; no "migration" or "upgrade" notification appears. | [ ] |
| 33.3 | **Load a pre-versioned diagram (no schemaVersion).** (1) Using the Import button, paste the following minimal JSON and click Import: `{"blocks":[{"id":"b1","name":"Test","type":"Generic","status":"Placeholder","x":100,"y":100,"width":120,"height":80,"interfaces":[]}],"connections":[]}` — note this JSON has no `schemaVersion` field. (2) After import, save the diagram. (3) Re-open it and inspect the JSON in Text Commands. | Diagram imports and loads successfully. After save, the persisted JSON now contains `"schemaVersion": "1.0"` and a `"requirements"` array (added by silent migration). | [ ] |
| 33.4 | **Validation reports invalid schema version.** (1) Using the Import button, paste: `{"schemaVersion":"99.0","blocks":[],"connections":[]}` and click Import. (2) Click **Check Rules** in the ribbon. | The rule check results include a warning or error indicating the schema version is unrecognised or unsupported. | [ ] |

## Quick Smoke Test

Minimal 3-step validation for quick checks:

1. [ ] Add-in loads without errors
2. [ ] "Run Diagnostics" shows 32/32 passed
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
| 4 | Block Operations | 14 | _ | _ |
| 5 | Block Shapes | 10 | _ | _ |
| 6 | Connections | 20 | _ | _ |
| 7 | Property Editor | 7 | _ | _ |
| 8 | Canvas Navigation | 12 | _ | _ |
| 9 | Selection & Grouping | 9 | _ | _ |
| 10 | Context Menu | 5 | _ | _ |
| 11 | Search & Filter | 6 | _ | _ |
| 12 | Undo / Redo | 6 | _ | _ |
| 13 | Save / Load / Autosave | 9 | _ | _ |
| 14 | Named Documents | 6 | _ | _ |
| 15 | Import | 8 | _ | _ |
| 16 | CAD Linking | 9 | _ | _ |
| 17 | Export & Report Validation | 18 | _ | _ |
| 18 | Rule Checking / Validation | 6 | _ | _ |
| 19 | Hierarchy / Child Diagrams | 7 | _ | _ |
| 20 | Arrange / Layout | 10 | _ | _ |
| 21 | Tab Panels & Status Bar | 16 | _ | _ |
| 22 | Visual Verification | 9 | _ | _ |
| 23 | Edge Cases & Errors | 7 | _ | _ |
| 24 | Performance & Stress | 5 | _ | _ |
| 25 | Annotations | 6 | _ | _ |
| 26 | Keyboard Shortcuts Help | 4 | _ | _ |
| 27 | Crash Recovery | 5 | _ | _ |
| 28 | Unsaved Changes Warning | 4 | _ | _ |
| 29 | Accessibility | 9 | _ | _ |
| 30 | Orthogonal Routing & Waypoints | 8 | _ | _ |
| 31 | Undo History Panel | 11 | _ | _ |
| 32 | Connection Context Menu | 9 | _ | _ |
| 33 | Schema Versioning & Migration | 4 | _ | _ |
| **TOTAL** | | **273** | _ | _ |

**Tested By**: _________________ **Date**: _________________

**Fusion 360 Version**: _________________

**OS**: _________________

**Overall Result**: [ ] PASS / [ ] FAIL

**Notes**:
