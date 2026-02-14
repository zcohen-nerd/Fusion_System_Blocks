# Fusion 360 Regression Retest Plan

Focused retest covering only the phases that had failures
during the previous full manual test run (Feb 2026).
Phases that passed fully have been removed.
Estimated total time: **45–55 min**.

**Fixes applied:** Issues #33–#59 (26 fixes in commit c4b69f4).

## Prerequisites

- [ ] Fusion 360 installed and running
- [ ] Add-in deployed to
  `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\`
- [ ] Fusion 360 restarted after deployment
- [ ] A Fusion document with at least 3 components is open

## Phases Removed (Passed Previously)

The following phases passed all steps last time and are
excluded from this retest: Add-in Loading, Diagnostics,
Block Operations, Property Editor, Save/Load/Autosave,
Named Documents, Rule Checking, Visual Verification,
Edge Cases & Errors, Performance & Stress, Keyboard
Shortcuts Help, Crash Recovery, Connection Context Menu.

---

## Phase 1: Ribbon UI (5 min)

> **Fix verified:** #56 — Two-tier tooltips now appear on
> hover (0.5 s brief, 2 s expanded with description and
> shortcut).

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 1.1 | Inspect ribbon groups | 10 groups visible: File, Edit, Create, Navigate, Select, Arrange, Annotate, View, Validate, Links | [ ] |
| 1.2 | Hover any ribbon button for ~0.5 s | Tier-1 tooltip appears with button name | [ ] |
| 1.3 | Keep hovering for ~2 s total | Tooltip expands to show description + keyboard shortcut | [ ] |
| 1.4 | Move mouse away | Tooltip disappears | [ ] |
| 1.5 | Check disabled buttons (Undo, Redo, Navigate, alignment) | Buttons appear dimmed, do not respond to click | [ ] |
| 1.6 | Select a block, then check button states | Link to CAD, Delete, alignment buttons become enabled | [ ] |
| 1.7 | Resize palette narrower | Ribbon scrolls; groups do not overlap | [ ] |
| 1.8 | Resize palette wider | All groups visible without scrolling | [ ] |

## Phase 2: Block Shapes (5 min)

> **Fixes verified:** #33 — Cylinder renders with elliptical
> top/bottom caps. #34 — Triangle text is vertically centred.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 2.1 | Right-click block → **Shape ▸** submenu | 8 shapes listed: Rectangle, Rounded, Diamond, Ellipse, Hexagon, Parallelogram, Cylinder, Triangle | [ ] |
| 2.2 | Set shape → **Rectangle** | Standard rect with corner radius (default) | [ ] |
| 2.3 | Set shape → **Rounded** | Heavily rounded rectangle | [ ] |
| 2.4 | Set shape → **Diamond** | Rotated square / decision diamond | [ ] |
| 2.5 | Set shape → **Ellipse** | Elliptical shape fitting block dimensions | [ ] |
| 2.6 | Set shape → **Hexagon** | Six-sided polygon | [ ] |
| 2.7 | Set shape → **Parallelogram** | Skewed quadrilateral (I/O block) | [ ] |
| 2.8 | Set shape → **Cylinder** | SVG path with elliptical top/bottom caps (storage/database) | [ ] |
| 2.9 | Set shape → **Triangle** | Triangle pointing up; text centred vertically inside shape | [ ] |
| 2.10 | Open Property Editor → change Shape dropdown | Block shape updates to match dropdown selection | [ ] |

## Phase 3: Connections (5 min)

> **Fixes verified:** #35 — Connection-type controls update
> after changing dropdown. #36 — Backward and bidirectional
> arrows render correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 3.1 | Add two blocks | Both visible on canvas | [ ] |
| 3.2 | Hover a block | Connection port dots appear (left = input, right = output) | [ ] |
| 3.3 | Click the output port dot | Dashed line follows cursor (connection mode) | [ ] |
| 3.4 | Click second block | Cubic Bezier curve drawn between blocks with arrowhead | [ ] |
| 3.5 | Select a block, press **C** | Same connection mode enters | [ ] |
| 3.6 | Right-click block → **Connect to…** | Same connection mode enters | [ ] |
| 3.7 | Press **Escape** during connection mode | Mode cancels; dashed line disappears | [ ] |
| 3.8 | Set type dropdown to **Electrical**, draw | Green (#28a745), 2 px, dash 4,2 | [ ] |
| 3.9 | Set type to **Power**, draw | Red (#dc3545), 3 px, solid | [ ] |
| 3.10 | Set type to **Data**, draw | Blue (#007bff), 2 px, dash 8,4 | [ ] |
| 3.11 | Set type to **Mechanical**, draw | Gray (#6c757d), 2 px, dash 12,6 | [ ] |
| 3.12 | Press **Shift+P** / **Shift+D** / **Shift+E** / **Shift+M** | Dropdown switches to Power / Data / Electrical / Mechanical respectively | [ ] |
| 3.13 | Arrow direction → **Forward** (default) | Arrow at target end only | [ ] |
| 3.14 | Arrow direction → **Bidirectional** | Arrows at both ends | [ ] |
| 3.15 | Arrow direction → **Backward** | Arrow at source end only | [ ] |
| 3.16 | Arrow direction → **None** | No arrowheads | [ ] |
| 3.17 | Click on a connection line | Connection highlighted orange (#FF6B35); click elsewhere deselects | [ ] |
| 3.18 | Select connection, press **Delete** | Connection removed from canvas | [ ] |
| 3.19 | Try connecting a block to itself | Connection rejected (no self-loops) | [ ] |
| 3.20 | Try creating a duplicate connection | Duplicate rejected | [ ] |

## Phase 4: Canvas Navigation (3 min)

> **Fix verified:** #37 — Snap-to-grid toggle shows visual
> active/inactive state.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 4.1 | Click-drag empty canvas area | Canvas pans | [ ] |
| 4.2 | Middle-mouse-button drag | Canvas pans (Fusion-style) | [ ] |
| 4.3 | Scroll mouse wheel | Zooms in/out centered on cursor | [ ] |
| 4.4 | Press **Ctrl+=** / **Ctrl+-** | Zooms in / out | [ ] |
| 4.5 | Press **Ctrl+0** or click **Fit to View** button | All blocks fit within visible area | [ ] |
| 4.6 | Toggle **Snap to Grid** button | OFF → button appears inactive, blocks move freely; ON → button highlighted, snap to 20 px grid | [ ] |
| 4.7 | Verify grid pattern | 20 px grid lines visible in SVG background | [ ] |
| 4.8 | Verify minimap visible in bottom-right (160×110 canvas) | Dark overlay with coloured rectangles representing blocks | [ ] |
| 4.9 | Pan or zoom the canvas | Minimap viewport rectangle updates in real-time | [ ] |
| 4.10 | Click on the minimap | Main canvas pans so clicked point is centred | [ ] |
| 4.11 | Click-drag on the minimap | Canvas pans continuously following the mouse | [ ] |
| 4.12 | Press **M** or click **Minimap** button in View ribbon | Minimap hides; press/click again → reappears | [ ] |

## Phase 5: Selection & Grouping (3 min)

> **Fixes verified:** #38 — Ctrl+A highlights all blocks.
> #39 — Lasso doesn't select text. #40 — Lasso selects
> multiple blocks. #41 — Ungroup button enables correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 5.1 | Click a block | Block selected (orange halo) | [ ] |
| 5.2 | Click empty canvas | Selection clears | [ ] |
| 5.3 | **Ctrl+click** multiple blocks | Each clicked block adds to selection | [ ] |
| 5.4 | Press **Ctrl+A** | All blocks selected with orange highlight | [ ] |
| 5.5 | Press **Escape** | All selections clear | [ ] |
| 5.6 | Click-drag on empty canvas (lasso) | Rubber-band selection rectangle appears; text not inadvertently selected | [ ] |
| 5.7 | Release drag | All blocks within lasso are selected | [ ] |
| 5.8 | Select 2+ blocks → click **Create Group** | Dashed boundary rectangle appears around group | [ ] |
| 5.9 | Click **Ungroup** | Button is enabled; boundary removed; blocks independent | [ ] |

## Phase 6: Context Menu (2 min)

> **Fix verified:** #42 — "Add Block" from empty-canvas
> context menu shows type dropdown and places block at
> right-click position.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 6.1 | Right-click a block | Menu shows: Rename, Properties…, Type ▸, Status ▸, Shape ▸, Connect to…, Delete | [ ] |
| 6.2 | Right-click empty canvas | Menu shows: Add Block, Fit to View | [ ] |
| 6.3 | Click **Add Block** from empty-canvas menu | Block type dropdown at right-click position; selecting a type adds block there | [ ] |
| 6.4 | Click **Rename** from block menu | Inline text editor opens on the block | [ ] |
| 6.5 | Click away from open menu | Menu dismisses cleanly | [ ] |

## Phase 7: Search & Filter (3 min)

> **Fix verified:** #43 — Status filter buttons highlight
> all 5 statuses correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 7.1 | Press **Ctrl+F** | Search input in secondary toolbar is focused | [ ] |
| 7.2 | Type a block name | Matching blocks highlighted; non-matching dimmed to opacity 0.15, non-interactive | [ ] |
| 7.3 | Clear search input | All blocks visible again | [ ] |
| 7.4 | Click **Placeholder** filter button | Only Placeholder-status blocks highlighted | [ ] |
| 7.5 | Click **Implemented** filter button | Only Implemented-status blocks highlighted | [ ] |
| 7.6 | Click **All** filter button | All blocks visible | [ ] |

## Phase 8: Undo / Redo (3 min)

> **Fix verified:** #44 — Undo correctly reverts block
> moves.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 8.1 | Add a block → press **Ctrl+Z** | Block disappears (undo) | [ ] |
| 8.2 | Press **Ctrl+Y** | Block reappears (redo) | [ ] |
| 8.3 | Press **Ctrl+Shift+Z** | Redo works with alt shortcut | [ ] |
| 8.4 | Move a block → **Ctrl+Z** | Block returns to original position | [ ] |
| 8.5 | Delete a connection → **Ctrl+Z** | Connection is restored | [ ] |
| 8.6 | Perform 3 actions, then undo 3 times | State returns to original | [ ] |

## Phase 9: Import (3 min)

> **Fix verified:** #45 — Import button click handler
> fires correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 9.1 | Click **Import** button in ribbon (Edit group) | Import dialog with Mermaid/CSV radio toggle | [ ] |
| 9.2 | Select **Mermaid** radio | Mermaid textarea visible, CSV areas hidden | [ ] |
| 9.3 | Paste `flowchart TD\n  A[Start] --> B[End]`, click Import | 2 blocks and 1 connection appear | [ ] |
| 9.4 | Click **Cancel** | Dialog closes without importing | [ ] |
| 9.5 | Reopen → select **CSV** radio | Two textareas: Blocks CSV, Connections CSV | [ ] |
| 9.6 | Enter blocks CSV: `name,type,x,y,status` / `PSU,PowerSupply,100,100,Verified` / `MCU,Micro,300,100,Planned` | Text entered | [ ] |
| 9.7 | Enter connections CSV: `from,to,kind,protocol` / `PSU,MCU,electrical,3.3V` | Text entered | [ ] |
| 9.8 | Click **Import** | 2 blocks and 1 connection appear on canvas | [ ] |

## Phase 10: CAD Linking (5 min)

> **Fix verified:** #46 — Cancelling CAD selection
> (Escape) restores the palette.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 10.1 | Open a Fusion document with components | Document has components in viewport | [ ] |
| 10.2 | Select a block → click **Link to CAD** | Palette hides; Fusion selection prompt appears | [ ] |
| 10.3 | Select a component in viewport | Palette reappears | [ ] |
| 10.4 | Inspect the block | Blue banner with 🔗 icon and component name at top | [ ] |
| 10.5 | Check notification | Toast: "CAD component linked to {block name}" | [ ] |
| 10.6 | Save → Load | CAD link badge persists after reload | [ ] |
| 10.7 | Select block → Link to CAD again | Badge updates to new component | [ ] |
| 10.8 | Linking tab panel → **Start CAD Selection** | Same CAD-link flow triggers | [ ] |
| 10.9 | Cancel CAD selection (Escape in viewport) | Palette returns; toast: "CAD link cancelled" | [ ] |

## Phase 11: Export & Report Validation (5 min)

> **Fixes verified:** #47 — Export no longer fails due to
> connection data format mismatch. #57 — Reports now include
> executive summary with completion %, CAD coverage, orphan
> count, and protocol distribution.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 11.1 | Click **Export** in ribbon | Dialog with 11 format checkboxes | [ ] |
| 11.2 | Verify all 11 formats | Markdown, HTML, Pin Map CSV, C Header, BOM CSV, BOM JSON, Assembly MD, Assembly JSON, Connection Matrix, SVG, PDF Report | [ ] |
| 11.3 | Verify defaults | Markdown, HTML, Pin Map CSV, C Header, BOM CSV checked | [ ] |
| 11.4 | Click **Select None** | All 11 unchecked | [ ] |
| 11.5 | Click **Select All** | All 11 checked | [ ] |
| 11.6 | Check only Markdown + HTML | Only 2 checked | [ ] |
| 11.7 | Click **Browse…** | Native folder picker opens; chosen path shown | [ ] |
| 11.8 | Click **Export** | Toast: "Exported 2 files to {path}" | [ ] |
| 11.9 | Open folder | Only `.md` and `.html` present | [ ] |
| 11.10 | Click **Cancel** in dialog | Dialog closes without exporting | [ ] |
| 11.11 | Try exporting with no formats selected | Warning: "Select at least one export format" | [ ] |
| 11.12 | Select All → Export all 11 | Toast reports 11 files exported | [ ] |
| 11.13 | Open `.md` report | Executive Summary table with completion %, CAD link coverage, orphan count, protocol breakdown; block and connection tables present | [ ] |
| 11.14 | Open `.html` report | Same executive summary with visual progress bar; professional formatting with print-ready CSS | [ ] |
| 11.15 | Open remaining 8 files | All have valid, non-empty content matching diagram data | [ ] |
| 11.16 | Open `diagram.svg` → inspect block shapes | Blocks with non-default shapes render as correct shape | [ ] |
| 11.17 | Check only PDF Report → Export | `.pdf` file created | [ ] |
| 11.18 | Open the PDF file | Contains header, block details, connections, rule-check results | [ ] |

## Phase 12: Hierarchy / Child Diagrams (3 min)

> **Fix verified:** #48 — Child diagram data persists
> across save/load cycles.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 12.1 | Verify breadcrumb shows **"Root"** at top level | Breadcrumb path displays "Root" | [ ] |
| 12.2 | Select block → **Create Child** (or **Ctrl+Shift+N**) | Canvas navigates into child; breadcrumb: "Root › {block name}" | [ ] |
| 12.3 | Add blocks inside child diagram | Blocks visible in child context | [ ] |
| 12.4 | Click **Go Up** (or **Ctrl+Shift+Up**) | Navigates to parent; block shows child indicator (nested squares, bottom-left) | [ ] |
| 12.5 | Select block with child → **Drill Down** (or **Ctrl+Shift+Down**) | Navigates back into child diagram | [ ] |
| 12.6 | Save → Load → drill into child | Child diagram data preserved after save/load | [ ] |
| 12.7 | Navigate Up to root | Breadcrumb returns to "Root" | [ ] |

## Phase 13: Arrange / Layout (3 min)

> **Fix verified:** #49 — Triangle alignment guides work
> via bounding-box coordinates (same as all shapes).

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 13.1 | Add 4+ blocks in random positions | Blocks scattered on canvas | [ ] |
| 13.2 | Click **Auto Layout** | Blocks rearranged into organized grid | [ ] |
| 13.3 | Select 3 blocks → click **Align Left** | All 3 left-edge aligned | [ ] |
| 13.4 | Click **Align Center** | Blocks center-aligned horizontally | [ ] |
| 13.5 | Click **Align Right** | Blocks right-edge aligned | [ ] |
| 13.6 | Drag a block near another block's horizontal edge | Blue alignment guide line appears when edges align; block snaps to guide | [ ] |
| 13.7 | Release the dragged block | Alignment guide line disappears | [ ] |
| 13.8 | Drag a block near another block's vertical edge | Vertical alignment guide line appears and block snaps | [ ] |
| 13.9 | Set one block to **Triangle** shape, drag near another | Alignment guides work correctly for triangle shape | [ ] |
| 13.10 | Drag a block 6+ px away from any alignment edge | No guide line appears (5 px snap tolerance) | [ ] |

## Phase 14: Tab Panels & Status Bar (3 min)

> **Fix verified:** #50 — Tab bar now visible below ribbon
> with 7 clickable tabs. Panels show/hide correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 14.1 | Click **Home** tab | Panel shows New Diagram / Load Diagram buttons and Quick Tips; canvas hides | [ ] |
| 14.2 | Click **Diagram** tab | Main canvas area shows; panel hides | [ ] |
| 14.3 | Click **Linking** tab | "Start CAD Selection" button and linking status pill visible | [ ] |
| 14.4 | Click **Validation** tab | Filter checkboxes, category dropdown, "Run Checks" button, results area visible | [ ] |
| 14.5 | Click **Reports** tab | "Export…" button, status pill, path display, file list visible | [ ] |
| 14.6 | Click **Reqs** tab | "Check Requirements" button, status pill "Not checked", and empty-state message visible | [ ] |
| 14.7 | Add block-level requirements → click **Check Requirements** | Results table appears with columns: Status (✅/❌), Requirement, Actual, Op, Target, Unit | [ ] |
| 14.8 | Verify passing requirements show green ✅ | Failing requirements show red ❌; status pill updates | [ ] |
| 14.9 | Click **History** tab | Snapshot description input, "Create Snapshot" button, "Refresh" button, and "No snapshots yet." message visible | [ ] |
| 14.10 | Type a description → click **Create Snapshot** | Snapshot appears in list with description and timestamp | [ ] |
| 14.11 | Create a second snapshot | Both listed (most recent first) | [ ] |
| 14.12 | Click **Restore** on an older snapshot | Diagram reverts to that snapshot's state | [ ] |
| 14.13 | Click **Refresh** | Snapshot list refreshes from backend | [ ] |
| 14.14 | Check **Bridge** pill in status bar | "connected" (green) when bridge active; "offline" (red) otherwise | [ ] |
| 14.15 | Check **Health** pill | Displays status (e.g., "OK" or "Issues detected") | [ ] |
| 14.16 | Check **Last Saved** pill | Timestamp shown (updates after each save) | [ ] |

## Phase 15: Annotations (3 min)

> **Fix verified:** #51 — All four annotation types (text,
> note, dimension, callout) are implemented and render on
> canvas.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 15.1 | Click **Text** button in Annotate ribbon group | Text annotation created on canvas at default/offset position | [ ] |
| 15.2 | Double-click text annotation | Inline editor opens; type new text, press **Enter** | [ ] |
| 15.3 | Click **Note** button | Note annotation (yellow/styled) created on canvas | [ ] |
| 15.4 | Click **Dimension** button | Dimension annotation (measurement-style) created | [ ] |
| 15.5 | Click **Callout** button | Callout annotation (highlighted/boxed) created | [ ] |
| 15.6 | Select annotation → press **Delete** | Annotation removed from canvas | [ ] |

## Phase 16: Unsaved Changes Warning (2 min)

> **Fix verified:** #52 — Dirty flag tracks unsaved changes
> for beforeunload prompt.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 16.1 | Create or modify a diagram (do NOT save) | Canvas has unsaved changes | [ ] |
| 16.2 | Attempt to close the palette | Browser-level "unsaved changes" confirmation dialog appears | [ ] |
| 16.3 | Cancel the close | Palette remains open; diagram intact | [ ] |
| 16.4 | Save the diagram, then close | No warning — palette closes cleanly | [ ] |

## Phase 17: Accessibility (2 min)

> **Fix verified:** #53 — ARIA attributes on dialogs,
> focus-visible outlines, high-contrast media query,
> arrow-key tab navigation, Escape closes modals.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 17.1 | Inspect ribbon buttons with dev tools | All buttons have `aria-label` attributes | [ ] |
| 17.2 | Inspect modal dialogs | Dialogs have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to title | [ ] |
| 17.3 | Open a modal → press **Tab** | Focus cycles through interactive elements inside the modal | [ ] |
| 17.4 | Press **Escape** inside a modal | Modal closes and focus returns to canvas | [ ] |
| 17.5 | Check minimap container | Has `aria-hidden="true"` (decorative canvas) | [ ] |
| 17.6 | Perform an action (e.g. add block) → inspect `#aria-live-announcer` | Screen reader live region announces the change (e.g., "Block added") | [ ] |
| 17.7 | Enable high-contrast mode in OS settings | Ribbon buttons show increased border visibility and brighter focus outlines per `@media (prefers-contrast: more)` rules | [ ] |
| 17.8 | Tab through ribbon buttons with keyboard | `:focus-visible` outline indicator appears on each focused button | [ ] |
| 17.9 | Use Left/Right arrow keys in tab bar | Focus moves between tabs; `aria-selected` attribute updates on the focused tab | [ ] |

