# Fusion System Blocks — Comprehensive UI Feature Inventory

> **Generated from source audit** of the 14 specified front-end files.  
> Version: 0.1.1 | Schema: v1.0

---

## Table of Contents

1. [All Current UI Features](#1-all-current-ui-features)
2. [All Diagram Editing Capabilities](#2-all-diagram-editing-capabilities)
3. [All Advanced Features](#3-all-advanced-features)
4. [UI Polish Items](#4-ui-polish-items)
5. [Notable Gaps and TODOs](#5-notable-gaps-and-todos)

---

## 1. All Current UI Features

### 1.1 Ribbon Toolbar (Primary)

The toolbar uses a Fusion 360–style ribbon bar with labeled groups. Each button has two-tier tooltips (Tier 1 at 0.5 s — title + shortcut; Tier 2 at 2 s — expanded description).

| Group | Buttons | Keyboard Shortcut(s) |
|---|---|---|
| **File** | New, Save, Save As, Load, Open Named, Export | `Ctrl+N`, `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+O`, `Ctrl+Shift+O` |
| **Edit** | Undo, Redo, Import, Copy, Paste, History | `Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`, `Ctrl+C`, `Ctrl+V` |
| **Create** | Block, Connect, Text, Note | `B` / `Insert`, `C` |
| **Navigate** | Go Up, Drill Down, Create Child | `Ctrl+Shift+↑`, `Ctrl+Shift+↓`, `Ctrl+Shift+N` |
| **Select** | Select All, Clear, Group, Ungroup | `Ctrl+A`, `Escape` |
| **Arrange** | Auto Layout, Align Left, Align Center, Align Right, Distribute Horizontal | — |
| **Annotate** | Dimension, Callout | — |
| **View** | Fit View, Zoom In, Zoom Out, Toggle Grid, Toggle Minimap, Toggle Routing Mode | `Ctrl+0`, `Ctrl+=`, `Ctrl+-`, `M` |
| **Validate** | Check Rules | — |
| **CAD Links** | Link to CAD, Link to ECAD | — |
| **Help** | Help overlay | `F1`, `?` (shortcuts dialog) |

Additional shortcuts:

- `Ctrl+D` — Duplicate selected blocks
- `Ctrl+F` — Focus search / filter bar
- `Delete` / `Backspace` — Delete selection
- `Shift+P` / `Shift+D` / `Shift+M` — Set connection type to Power / Data / Mechanical

### 1.2 Secondary Toolbar Bar

- **Search input** with filter icon — text search across block name, type, and status.
- **Status filter buttons** — All | Placeholder | Planned | In-Work | Implemented. Uses opacity-based visibility (0.15 for non-matching).
- **Connection Type dropdown** — auto, power, data, signal, electrical, mechanical, software, optical, thermal. Changes apply to selected connection or stub in real time.
- **Arrow Direction dropdown** — forward, backward, bidirectional, none.
- **Breadcrumb path** — displays current hierarchy position (updated on drill-down / go-up).

### 1.3 Tab Bar

Seven tabs with WAI-ARIA keyboard navigation (`ArrowLeft`/`Right`/`Up`/`Down`, `Home`, `End`):

| Tab | Panel Contents |
|---|---|
| **Home** | Welcome section, New / Load buttons, Quick Tips, Status Legend (5 statuses with color swatches), Connection Type Legend (7 types with SVG previews + arrow types) |
| **Diagram** | The main SVG canvas area |
| **Linking** | "Start CAD Selection" button, linking status pill |
| **Validation** | Rule check controls (error / warning filters, category dropdown), results list |
| **Requirements** | "Check Requirements" button, status pill, results table (Status / Requirement / Actual / Op / Target / Unit) |
| **History** | Snapshot description input, "Create Snapshot" button, snapshot list with Refresh, comparison result section |
| **Reports** | "Export…" button, status pill, last export path display, exported file list |

### 1.4 Status Bar (Footer)

Persistent footer with:

- **Save** button
- **Autosave** checkbox (5-second interval when enabled)
- **Health** pill indicator
- **Last saved** timestamp pill
- **Bridge status** pill (connected / offline)

### 1.5 Properties Side Panel

Always-visible right-side panel when a block is selected:

- Block **Name** (double-click to rename inline)
- **Type** dropdown (Generic / Electrical / Mechanical / Software) — instant apply
- **Status** dropdown (5 options) — instant apply
- **Shape** dropdown (8 shapes) — instant apply
- Inline **Attributes** editing (key/value rows; changes commit immediately)
- **Connection summary** — outgoing / incoming / stub counts
- "**Edit Properties**" button → opens full modal dialog
- Close button

### 1.6 Context Menus

#### Block Context Menu (right-click on block)

| Item | Shortcut / Submenu |
|---|---|
| Rename | Dbl-click |
| Properties… | — |
| Type → | Generic, Electrical, Mechanical, Software |
| Status → | Placeholder, Planned, In-Work, Implemented, Verified |
| Shape → | Rectangle, Rounded, Diamond, Ellipse, Hexagon, Parallelogram, Cylinder, Triangle |
| Connect to… | `C` |
| Connect Across Diagrams… | — |
| Net Stub… | — |
| Add to Group → | dynamic list of existing groups |
| Remove from Group | shown when block belongs to a group |
| Delete | `Del` |

#### Empty Canvas Context Menu (right-click on empty space)

- Add Block (at click position with type picker prompt)
- Fit to View

#### Connection Context Menu (right-click on connection line)

- Type → auto, Power, Data, Signal, Mechanical, Software, Optical, Thermal
- Direction → Forward, Backward, Bidirectional, None
- Toggle Stub Display
- Select Connected Blocks
- Delete Connection (`Del`)

#### Named Stub Context Menu (right-click on named stub)

- Rename Net
- Remove This Stub
- Direction toggle (forward / backward / bidirectional)
- Port Side toggle (output / input / top / bottom)
- Type toggle (8 connection types)
- Delete Entire Net

### 1.7 Modal Dialogs

| Dialog | Trigger | Contents |
|---|---|---|
| **Property Editor** | "Edit Properties" button or context menu | Name, Type (4), Status (5), Shape (8), Attributes table (add/delete rows), Save/Cancel |
| **Export Options** | Export button | 11 format checkboxes, Select All/None, destination folder with Browse, Export/Cancel |
| **Import** | Import button | Radio: Mermaid / CSV; Mermaid textarea; CSV blocks + connections textareas; Import/Cancel |
| **Save As** | `Ctrl+Shift+S` | Document name input, Save/Cancel |
| **Open Document** | `Ctrl+Shift+O` | Scrollable document list, Cancel |
| **Keyboard Shortcuts** | `?` key | Full table of shortcuts grouped by File, Edit, Create, Navigate, View, Selection, Connection Types |
| **Help** | `F1` | Getting Started, Creating Blocks, Connecting Blocks, Resizing, Selection & Groups, Saving & Loading, Navigation & View, Exporting |
| **Crash Recovery** | Auto on startup if backup exists | Warning icon, timestamp of backup, Recover / Discard buttons |
| **Cross-Connect** | Context menu "Connect Across Diagrams" | Numbered list of all blocks across hierarchy, prompt to pick target |
| **Named Stub (Autocomplete)** | Context menu "Net Stub" or stub creation flow | Text input with autocomplete suggestions from existing net names, ArrowUp/Down navigation, OK/Cancel |
| **Quick Block Menu** | `B` key | Overlay with G / E / M / S shortcuts, arrow navigation, mouse click |

### 1.8 Minimap

- Canvas-based (not SVG), positioned fixed bottom-right.
- Blocks rendered as colored rectangles by type (Electrical = blue, Mechanical = orange, Software = purple, Generic = gray).
- Blue viewport rectangle overlay.
- Click / drag to pan the main canvas.
- Toggle visibility via `M` key or toolbar button.
- Throttled rendering via `requestAnimationFrame`.

### 1.9 Loading Spinner Overlay

- Full-screen overlay with spinning border animation and configurable message text.
- `window.showLoadingSpinner(msg)` / `window.hideLoadingSpinner()` helpers.

### 1.10 Block Type Selector (Advanced)

- `AdvancedBlockTypeManager` class in palette.html.
- Dropdown menu with block categories (Electrical, Mechanical, Software, System Templates).
- Each item shows icon, name, description; hover shows specification preview tooltip.
- Keyboard shortcuts: `Shift+B` (toggle menu), `Ctrl+Shift+1/2/P` (quick-select types).
- Creates specialized blocks with full specification attributes and typed interfaces.
- Template instantiation: creates multiple blocks + connections from template definitions.

---

## 2. All Diagram Editing Capabilities

### 2.1 Block Types

Four base categories, each rendered with category-specific stroke color:

| Category | Color | Subtypes (from component libraries) |
|---|---|---|
| **Generic** | Gray `#6c757d` | — |
| **Electrical** | Blue `#4fc3f7` | Arduino Uno R3, ESP32 DevKit, Linear Power Supply, Switching Power Supply, Temperature Sensor, 3-Axis Accelerometer, WiFi Module, Bluetooth Module |
| **Mechanical** | Green `#81c784` | (loaded from `mechanical-blocks.js`) Servo Motor, Stepper Motor, Linear Actuator, Encoder, Load Cell, Proximity Sensor, Bearing, Coupling, Gearbox |
| **Software** | Orange `#ffb74d` | (loaded from `software-blocks.js`) PID Controller, FSM, Kalman Filter, Protocol Handler, CAN Bus, MQTT, FFT, ML Model, RTOS, Bootloader |

### 2.2 Block Shapes

Eight SVG shapes rendered by `diagram-renderer.js`:

1. **Rectangle** (default)
2. **Rounded** (large corner radius)
3. **Diamond** (rotated square)
4. **Circle** (ellipse)
5. **Hexagon** (6-point polygon)
6. **Parallelogram** (skewed rectangle)
7. **Cylinder** (rect + ellipse top)
8. **Triangle** (3-point polygon)

### 2.3 Block Status System

Five statuses with visual indicators:

| Status | Color | Visual Style |
|---|---|---|
| Placeholder | `#969696` | Dashed stroke |
| Planned | `#87ceeb` | Blue tint |
| In-Work | `#ffc107` | Yellow fill accent |
| Implemented | `#4caf50` | Green solid |
| Verified | `#006064` | Teal solid |

Each block displays a status indicator circle in the bottom-right corner.

### 2.4 Block Attributes

Default engineering attribute slots initialized on every block:

- Manufacturer, Part Number, Datasheet URL, Rating / Specification, Cost, Lead Time, Notes

These are editable in both the Properties side panel (inline) and the full Property Editor dialog.

### 2.5 Block Rendering Details

- SVG group with invisible hit-test rectangle (full block area).
- Shape fill/stroke derived from type and status.
- Word-wrapped text (max 3 lines).
- **CAD Link badge** — blue banner with chain-link icon at top of linked blocks.
- **Child diagram indicator** — nested-squares icon at bottom-left when block has children.
- **Selection halo** — orange (`#FF6B35`) stroke, 3 px wide.
- **Connection ports** — 4 ports (input/output/top/bottom), visible on hover, `opacity: 0` by default.
- **Resize handles** — 8 handles (4 corners + 4 midpoints), visible when selected. Grid-snapped, min size 60×40 px.

### 2.6 Connection System

#### Connection Types (7 + auto)

| Type | Color | Stroke Style |
|---|---|---|
| Auto | Default | Solid |
| Power | Red `#dc3545` | Solid, 3 px |
| Data | Blue `#007bff` | Dashed 8,4 |
| Signal | Orange `#ff9800` | Dashed 6,3 |
| Mechanical | Gray `#6c757d` | Dashed 12,6 |
| Software | Purple `#9c27b0` | Dashed 4,4 |
| Optical | Cyan `#00bcd4` | Dashed 2,4 |
| Thermal | Deep Orange `#e65100` | Dashed 8,3,2,3 |

#### Arrow Directions (4)

- Forward (→), Backward (←), Bidirectional (↔), None (—)

#### Rendering Modes

- **Bezier** — smooth cubic Bézier curves with collision-aware control point routing.
- **Orthogonal (Manhattan)** — right-angle routing via `OrthogonalRouter`:
  - `computePath()` with obstacle avoidance (margin 20 px, max 12 segments, stub length 20 px).
  - Simple/S-route/detour strategies with fallback.
  - Vertical detour shifting (left/right, above/below obstacles).
  - Backward wrap-around for right-to-left connections.
  - Collision detection via `_routeIntersectsAny` / `_segmentIntersectsRect`.

#### Waypoints

- Draggable intermediate points on connection paths.
- Right-click a waypoint → remove it.
- Double-click an empty connection segment → add a waypoint.
- Routing through user waypoints via `_routeThroughWaypoints`.

#### Connection Port System

- 4 ports per block: input (left), output (right), top, bottom.
- Ports visible on hover via CSS opacity transition.
- Port hit detection: DOM-based `closest('.connection-port')` with coordinate-based fallback (`findPortAt`, 10 px radius).
- **Unified fan layout** — when multiple connections share a port, slot distribution is computed and cached per port to prevent overlap.

#### Arrow Rendering (CEF Workaround)

- Manual polygon arrows instead of SVG `<marker>` elements (Fusion's Chromium/CEF doesn't reliably render SVG markers).
- Per-type colored arrowheads.
- Reverse arrows for bidirectional connections.

### 2.7 Connection Variants

#### Same-Level Stubs

- Connections with `renderAsStub: true` are rendered as paired stubs (source stub + target stub).
- Type-colored lines with arrows and block name labels.
- Created via context menu "Toggle Stub Display" or the stub creation flow.

#### Cross-Diagram Stubs

- `renderCrossDiagramStubs()` scans hierarchy for connections referencing blocks not in the current view.
- Rendered with type-colored line, arrow, 🌐 globe icon, remote block name label.
- Fan layout when multiple cross-diagram stubs share the same port.

#### Named Stubs (Net Labels)

- `addNamedStub()` / `removeNamedStub()` / `getNetNames()` / `getStubsByNet()` API.
- Color-coded by net name (10-color palette).
- Diamond marker at endpoint, net name label, block count indicator.
- Tooltip showing all connected blocks on hover.
- Highlight support for visual tracing.
- Net-based implicit connections — blocks sharing the same net name are logically connected.

### 2.8 Annotations

Four annotation types rendered by `diagram-renderer.js`:

| Type | Description |
|---|---|
| **Text** | Free text on canvas |
| **Note** | Yellow sticky note with word-wrapped text |
| **Dimension** | Line between 2 blocks with auto-distance calculation and label |
| **Callout** | Text box with leader line pointing to a target block |

Annotation interactivity:

- Click → select (orange dashed outline)
- Drag → move
- Double-click → edit text inline
- `Delete` key → remove

### 2.9 Hierarchy / Navigation

- **Drill Down** — opens a block's child diagram; pushes current diagram onto navigation stack.
- **Go Up** — pops the navigation stack; restores parent diagram with child data persisted.
- **Create Child** — creates a new empty child diagram for selected block and auto-navigates into it.
- **Breadcrumb** — displays `Root > Parent > Current` path in the secondary toolbar.
- **Cross-hierarchy connections** — connections between blocks in different diagram levels are supported and rendered as cross-diagram stubs.

### 2.10 Grid and Snapping

- **Snap-to-grid** — 20 px grid, toggleable via toolbar button.
- **Alignment guides** — smart snap guides during block drag:
  - Edge-to-edge and center-to-center matching with 5 px tolerance.
  - Dashed orange guide lines drawn in real time.
  - Covers left/center/right (horizontal) and top/middle/bottom (vertical) alignment.

### 2.11 Canvas Interaction

| Interaction | Behavior |
|---|---|
| **Click block** | Select (with manual double-click detection at 400 ms for CEF) |
| **Double-click block** | Inline rename (foreignObject + HTML input) |
| **Drag block** | Move with grid snap + alignment guides; multi-select drag moves all selected |
| **Right-click block** | Context menu |
| **Click port** | Enter connection mode (temp dashed orange line, crosshair cursor) |
| **Click empty space** | Clear selection, or complete connection |
| **Drag on empty space** | Lasso selection (dashed blue rectangle) |
| **Middle-button drag** | Pan canvas |
| **Scroll wheel** | Zoom at cursor position |
| **Right-click empty space** | Canvas context menu (Add Block, Fit View) |
| **Right-click connection** | Connection context menu |
| **Right-click named stub** | Named stub context menu |

### 2.12 Block Resize

- 8 resize handles (nw / n / ne / e / se / s / sw / w).
- Handles visible when block is selected.
- Grid-snapped resizing with minimum size enforcement (60 × 40 px).
- Re-renders connections, stubs, and annotations after resize.

### 2.13 Alignment & Layout

- **Align Left** — align selected blocks' left edges.
- **Align Center** — align to horizontal center.
- **Align Right** — align right edges.
- **Distribute Horizontal** — evenly space selected blocks horizontally.
- **Auto Layout** — grid-based auto-layout (sqrt-based column count, cascading placement).

### 2.14 Copy / Paste / Duplicate

- **Copy** (`Ctrl+C`) — deep-clone selected blocks.
- **Paste** (`Ctrl+V`) — paste with ID remapping and grid-step offset; intra-selection connections preserved.
- **Duplicate** (`Ctrl+D`) — clone with grid offset and "(copy)" name suffix.

### 2.15 Import

- **Mermaid import** — parses `A[Label]`, `A --> B`, `A -->|label| B`, `A --- B`; maps arrow styles to connection types (`==>` → power, `-->` → signal, `-.->` → data, `---` → mechanical).
- **CSV import** — blocks CSV (`name,type,x,y,status`) + optional connections CSV (`from,to,kind`).

---

## 3. All Advanced Features

### 3.1 Undo / Redo System

- 50-level maximum history depth.
- `saveState()` with auto-label detection (e.g., "Add Block", "Delete Block", "Move Block").
- Deduplication guard using fingerprint comparison.
- Deep-clone per state for full isolation.
- `jumpToState(index)` for direct timeline navigation.
- `_notifyHistoryUpdate()` for panel synchronization.
- Debounced auto-save (250 ms) on `updateBlock` via monkey-patched core method.

### 3.2 History Panel

- Slide-out panel with chronological entries.
- Each entry shows icon, label, and relative time-ago.
- Click to jump to any state (forward or backward).
- Count badge in header.

### 3.3 Multi-Selection

- `Ctrl+Click` / `Meta+Click` to toggle individual blocks.
- `Ctrl+A` to select all.
- `addToSelection` / `removeFromSelection` / `toggleSelection` / `selectAll` / `invertSelection` APIs.

### 3.4 Lasso Selection

- Drag on empty canvas draws a dashed blue rectangle.
- Overlap-based block detection (any intersection counts).
- On completion with ≥ 2 blocks, shows a floating **group offer bar** at bottom-center:
  - "{n} blocks selected" label
  - "Group" button → prompts for group name
  - Dismiss (✕) button
  - Auto-dismiss after 8 seconds.

### 3.5 Group Management

- `createGroup(blockIds, name, options)` — supports `color`, `description`, `metadata`, `parentGroupId`.
- `ungroupBlocks(groupId)`
- `addBlockToGroup(groupId, blockId)` / `removeBlockFromGroup(groupId, blockId)`
- **Nested groups** — parent-child group hierarchy with circular reference prevention, depth-based visual inset.
- **Group boundary rendering** — SVG rect with dashed stroke, color fill at 10% opacity.
- **Group label + description text.**
- **Groups as connection endpoints** — connections can originate from or terminate at a group ID.
- **Group context menu** — Properties, Rename, Set Parent, Change Color, Ungroup.
- **Group properties dialog** — name, description, color picker (15 presets + custom), parent selector with circular-reference prevention, metadata key/value editor.

### 3.6 Layer Management

- `createLayer(name)` — creates a named layer.
- `moveBlocksToLayer(blockIds, layerId)` — assigns blocks to a layer.
- `updateLayerVisibility(layerId, visible)` — toggles visibility with opacity + display control.

### 3.7 Export Formats

11 export formats available via the Export dialog:

1. Markdown Report (.md)
2. HTML Report (.html)
3. Pin Map CSV (.csv)
4. Pin Map C Header (.h)
5. BOM CSV (.csv)
6. BOM JSON (.json)
7. Assembly Sequence Markdown (.md)
8. Assembly Sequence JSON (.json)
9. Connection Matrix CSV (.csv)
10. SVG Diagram (.svg)
11. PDF Report (.pdf)

Custom destination folder with Browse button.

### 3.8 Rule Checking

Five built-in validation rules (configurable via checkboxes):

| Rule | Description |
|---|---|
| **Connectivity** | Detects orphaned blocks (no connections) |
| **Implementation Status** | Flags blocks still in Placeholder status |
| **Unique Names** | Finds duplicate block names |
| **No Self-Connections** | Catches connections where from === to |
| **Named Blocks** | Identifies blocks with default names |

- Draggable rule panel with Select All / None buttons.
- Results show pass/fail per rule with clickable block links for highlighting.

### 3.9 CAD Linking

- `START_CAD_SELECTION` message to Python backend.
- Polling for pending link data with 30-second timeout.
- Stores `occToken`, `docId`, `docPath`, `componentName`, `metadata` on `block.links[]`.
- Visual indicator: blue CAD link badge with chain-link icon on linked blocks.

### 3.10 Python Bridge Communication

- `PythonInterface` class with message queue and pending request tracking.
- 30-second request timeout.
- Communication via `adsk.fusionSendData()`.
- Operations: `saveDiagram` (delta-save with full-save fallback), `loadDiagram`, `exportReports`, `checkRules`, `syncComponents`.
- Named documents: `listDocuments`, `saveNamedDiagram`, `loadNamedDiagram`, `deleteNamedDiagram`.
- Requirements: `validateRequirements`.
- Version control: `createSnapshot`, `listSnapshots`, `restoreSnapshot`, `compareSnapshots`.
- Security: `fusionJavaScriptHandler` routes only known events; rejects unrecognized actions (no arbitrary JS eval).

### 3.11 System Templates

Seven pre-configured templates from `BlockTemplateSystem`:

1. Motor Control System
2. Multi-Sensor Array
3. Linear Motion System
4. Robotic Joint System
5. Control Loop System
6. IoT Gateway System
7. Smart Actuator System

Two system presets: Industrial Automation Line, Robotic Manufacturing Cell.

Template operations: `createFromTemplate`, `suggestCompatibleTemplates`, `validateTemplate`, `exportTemplate` / `importTemplate`, `generateTemplateVariations`.

### 3.12 Schema Versioning

- Diagram schema v1.0 with migration support from v0.9.
- Delta serialization via `DeltaUtils` for JSON-Patch-based incremental saves.

### 3.13 Crash Recovery

- Periodic auto-backup to `localStorage` every 30 seconds (only when unsaved changes exist).
- On startup, checks for leftover recovery backup.
- Recovery prompt dialog: shows backup timestamp, Recover / Discard buttons.
- Backup cleared on successful save or normal close.

### 3.14 Unsaved Changes Guard

- `beforeunload` event listener warns user when closing palette with unsaved changes.
- Standard `e.returnValue` for cross-browser support.

### 3.15 Global API

`window.SystemBlocks` exposes:

- `createBlock`, `deleteBlock`, `connectBlocks`, `selectBlock`, `clearSelection`
- `exportDiagram`, `importDiagram`
- `undo`, `redo`
- `createGroup`, `addBlockToGroup`, `removeBlockFromGroup`
- `save`, `load`, `exportReports`
- `getModule(name)`, `isReady()`, `getVersion()`

`system-blocks:ready` custom event dispatched when initialization completes.

---

## 4. UI Polish Items

### 4.1 Animations

| Animation | Usage |
|---|---|
| `blockAppear` | Fade-in on block creation |
| `blockDisappear` | Scale-down + fade on block deletion |
| `drawConnection` | Connection line draw-in |
| `ripple` | General ripple effect |
| `slideInFromRight` / `slideOutToRight` | Panel/notification entrance/exit |
| `dashMove` | Animated dashed stroke offset |
| `pulsing` | Pulsing effect |
| `toastSlideIn` / `toastSlideOut` | Toast notification slide up/down |
| `shortcutFeedback` | Brief scale-up flash for shortcut activation |
| `fsb-spin` | Loading spinner rotation |
| `ribbon-spin` | Ribbon button loading spinner |
| `templateCreated` | Fade-in for template blocks |
| `templateConnectionFlow` | Animated dash offset on template connections |
| `blockCreated` | Simple opacity fade for new blocks |
| `animateBlockMove` | Ease-out cubic easing for programmatic block moves |
| `connectionFlow` | Animated dash offset for connection flow |
| `softwareFlow` | Protocol-specific dash animation on software connection points |
| `rotate` | Mechanical connection point dash rotation |

### 4.2 Transitions

- All ribbon buttons: hover/active state transitions (background, border-color).
- Block hover: smooth stroke change.
- Block selection: smooth stroke + width transition.
- Connection ports: opacity transition on hover.
- Context menu: instant show/hide.
- Notifications: `transform: translateX` slide-in transition.
- Panels: opacity + translateY transition.
- Dropdown menus: opacity + visibility transition.
- Tooltip: opacity transition (0.15 s).
- Properties panel: slideInFromRight animation.

### 4.3 Tooltips

- **Two-tier ribbon tooltips**: Tier 1 (0.5 s) shows title + keyboard shortcut badge. Tier 2 (2 s) expands with detailed description.
- **Custom tooltip element** (`.fusion-tooltip`): positioned fixed, dark background, arrow pointer, max-width 260 px. Required because CEF does not show native `title` attribute tooltips.
- **Named stub tooltips**: show all connected block names on hover.
- **Block specification tooltips**: show specifications preview on hover in block type menu.
- **Template info tooltips**: show template details after instantiation.

### 4.4 Context Menus

- Dark-themed floating menus (`.fusion-context-menu`).
- Per-item icons (emoji), shortcut labels, separator lines.
- **Nested submenus** with `▸` arrow indicator (Type, Status, Shape, Add to Group, Connection Type, Direction).
- Danger items styled in red for destructive actions.
- Menu dismissed on click outside.

### 4.5 Drag-and-Drop

- **Block drag**: with multi-select, grid snapping, alignment guides, real-time connection/stub/annotation re-render. Scheduled via `requestAnimationFrame` for batched updates.
- **Lasso drag**: dashed blue selection rectangle on empty canvas.
- **Middle-button pan**: canvas pan via mouse drag.
- **Resize drag**: 8-handle resize with grid snapping and min-size enforcement.
- **Waypoint drag**: intermediate connection waypoints are draggable.
- **Connection drag**: drag from port to create connection (temp orange dashed line + crosshair cursor).
- **Minimap drag**: click/drag viewport rectangle to pan.
- **Rule panel drag**: draggable panel header (cursor: grab).
- **History panel**: slide-out drawer.

### 4.6 Visual Feedback

- **Selection halo**: orange stroke on selected blocks/annotations.
- **Snap guides**: dashed orange lines during drag alignment.
- **Ready indicator**: green toast "✓ System Blocks Ready" on init (fades after 3 s).
- **Error indicator**: red centered error message (auto-remove after 8 s).
- **Toast notifications**: colored bottom-center toasts (success=green, error=red, info=blue, warning=yellow) with auto-dismiss.
- **Python bridge notifications**: fixed-position colored toast with ARIA live region, 4 s auto-remove.
- **Loading states**: spinner animation on ribbon buttons (`.loading` class).
- **Disabled states**: 40% opacity, `cursor: not-allowed`.
- **Active/pressed states**: Orange background on active toolbar buttons.
- **Empty canvas state**: centered illustration with "No blocks yet" message and "Add your first block" CTA button.
- **Badge indicators**: red notification badge on ribbon buttons.
- **Connection highlight**: thickened stroke on selected/hovered connections.
- **Block highlight**: accent stroke on search result / rule check focus.

### 4.7 Responsive Design

- Ribbon adapts at 3 breakpoints:
  - ≤ 600 px: reduced padding, smaller icons/text.
  - ≤ 500 px: further compression, smaller fonts.
  - ≤ 400 px: button text hidden (icon-only), reduced heights.
- Secondary toolbar: wraps at ≤ 500 px, hides filter buttons at ≤ 400 px.
- `handleResize()` method on `ToolbarManager` for programmatic adaptation.
- Overflow indicator on ribbon when content exceeds width.

### 4.8 Accessibility

- **ARIA**: `role="tabpanel"`, `aria-selected`, `aria-modal`, `aria-labelledby`, `aria-hidden`, `aria-label`, `aria-live="polite"` for notifications.
- **Screen reader**: `.sr-only` utility class for visually hidden but screen-reader-accessible text.
- **Focus management**: `focus-visible` outlines (2 px solid blue) on all interactive elements.
- **Keyboard navigation**: Full keyboard support for tabs (arrow keys, Home, End), dialogs (Escape to close, Enter to confirm), autocomplete (ArrowUp/Down/Enter/Escape).
- **High-contrast mode**: `@media (prefers-contrast: more)` overrides for backgrounds, borders, text, stroke widths across both theme and ribbon CSS.

### 4.9 Theming

- **CSS Custom Properties**: 120+ `--fusion-*` variables covering:
  - Colors: primary/secondary/tertiary backgrounds, text colors, border colors
  - Accents: blue, orange, green, red, yellow
  - Typography: font family (Artifakt Element), 5 size steps, 4 weight steps
  - Spacing: 6-step scale (xs through xxl)
  - Borders: 3 radius sizes
  - Shadows: light, medium, heavy, panel
  - Transitions: fast (100 ms), normal (150 ms), slow (300 ms)
  - Z-index scale: dropdown (300), tooltip (400), fixed (500), notification (600), panel (700), overlay (800), modal (900), context-menu (1000), loading (1100)
- Grid pattern: radial-gradient dot pattern at 20 px intervals.
- Custom scrollbar styling (8 px width, dark track, rounded thumb).

### 4.10 SVG Icon Library

40+ professional SVG icons defined in `<defs>` within palette.html, covering:

- Block types: generic, electrical, mechanical, software
- Component types: microcontroller (Arduino, ESP32, WiFi variant), power supply (linear, switching), sensors (temperature, accelerometer, encoder, load cell, proximity), communication (WiFi, Bluetooth), motors (servo, stepper), actuators (linear), structural (bearing, coupling, gearbox)
- Software types: PID, FSM, Kalman, protocol, CAN, MQTT, FFT, ML, RTOS, bootloader
- Template types: motor control, sensor array, linear motion, control loop, smart actuator
- Toolbar actions: new, save, load, export, undo, redo, copy, paste, block, text, note, child, select-all, clear, group, ungroup, auto-layout, align-left, align-center, distribute, ruler, comment, zoom, hash, check, ecad, link, templates, bulk, help

---

## 5. Notable Gaps and TODOs

### 5.1 Identified in Source Code

| Item | Location | Notes |
|---|---|---|
| **ECAD link button** | Toolbar "CAD Links" group | Button exists but no handler beyond the basic CAD link flow; ECAD-specific integration is TBD |
| **Align Right & Distribute** | Toolbar "Arrange" group | Align-right and distribute-horizontal share the same simple implementation pattern; no vertical distribution |
| **PDF export** | Export dialog | Checkbox present but actual PDF generation likely depends on Python backend capability |
| **Layer UI controls** | `advanced-features.js` | Layer API exists (`createLayer`, `moveBlocksToLayer`, `updateLayerVisibility`) but no dedicated UI panel or toolbar to manage layers |
| **Auto-layout sophistication** | `toolbar-manager.js` | Current auto-layout is a simple grid (sqrt-based columns). No force-directed, hierarchical, or Sugiyama layout algorithms |
| **Annotation toolbar integration** | Toolbar "Annotate" group | Only Dimension and Callout have toolbar buttons; Text and Note are in the Create group |
| **Undo label granularity** | `advanced-features.js` | Auto-label detection covers common cases but some operations may get generic labels |
| **Template suggestions** | `block-templates.js` | `suggestCompatibleTemplates` and `generateTemplateVariations` are implemented but no UI surfaces them proactively |
| **Connection label/name** | Connection model | Connections have a `label` field but no UI for displaying or editing it on the canvas |
| **Block rotation** | Not implemented | Blocks cannot be rotated; only position and size are adjustable |
| **Zoom to selection** | Not implemented | Fit-to-view fits all content; no option to zoom to just the selected blocks |
| **Connection routing preference per-connection** | Not implemented | Routing mode (Bezier/orthogonal) is a global toggle, not per-connection |
| **Print support** | Not implemented | No print stylesheet or print-to-PDF from the UI |
| **Multi-level undo across hierarchy** | Not implemented | Undo history is per diagram level; navigating up/down resets the undo context |
| **Real-time collaboration** | Not implemented | Single-user editing only |
| **Dark/light theme toggle** | Not implemented | Fixed dark theme matching Fusion 360; no light mode option |
| **`Ctrl+G` for group** | Help dialog mentions it | Listed in help text but the actual shortcut handler may only be `Group` button in toolbar |

### 5.2 Legacy / Disabled Code

- **Legacy `FusionKeyboardManager`**: Disabled on modular init (`window.fusionKeyboard.destroy()`), replaced by `ToolbarManager.setupKeyboardShortcuts()`.
- **Standalone fallback system**: `window.standaloneDiagram` with basic block creation and drag, only active if modular system fails to initialize.
- **`debugLog` function**: Present but body is empty ("Debug logging disabled for clean interface").

### 5.3 CEF Compatibility Workarounds

These are not gaps but noteworthy engineering decisions:

| Workaround | Reason |
|---|---|
| Manual polygon arrows | CEF doesn't reliably render SVG `<marker>` elements |
| `findPortAt()` coordinate fallback | `closest()` may fail on `opacity: 0` SVG elements in CEF |
| Manual double-click detection (400 ms) | Native `dblclick` unreliable on SVG elements in CEF |
| Dual mouseup + click handlers for connections | CEF may not synthesize `click` from `mouseup` |
| Custom tooltip system | CEF doesn't show native `title` attribute tooltips |
| `useNewWebBrowser=True` flag | CEF compatibility flag for `fusionJavaScriptHandler` |

---

*End of inventory.*