## Phase 18: Orthogonal Routing & Waypoints (3 min)

> **Fix verified:** #54 — Moving any block in orthogonal
> mode re-renders all connections (obstacle avoidance).

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 18.1 | Click **Ortho** toggle button in View ribbon | Notification shows "Routing: Orthogonal"; button appears highlighted/active | [ ] |
| 18.2 | Draw a connection between two blocks | Connection renders with right-angle segments only (no curves) | [ ] |
| 18.3 | Place a third block between two connected blocks | Orthogonal route recalculates to avoid the obstacle | [ ] |
| 18.4 | Move a connected block | Orthogonal path recalculates around obstacles | [ ] |
| 18.5 | Click **Ortho** toggle again | Notification shows "Routing: Bezier"; connections revert to cubic Bezier curves | [ ] |
| 18.6 | In orthogonal mode, double-click a connection | Waypoint handle appears on the connection | [ ] |
| 18.7 | Drag a waypoint handle to a new position | Route bends through the new waypoint position | [ ] |
| 18.8 | Right-click a waypoint handle | Waypoint is removed; route recalculates | [ ] |

## Phase 19: Undo History Panel (3 min)

> **Fix verified:** #55 — History button now in Edit ribbon
> group; click handler fires correctly.

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 19.1 | Click **History** button in Edit ribbon group | Undo history panel opens on the right side | [ ] |
| 19.2 | Verify initial state entry | "Initial state" entry with 🏁 icon shown | [ ] |
| 19.3 | Add a block | "Add block" entry with ➕ icon appears at top of history list | [ ] |
| 19.4 | Delete a block | "Delete block" entry with 🗑️ icon appears | [ ] |
| 19.5 | Rename a block | "Rename block" entry with ✏️ icon appears | [ ] |
| 19.6 | Inspect time labels on entries | Each entry shows a time-ago label (e.g., "now", "5s ago") | [ ] |
| 19.7 | Verify current state entry | Current state entry is highlighted / distinguished from others | [ ] |
| 19.8 | Undo an action → inspect panel | Current-state highlight moves up one entry; undone entry is dimmed (redo at 0.45 opacity) | [ ] |
| 19.9 | Click an earlier entry in the history panel | Diagram jumps to that state (jumpToState) | [ ] |
| 19.10 | Check entry count label | Label updates accurately (e.g., "(5/50)") | [ ] |
| 19.11 | Click the × close button on the panel | Panel hides | [ ] |

## Phase 20: Schema Versioning & Migration (5 min)

> **Fix verified:** #59 — Test instructions rewritten with
> concrete steps and JSON payloads.

### Prerequisites

- A diagram with at least two blocks and one connection already exists.

### Steps

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| 20.1 | **Inspect saved data for schema version.** (1) Save the current diagram with **Save** (Ctrl+S). (2) In the Fusion 360 Text Commands panel click **Scripts → Show API Messages**. (3) In the ribbon click **Open** (Ctrl+O) to reload the diagram — watch the Text Commands output for the JSON payload. (4) Inside the JSON look for the key `"schemaVersion"`. | The saved data contains `"schemaVersion": "1.0"` at the top level of the JSON object. | [ ] |
| 20.2 | **Load a valid v1.0 diagram.** (1) Using the same saved diagram from 20.1, close the palette and re-open it. (2) Click **Open** and load the diagram. (3) Verify the block count and connections match what was saved. | Diagram loads without errors; block count and connections are preserved; no "migration" or "upgrade" notification appears. | [ ] |
| 20.3 | **Load a pre-versioned diagram (no schemaVersion).** (1) Using the Import button, paste the following minimal JSON and click Import: `{"blocks":[{"id":"b1","name":"Test","type":"Generic","status":"Placeholder","x":100,"y":100,"width":120,"height":80,"interfaces":[]}],"connections":[]}` — note this JSON has no `schemaVersion` field. (2) After import, save the diagram. (3) Re-open it and inspect the JSON in Text Commands. | Diagram imports and loads successfully. After save, the persisted JSON now contains `"schemaVersion": "1.0"` and a `"requirements"` array (added by silent migration). | [ ] |
| 20.4 | **Validation reports invalid schema version.** (1) Using the Import button, paste: `{"schemaVersion":"99.0","blocks":[],"connections":[]}` and click Import. (2) Click **Check Rules** in the ribbon. | The rule check results include a warning or error indicating the schema version is unrecognised or unsupported. | [ ] |

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
| 1 | Ribbon UI | 8 | _ | _ |
| 2 | Block Shapes | 10 | _ | _ |
| 3 | Connections | 20 | _ | _ |
| 4 | Canvas Navigation | 12 | _ | _ |
| 5 | Selection & Grouping | 9 | _ | _ |
| 6 | Context Menu | 5 | _ | _ |
| 7 | Search & Filter | 6 | _ | _ |
| 8 | Undo / Redo | 6 | _ | _ |
| 9 | Import | 8 | _ | _ |
| 10 | CAD Linking | 9 | _ | _ |
| 11 | Export & Report Validation | 18 | _ | _ |
| 12 | Hierarchy / Child Diagrams | 7 | _ | _ |
| 13 | Arrange / Layout | 10 | _ | _ |
| 14 | Tab Panels & Status Bar | 16 | _ | _ |
| 15 | Annotations | 6 | _ | _ |
| 16 | Unsaved Changes Warning | 4 | _ | _ |
| 17 | Accessibility | 9 | _ | _ |
| 18 | Orthogonal Routing & Waypoints | 8 | _ | _ |
| 19 | Undo History Panel | 11 | _ | _ |
| 20 | Schema Versioning & Migration | 4 | _ | _ |
| **TOTAL** | | **185** | _ | _ |

**Tested By**: _________________ **Date**: _________________

**Fusion 360 Version**: _________________

**OS**: _________________

**Overall Result**: [ ] PASS / [ ] FAIL

**Notes**:
