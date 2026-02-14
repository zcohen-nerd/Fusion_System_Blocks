# Exhaustive Feature Survey — Fusion System Blocks

Complete inventory of every interactive element, handler,
keyboard shortcut, context menu item, dialog, and feature
in the Fusion System Blocks add-in. Organized by feature
area for manual test plan construction.

---

## Ribbon Toolbar (9 Groups)

### File Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-new` | New | Ctrl+N | `ToolbarManager.handleNewDiagram()` | Confirm dialog if unsaved changes |
| `btn-save` | Save | Ctrl+S | `ToolbarManager.handleSave()` | Delta-first save via `PythonInterface.saveDiagram()` with full-JSON fallback |
| `btn-save-as` | Save As | Ctrl+Shift+S | `ToolbarManager.handleSaveAs()` | Opens `#save-as-overlay` modal |
| `btn-export-report` | Export | — | `ToolbarManager.handleExport()` → `showExportDialog()` | Opens `#export-overlay` with 10 format checkboxes |
| `btn-load` | Load | Ctrl+O | `ToolbarManager.handleLoad()` | Calls `PythonInterface.loadDiagram()` |
| `btn-open-named` | Open | Ctrl+Shift+O | `ToolbarManager.handleOpenNamed()` | Opens `#open-doc-overlay` with list + delete per item |

### Edit Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-undo` | Undo | Ctrl+Z | `ToolbarManager.handleUndo()` | Disabled when `advancedFeatures.undo()` has no history |
| `btn-redo` | Redo | Ctrl+Y | `ToolbarManager.handleRedo()` | Disabled when no redo states |
| `btn-import` | Import | — | Opens `#import-dialog` | Radio: Mermaid / CSV; separate textareas |
| (no id) | Copy | — | — | Stub ("Feature not yet implemented") |

### Create Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-add-block-ribbon` | Block | B | `ToolbarManager.handleCreateBlock()` | Shows block-type dropdown with Generic/Electrical/Mechanical/Software cascade submenus |
| `btn-connect` | Connect | C | `ToolbarManager.handleConnect()` | Enters connection mode; target selection then click; Esc cancels |
| `btn-add-text` | Text | — | `ToolbarManager.handleAddText()` | Stub |
| `btn-add-note` | Note | — | `ToolbarManager.handleAddNote()` | Stub |
| `btn-add-dimension` | Dimension | — | `ToolbarManager.handleAddDimension()` | Stub (Annotate group) |
| `btn-add-callout` | Callout | — | `ToolbarManager.handleAddCallout()` | Stub (Annotate group) |

### Navigate Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-go-up` | Up Level | Ctrl+Up | `ToolbarManager.handleNavigateUp()` | Pops hierarchy stack; disabled at root |
| `btn-drill-down` | Drill Down | Ctrl+Down | `ToolbarManager.handleDrillDown()` | Pushes into selected block's childDiagram; disabled without selection or child |
| `btn-create-child` | Create Child | Ctrl+Shift+N | `ToolbarManager.handleCreateChild()` | Creates childDiagram on selected block; disabled without selection |

### Select Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-select-all` | Select All | Ctrl+A | `ToolbarManager.handleSelectAll()` | `advancedFeatures.selectAll()` |
| `btn-select-none` | Select None | Esc | `ToolbarManager.handleClearSelection()` | Also exits connection mode |
| `btn-group-create` | Group | — | `ToolbarManager.handleCreateGroup()` | Multi-select required; disabled otherwise |
| `btn-group-ungroup` | Ungroup | — | `ToolbarManager.handleUngroup()` | Disabled without group selection |

### Arrange Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-auto-layout` | Auto Layout | — | `ToolbarManager.handleAutoLayout()` | Grid layout: 4 columns, 200×120 spacing |
| `btn-align-left` | Align Left | — | `ToolbarManager.handleAlignLeft()` | Multi-select required |
| `btn-align-center` | Align Center | — | `ToolbarManager.handleAlignCenter()` | Multi-select required |
| `btn-align-right` | Align Right | — | `ToolbarManager.handleAlignRight()` | Multi-select required |
| `btn-distribute-h` | Distribute H | — | `ToolbarManager.handleDistributeH()` | Multi-select ≥3 required |

### View Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-fit-view` | Fit View | Ctrl+0 | `ToolbarManager.handleFitView()` | Bounding box + AR matching + CEF safety margins |
| `btn-snap-grid` | Snap Grid | — | `ToolbarManager.handleToggleSnapGrid()` | Toggle; active by default; CSS `active` class |
| `btn-zoom-in` | Zoom In | Ctrl+= | `ToolbarManager.handleZoomIn()` | Scale ×0.8 |
| `btn-zoom-out` | Zoom Out | Ctrl+- | `ToolbarManager.handleZoomOut()` | Scale ×1.25 |

### Validate Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-check-rules` | Check Rules | — | `ToolbarManager.handleCheckRules()` | Calls `PythonInterface.checkRules()` → displays results in `#rule-panel` |

### CAD Links Group

| Button ID | Label | Shortcut | Handler | Notes |
|-----------|-------|----------|---------|-------|
| `btn-link-cad` | Link to CAD | — | `ToolbarManager.handleLinkCAD()` | Requires block selection; hides palette; starts Fusion selection; polls `GET_PENDING_CAD_LINK` every 800ms for 30s |
| `btn-link-ecad` | Link to ECAD | — | `ToolbarManager.handleLinkECAD()` | Stub |

---

## Keyboard Shortcuts

### FusionKeyboardManager (palette.html inline)

| Key Combo | Action | Handler |
|-----------|--------|---------|
| Ctrl+N | New Diagram | `handleNewDiagram()` |
| Ctrl+S | Save | `handleSave()` |
| Ctrl+O | Load | `handleLoad()` |
| Ctrl+Z | Undo | `handleUndo()` |
| Ctrl+Y | Redo | `handleRedo()` |
| Ctrl+Shift+Z | Redo (alt) | `handleRedo()` |
| Ctrl+F | Focus Search | Focuses `#search-input` |
| Escape | Deselect / Cancel | `handleClearSelection()` or exit connection mode |
| Delete | Delete Selected | `handleDeleteSelected()` |
| Backspace | Delete Selected | `handleDeleteSelected()` |
| Ctrl+Up | Navigate Up | `handleNavigateUp()` |
| Ctrl+Down | Drill Down | `handleDrillDown()` |
| Ctrl+Shift+N | Create Child | `handleCreateChild()` |
| Ctrl+A | Select All | `handleSelectAll()` |
| Ctrl+D | Deselect All | `handleClearSelection()` |
| Insert | Add Block | `handleCreateBlock()` |
| Ctrl+0 | Fit View | `handleFitView()` |
| Ctrl+= | Zoom In | `handleZoomIn()` |
| Ctrl+- | Zoom Out | `handleZoomOut()` |
| Shift+P | Filter Placeholder | Clicks `#filter-placeholder` |
| Shift+D | Toggle Snap Grid | `handleToggleSnapGrid()` |
| Shift+E | Export Report | `handleExport()` |
| Shift+M | Check Rules | `handleCheckRules()` |

### ToolbarManager Keyboard Shortcuts

| Key | Modifier | Action |
|-----|----------|--------|
| KeyN | Ctrl | New |
| KeyS | Ctrl | Save |
| KeyS | Ctrl+Shift | Save As |
| KeyO | Ctrl | Load |
| KeyO | Ctrl+Shift | Open Named |
| KeyZ | Ctrl | Undo |
| KeyY | Ctrl | Redo |
| KeyA | Ctrl | Select All |
| Escape | — | Clear Selection |
| Delete | — | Delete Selected |
| KeyB | — | Create Block |
| KeyC | — | Enter Connection Mode |

### AdvancedBlockTypeManager Shortcuts

| Key Combo | Action |
|-----------|--------|
| Shift+B | Toggle block-type menu |
| Ctrl+Shift+1 | Quick-add Arduino Uno R3 |
| Ctrl+Shift+2 | Quick-add ESP32 DevKit |
| Ctrl+Shift+P | Quick-add Linear Power Supply |

---

## Context Menu (`#block-context-menu`)

### On Block Right-Click

| Item ID | Label | Shortcut Hint | Handler |
|---------|-------|---------------|---------|
| `ctx-rename` | Rename | Dbl-click | Enters inline text editor on block |
| `ctx-properties` | Properties | — | Opens properties panel/dialog |
| (submenu) | **Type →** | — | Submenu with type options |
| — | Generic | — | Sets `block.type = 'Generic'` |
| — | Electrical | — | Sets `block.type = 'Electrical'` |
| — | Mechanical | — | Sets `block.type = 'Mechanical'` |
| — | Software | — | Sets `block.type = 'Software'` |
| (submenu) | **Status →** | — | Submenu with status options |
| — | Placeholder | — | Sets `block.status = 'Placeholder'` |
| — | Planned | — | Sets `block.status = 'Planned'` |
| — | In-Work | — | Sets `block.status = 'In-Work'` |
| — | Implemented | — | Sets `block.status = 'Implemented'` |
| — | Verified | — | Sets `block.status = 'Verified'` |
| `ctx-connect-from` | Connect to... | C | Enters connection mode from this block |
| `ctx-delete` | Delete | Del | Removes block + its connections |

### On Empty Canvas Right-Click

| Item ID | Label | Handler |
|---------|-------|---------|
| `ctx-add-block` | Add Block Here | Creates block at click coordinates |
| `ctx-fit-view` | Fit View | `handleFitView()` |

---

## Dialogs and Modals

### Save As Dialog (`#save-as-overlay`)

| Element ID | Type | Purpose |
|------------|------|---------|
| `save-as-name` | text input | Diagram name |
| `save-as-cancel` | button | Cancel |
| `save-as-confirm` | button | Confirm save; calls `PythonInterface.saveNamedDiagram()` |

### Open Document Dialog (`#open-doc-overlay`)

| Element ID | Type | Purpose |
|------------|------|---------|
| `open-doc-list` | container | Dynamically populated list of saved diagrams |
| `open-doc-cancel` | button | Cancel |
| `.doc-delete` | button (per item) | Delete named diagram; calls `PythonInterface.deleteNamedDiagram()` |
| (item click) | — | Load selected diagram; calls `PythonInterface.loadNamedDiagram()` |

### Export Dialog (`#export-overlay`)

| Element ID | Type | Purpose |
|------------|------|---------|
| `exp-markdown` | checkbox | Markdown report (`system_blocks_report.md`) |
| `exp-html` | checkbox | HTML report (`system_blocks_report.html`) |
| `exp-csv` | checkbox | Pin map CSV (`pin_map.csv`) |
| `exp-header` | checkbox | C header (`pins.h`) |
| `exp-bom-csv` | checkbox | BOM CSV (`bom.csv`) |
| `exp-bom-json` | checkbox | BOM JSON (`bom.json`) |
| `exp-assembly-md` | checkbox | Assembly sequence MD (`assembly_sequence.md`) |
| `exp-assembly-json` | checkbox | Assembly sequence JSON (`assembly_sequence.json`) |
| `exp-connection-matrix` | checkbox | Connection matrix CSV (`connection_matrix.csv`) |
| `exp-svg` | checkbox | SVG diagram snapshot (`diagram.svg`) |
| `exp-select-all` | button | Check all format boxes |
| `exp-select-none` | button | Uncheck all format boxes |
| `exp-browse-folder` | button | Opens native folder picker via `_handle_browse_folder()` |
| `exp-folder-path` | text display | Shows selected export folder path |
| `exp-cancel` | button | Cancel |
| `exp-confirm` | button | Triggers `PythonInterface.exportReports()` with selected formats and path |

### Import Dialog (`#import-dialog`)

| Element | Type | Purpose |
|---------|------|---------|
| Radio: Mermaid | radio | Select Mermaid import mode |
| Radio: CSV | radio | Select CSV import mode |
| `mermaid-text` | textarea | Mermaid flowchart syntax input |
| `csv-blocks` | textarea | CSV blocks data (columns: name, type, x, y, status) |
| `csv-connections` | textarea | CSV connections data (columns: from, to, kind, protocol) |
| `btn-import-cancel` | button | Cancel |
| `btn-import-ok` | button | Parse and import; `parse_mermaid_flowchart()` or `import_from_csv()` |

---

## Secondary Toolbar

| Element ID | Type | Purpose |
|------------|------|---------|
| `search-input` | text input | Filter blocks by name (Ctrl+F focuses) |
| `filter-all` | button | Show all blocks |
| `filter-placeholder` | button | Show only Placeholder blocks |
| `filter-implemented` | button | Show only Implemented blocks |
| `connection-type-select` | select | Auto / Electrical / Power / Data / Mechanical |
| `arrow-direction-select` | select | Forward / Bidirectional / Backward / None |
| `breadcrumb-path` | display | Shows hierarchy breadcrumb trail |

---

## Tabs (Tab Bar)

The tab bar (`sb-tabbar`) is hidden by default (ribbon replaces
it), but tabs are wired and functional:

| Tab ID | Label | Panel Content |
|--------|-------|---------------|
| `tab-home` | Home | Quick start: `action-new`, `action-load` buttons, Quick Tips list |
| `tab-diagram` | Diagram | Main SVG canvas area (selected by default) |
| `tab-linking` | Linking | `action-link-selected` button, `linking-status` pill |
| `tab-validation` | Validation | `filter-errors` checkbox, `filter-warnings` checkbox, `filter-category` select (All/Power/Data/Hierarchy), `action-run-checks` button, `validation-results` list |
| `tab-reports` | Reports | `action-export` button, `export-status` pill, `export-path`, `export-files` list |

### Tab Panel Elements

| Element ID | Tab | Type | Purpose |
|------------|-----|------|---------|
| `action-new` | Home | button | New diagram (same as ribbon New) |
| `action-load` | Home | button | Load diagram |
| `action-link-selected` | Linking | button | Link selected block to CAD |
| `linking-status` | Linking | pill/badge | Shows linking status (idle/linking/linked) |
| `filter-errors` | Validation | checkbox | Show only errors |
| `filter-warnings` | Validation | checkbox | Show only warnings |
| `filter-category` | Validation | select | Filter by: All / Power / Data / Hierarchy |
| `action-run-checks` | Validation | button | Run all rule checks |
| `validation-results` | Validation | list | Displays rule check results |
| `action-export` | Reports | button | Export report |
| `export-status` | Reports | pill/badge | Export status |
| `export-path` | Reports | text | Last export path |
| `export-files` | Reports | list | List of exported files |

---

## Status Bar (Footer)

| Element ID | Type | Purpose |
|------------|------|---------|
| `action-save` | button | Quick save |
| `toggle-autosave` | checkbox | Enable/disable autosave |
| `status-health` | pill/badge | Diagram health indicator (green/yellow/red) |
| `status-last-saved` | pill/badge | Timestamp of last save |
| `status-conn` | pill/badge | Python bridge connection status |

---

## Canvas Interactions (SVG Diagram)

### Mouse Interactions

| Action | Target | Handler | Behavior |
|--------|--------|---------|----------|
| Click | Block | `DiagramEditorCore.selectBlock()` | Selects block; orange highlight |
| Click | Empty canvas | `DiagramEditorCore.clearSelection()` | Deselects all |
| Double-click | Block | Context menu rename handler | Inline text editor appears |
| Drag | Block | `DiagramEditorCore` (isDragging) | Moves block; snaps to grid if enabled |
| Right-click | Block | Shows `#block-context-menu` | Context menu at cursor |
| Right-click | Empty canvas | Shows context menu | Add Block Here / Fit View |
| Ctrl+Click | Block | `AdvancedFeatures.toggleSelection()` | Multi-select toggle |
| Click+Drag (empty) | Canvas | `AdvancedFeatures.startLassoSelection()` | Lasso selection rectangle (dashed) |
| Middle-click+Drag / Alt+Drag | Canvas | `DiagramEditorCore` (isPanning) | Pan view |
| Mouse wheel | Canvas | `DiagramEditorCore.zoomAt()` | Zoom at cursor position |
| Hover | Block | `DiagramRenderer` | Connection port dots appear on sides |
| Click | Connection port | Enters connection mode | Dashed line follows cursor |
| Click | Target block (connection mode) | Creates connection | Line drawn with typed arrows |

### Block Visual Elements

| Element | Renderer Method | Notes |
|---------|-----------------|-------|
| Block rectangle | `renderBlock()` | Rounded rect; type-specific shape styling |
| Block name text | `renderBlock()` | Centered text; editable on double-click |
| Status indicator | `addStatusIndicator()` | Colored circle: gray(Placeholder), blue(Planned), orange(In-Work), green(Implemented), dark-green(Verified) |
| CAD link badge | `renderBlock()` | Blue banner with component name when CAD-linked |
| Child diagram indicator | `renderBlock()` | Visual indicator when block has `childDiagram` |
| Connection ports | `renderBlock()` | Left/right port circles on hover |
| Selection highlight | `renderBlock()` | Orange border/stroke when selected |

### Connection Visual Elements

| Element | Notes |
|---------|-------|
| Connection line | Typed color: Power=red, Data=blue, Electrical=yellow, Mechanical=gray, Auto=default |
| Forward arrow | SVG marker-end arrowhead (+ manual start-arrow polygon for CEF workaround on bidirectional) |
| Bidirectional arrows | Both ends get arrowheads |
| Backward arrow | Reversed arrowhead |
| None (no arrow) | Plain line, no markers |

### SVG Arrow Markers Defined

- `arrowhead` (generic), `arrowhead-reverse`
- `arrowhead-power`, `arrowhead-power-reverse`
- `arrowhead-data`, `arrowhead-data-reverse`
- `arrowhead-electrical`, `arrowhead-electrical-reverse`
- `arrowhead-mechanical`, `arrowhead-mechanical-reverse`

---

## Empty Canvas State

| Element ID | Type | Purpose |
|------------|------|---------|
| `#empty-canvas-state` | overlay | Shown when diagram has no blocks |
| `btn-add-first-block` | button | Creates first block; hides overlay |

---

## Legends

### Status Legend

| Color | Status |
|-------|--------|
| Gray | Placeholder |
| Blue | Planned |
| Orange | In-Work |
| Green | Implemented |
| Dark Green | Verified |

### Connection Legend

| Color | Type |
|-------|------|
| Red | Power |
| Blue | Data |
| Yellow | Electrical |
| Gray | Mechanical |

Arrow types: Forward (→), Bidirectional (↔), None (—)

---

## Rule Panel (`#rule-panel`)

| Element ID | Type | Purpose |
|------------|------|---------|
| `rule-results` | div | Container for rule check results; hidden by default |

Results are rendered by `PythonInterface.displayRuleResults()`:
- Clickable results that highlight associated blocks/connections
- Error icon (❌) for errors, warning icon (⚠️) for warnings
- Auto-shows panel when results arrive

---

## Block Type System

### AdvancedBlockTypeManager

Manages a dropdown menu (`.block-type-menu`) organized by
category with searchable block type items:

### Electrical Blocks (`ElectricalBlockTypes`)

| Type Key | Name | Category | Interfaces |
|----------|------|----------|------------|
| `arduino_uno` | Arduino Uno R3 | microcontroller | 5V, 3.3V, GND, USB, Serial, SPI, I2C + 14 digital + 6 analog pins |
| `esp32_devkit` | ESP32 DevKit | microcontroller | 3.3V, 5V, GND, USB, UART, SPI, I2C, WiFi, Bluetooth |
| `linear_psu` | Linear Power Supply | power | Input, Output, Ground, Enable |
| `switching_psu` | Switching Power Supply | power | Input, Output, Ground, Feedback, Enable |
| `temp_sensor` | Temperature Sensor | sensor | VDD, GND, SDA, SCL, Alert |
| `accelerometer` | 3-Axis Accelerometer | sensor | VDD, GND, SDA/MOSI, SCL/SCLK, INT1, INT2 |
| `wifi_module` | WiFi Module | communication | VCC, GND, TX, RX, Reset, Enable |
| `bluetooth_module` | Bluetooth Module | communication | VCC, GND, TX, RX, State, Key |

### Mechanical Blocks (`MechanicalBlockTypes`)

| Type Key | Name | Subcategory | Key Interfaces |
|----------|------|-------------|----------------|
| `servo_motor` | Servo Motor | actuators | Power, Ground, Control Signal, Position Feedback, Output Shaft |
| `stepper_motor` | Stepper Motor | actuators | Coil A+/A-/B+/B-, Output Shaft |
| `linear_actuator` | Linear Actuator | actuators | Power+/-, Position Control, Feedback, Linear Rod |
| `rotary_encoder` | Rotary Encoder | sensors | VCC, GND, Channel A/B, Index Pulse, Input Shaft |
| `load_cell` | Load Cell | sensors | Excitation+/-, Signal+/-, Mounting Point |
| `proximity_sensor` | Proximity Sensor | sensors | Power, Ground, Detection Output, Sensing Face |
| `ball_bearing` | Ball Bearing | structural | Inner Race, Outer Race |
| `flexible_coupling` | Flexible Coupling | structural | Input Shaft, Output Shaft |
| `planetary_gearbox` | Planetary Gearbox | structural | Input Shaft, Output Shaft, Housing Mount |

### Software Blocks (`SoftwareBlockTypes`)

| Type Key | Name | Subcategory |
|----------|------|-------------|
| `pid_controller` | PID Controller | control |
| `state_machine` | State Machine | control |
| `kalman_filter` | Kalman Filter | estimation |
| `modbus_protocol` | Modbus Protocol | communication |
| `can_bus` | CAN Bus Protocol | communication |
| `mqtt_protocol` | MQTT Protocol | communication |
| `fft_processor` | FFT Processor | signal_processing |
| `ml_inference` | ML Inference Engine | ai_ml |
| `rtos` | Real-Time OS | system |
| `secure_bootloader` | Secure Bootloader | system |

### System Templates (`BlockTemplateSystem`)

#### Electrical Templates

| Template ID | Name | Components |
|-------------|------|------------|
| `template-motor-controller` | Motor Control System | Motor Controller, Servo Motor, Position Feedback, Motor PSU |
| `template-sensor-array` | Multi-Sensor Array | Sensor Hub, Temperature, Accelerometer, Force Sensor, WiFi Module |

#### Mechanical Templates

| Template ID | Name | Components |
|-------------|------|------------|
| `template-linear-actuator-system` | Linear Motion System | Stepper Motor, Reduction Gearbox, Linear Actuator, Position Encoder, Support Bearing |
| `template-robotic-joint` | Robotic Joint System | Joint Motor, Flexible Coupling, Joint Encoder, Joint Bearing, Output Bearing |

#### Software Templates

| Template ID | Name | Components |
|-------------|------|------------|
| `template-control-loop` | Control Loop System | PID Controller, Control FSM, State Estimator, Real-Time OS |
| `template-iot-gateway` | IoT Gateway System | Modbus RTU, CAN Bus, MQTT Client, Gateway OS |

#### Integrated Templates

| Template ID | Name | Components |
|-------------|------|------------|
| `template-smart-actuator` | Smart Actuator System | Smart Controller, System PSU, Servo Motor, Position Sensor, Gear Reduction, Position Control, Modbus Interface |

#### Composite Configurations

| Name | Composed Templates |
|------|-------------------|
| Industrial Automation Line | motor-controller + sensor-array + iot-gateway |
| Robotic Manufacturing Cell | robotic-joint + smart-actuator + control-loop |

---

## Python Bridge Communication

### JS → Python (via `adsk.fusionSendData()`)

Each call sends JSON with `action` and `data` fields.
The `PaletteHTMLEventHandler` dispatches to `_handle_{action}`.

| BridgeAction Enum Value | Python Handler | Purpose |
|-------------------------|----------------|---------|
| `save_diagram` | `_handle_save_diagram()` | Save diagram JSON to Fusion document attributes |
| `load_diagram` | `_handle_load_diagram()` | Load diagram from attributes; falls back to empty diagram |
| `apply_delta` | `_handle_apply_delta()` | Apply JSON-Patch (RFC 6902) to stored diagram |
| `export_reports` | `_handle_export_reports()` | Export selected format files to chosen directory |
| `check_rules` | `_handle_check_rules()` | Run all rule checks; return results |
| `sync_components` | `_handle_sync_components()` | Sync all CAD components in diagram |
| `start_cad_selection` | `_handle_start_cad_selection()` | Start Fusion 360 component selection command |
| `get_pending_cad_link` | `_handle_get_pending_cad_link()` | Poll for pending CAD link data |
| `response` | `_handle_response()` | Acknowledge bridge responses |
| `browse_folder` | `_handle_browse_folder()` | Open native folder picker dialog |
| `list_documents` | `_handle_list_documents()` | Return all saved named diagram manifests |
| `save_named_diagram` | `_handle_save_named_diagram()` | Save diagram under user-chosen name |
| `load_named_diagram` | `_handle_load_named_diagram()` | Load a named diagram by slug |
| `delete_named_diagram` | `_handle_delete_named_diagram()` | Delete a named document |

### Python → JS (via `palette.sendInfoToHTML()`)

| BridgeEvent Enum Value | Purpose |
|------------------------|---------|
| `notification` | Toast notification (info/warning/error/success) |
| `cad-link` | CAD link data payload after component selection |
| `thumbnail_updated` | Live 3D thumbnail update |
| `assembly_sequence` | Assembly sequence data push |
| `assembly_error` | Assembly sequence generation error |
| `living_bom` | Living BOM data push |
| `bom_error` | BOM generation error |
| `service_manual` | Service manual data |
| `change_impact` | Change impact analysis results |

---

## Python Backend Functions

### Data Persistence

| Function | File | Purpose |
|----------|------|---------|
| `save_diagram_json()` | Fusion_System_Blocks.py | Validate + compress + write to Fusion document attributes |
| `load_diagram_json()` | Fusion_System_Blocks.py | Read from document attributes; decompress |
| `load_diagram_data()` | Fusion_System_Blocks.py | Load + deserialize to dict |
| `list_named_diagrams()` | Fusion_System_Blocks.py | Read index from `__SystemBlocks_idx__` attribute |
| `save_named_diagram()` | Fusion_System_Blocks.py | Save under slug derived from user label |
| `load_named_diagram()` | Fusion_System_Blocks.py | Load named diagram by slug |
| `delete_named_diagram()` | Fusion_System_Blocks.py | Delete named diagram and update index |

### CAD Selection & Linking

| Function / Class | File | Purpose |
|-----------------|------|---------|
| `start_cad_selection()` | Fusion_System_Blocks.py | Create Fusion selection command for block linking |
| `select_occurrence_for_linking()` | Fusion_System_Blocks.py | Prompt user to select a component in 3D viewport |
| `CADSelectionHandler` (CommandCreated) | Fusion_System_Blocks.py | Sets up selection input with component filter |
| `CADSelectionExecuteHandler` (CommandEvent) | Fusion_System_Blocks.py | On execute: extracts occToken, docId, component name, material, mass; sends via `sendInfoToHTML` + stores in `_pending_cad_link` |
| `start_enhanced_cad_selection()` | Fusion_System_Blocks.py | Enhanced selection with additional metadata |
| `get_component_info_from_fusion()` | Fusion_System_Blocks.py | Get component properties (material, mass, volume, bounding box) from Fusion 360 API |
| `find_occurrence_by_token()` | Fusion_System_Blocks.py | Traverse assembly tree to find occurrence by token |

### Component Sync

| Function | File | Purpose |
|----------|------|---------|
| `sync_all_components_in_fusion()` | Fusion_System_Blocks.py | Iterate all blocks, find CAD-linked components, update properties |
| `get_all_component_statuses()` | Fusion_System_Blocks.py | Get status for all components in diagram |

### 3D Visualization (Fusion_System_Blocks.py)

| Function | Purpose |
|----------|---------|
| `enable_3d_overlay_mode()` | Enable 3D overlay visualization |
| `disable_3d_overlay_mode()` | Disable overlay |
| `highlight_block_components()` | Highlight linked components in Fusion viewport |
| `create_connection_route_3d()` | Visualize connection routing in 3D |
| `create_system_group_visualization()` | Group visualization in 3D |
| `generate_live_thumbnail()` | Capture component thumbnail from viewport |

### Living Documentation (Fusion_System_Blocks.py)

| Function | Purpose |
|----------|---------|
| `generate_assembly_sequence_from_diagram()` | Generate assembly order from diagram dependencies |
| `generate_living_bom_from_diagram()` | Generate Bill of Materials |
| `generate_service_manual_for_block()` | Generate service/maintenance manual for a block |
| `analyze_change_impact_for_block()` | Analyze downstream impact of changes |

### Diagnostics

| Function | File | Purpose |
|----------|------|---------|
| `DiagnosticsRunner.run_all()` | fusion_addin/diagnostics.py | Auto-discover and run all `test_*` methods |
| `run_diagnostics_and_show_result()` | fusion_addin/diagnostics.py | Run all diagnostics and show result dialog |

#### Diagnostic Tests (14 total)

| Test Method | Purpose |
|-------------|---------|
| `test_env_adsk_modules_loaded` | Verify Fusion 360 SDK modules import |
| `test_env_active_document` | Check for active Fusion document |
| `test_core_valid_graph_validation` | Core validation accepts valid graphs |
| `test_core_invalid_graph_detection` | Core validation catches errors |
| `test_fusion_create_temp_component` | Can create/delete temp component (write access) |
| `test_fusion_create_temp_geometry` | Can create/delete temp geometry |
| `test_core_serialization_roundtrip` | Serialization roundtrip integrity |
| `test_core_action_plan_generation` | Action plan generation works |
| `test_log_file_writable` | Log directory writable |
| `test_fusion_attribute_read_write` | Fusion attribute read/write cycle |
| `test_core_rule_engine` | Rule engine produces results |
| `test_core_hierarchy_operations` | Hierarchy create/navigate works |
| `test_core_typed_connection_roundtrip` | Typed connections serialize correctly |
| `test_palette_html_integrity` | palette.html file exists and is valid |

---

## Export Formats

### Export Profiles

| Profile | Formats Included |
|---------|-----------------|
| `quick` | markdown, csv, header |
| `standard` | markdown, html, csv, header, bom_csv, bom_json, assembly_md, assembly_json, connection_matrix |
| `full` | All 10 formats |

### Format Details

| Key | Output File | Generator Function |
|-----|-------------|-------------------|
| `markdown` | `system_blocks_report.md` | `generate_markdown_report()` — Summary, status breakdown, rule checks, block details, attributes, interfaces, connections |
| `html` | `system_blocks_report.html` | `generate_html_report()` — Self-contained HTML with embedded CSS, tables, BOM summary |
| `csv` | `pin_map.csv` | `pin_map_csv()` — Signal routing: Source Block, Source Interface, Dest Block, Protocol, Notes |
| `header` | `pins.h` | `generate_pin_map_header()` — C header `#define` for pin assignments |
| `bom_csv` | `bom.csv` | `generate_bom_csv()` — Block, Part Number, Qty, Supplier, Cost, Lead Time, Category, CAD Components |
| `bom_json` | `bom.json` | `generate_bom_json()` — Full BOM with items and summary object |
| `assembly_md` | `assembly_sequence.md` | `generate_assembly_sequence_markdown()` — Ordered assembly steps with time estimates |
| `assembly_json` | `assembly_sequence.json` | `generate_assembly_sequence_json()` — Steps as JSON with timestamps |
| `connection_matrix` | `connection_matrix.csv` | `generate_connection_matrix_csv()` — Block×Block adjacency matrix |
| `svg` | `diagram.svg` | `generate_svg_diagram()` — Portable SVG snapshot with positioned blocks and connection lines |

---

## Import Formats

| Format | Function | Parsable Elements |
|--------|----------|------------------|
| **Mermaid Flowchart** | `parse_mermaid_flowchart()` | Node definitions (`A[Label]`, `A{Label}`, `A(Label)`), connections (`A --> B`, `A -.-> B`), edge labels (`A -->&#124;label&#124; B`) |
| **CSV Blocks** | `import_from_csv()` | Columns: name, type, x, y, status + any additional columns as attributes |
| **CSV Connections** | `import_from_csv()` | Columns: from, to, kind, protocol |

Post-import validation via `validate_imported_diagram()`:
- Checks for duplicate block names
- Validates connection references to existing block IDs

---

## Rule Checks (Python)

| Rule | Function | Severity | Checks |
|------|----------|----------|--------|
| Logic Level Compatibility | `check_logic_level_compatibility()` | error/warning | Voltage mismatch between connected blocks; allows 3.3V↔5V_tolerant |
| Logic Level Bulk | `check_logic_level_compatibility_bulk()` | error | All connections at once |
| Power Budget | `check_power_budget()` / `check_power_budget_bulk()` | error | Total consumption vs. supply in mW; parses `mA` values at 3.3V |
| Implementation Completeness | `check_implementation_completeness()` | warning | Blocks marked "Implemented" without attributes/interfaces/links |
| Placeholder Status | `check_implementation_completeness_bulk()` | warning | Blocks still in Placeholder status |

Orchestration: `run_all_rule_checks()` runs
power_budget + implementation_completeness +
logic_level for each connection.

---

## Validation (Python)

| Function | Purpose |
|----------|---------|
| `validate_diagram()` | JSON schema validation (uses jsonschema library if available; basic key check fallback) |
| `validate_links()` | Validate block links: CAD needs occToken+docId, ECAD needs device, external needs identifier |
| `validate_diagram_links()` | Validate all links across diagram |
| `compute_block_status()` | Auto-compute status: Placeholder → Planned → In-Work → Implemented → Verified based on attributes, interfaces, links |
| `update_block_statuses()` | Batch update all block statuses |
| `get_status_color()` | Status → hex color mapping |

---

## Hierarchy System

| Function | Purpose |
|----------|---------|
| `create_child_diagram()` | Create empty child diagram on parent block |
| `has_child_diagram()` | Check if block has `childDiagram` |
| `get_child_diagram()` | Get child diagram dict |
| `compute_hierarchical_status()` | Parent status ≤ worst child status |
| `get_all_blocks_recursive()` | Flatten all blocks including nested children |
| `find_block_path()` | Get hierarchical path (list of IDs) to any block |
| `validate_hierarchy_interfaces()` | Check parent interfaces match child diagram interfaces |

JS-side hierarchy navigation:
- `AdvancedFeatures._hierarchyStack` tracks drill-down stack
- `handleNavigateUp()` pops stack, renders parent diagram
- `handleDrillDown()` pushes current, renders child diagram
- Breadcrumb trail updates in `#breadcrumb-path`

---

## CAD Integration Features (cad.py)

| Function | Purpose |
|----------|---------|
| `create_enhanced_cad_link()` | Create link with component properties and sync status |
| `update_component_properties()` | Update material, mass, volume, bounding box |
| `mark_component_as_missing()` | Mark component as not found in Fusion |
| `mark_component_as_error()` | Mark component with error status |
| `validate_enhanced_cad_link()` | Validate link has required fields |
| `calculate_component_completion_percentage()` | 0-100% based on link, sync, properties |
| `get_component_health_status()` | Overall health: healthy/warning/critical/needs_sync |
| `generate_component_thumbnail_placeholder()` | SVG placeholder thumbnail |
| `generate_component_thumbnail_data()` | Actual or placeholder thumbnail data |
| `sync_all_components_in_diagram()` | Sync all CAD components |
| `create_component_dashboard_data()` | Dashboard overview data |

### 3D Visualization (cad.py)

| Function | Purpose |
|----------|---------|
| `initialize_3d_visualization()` | Init overlay position, highlight color, group boundary, live thumbnail settings |
| `update_3d_overlay_position()` | Set 3D coordinates for overlay |
| `set_component_highlight_color()` | Set highlight color (hex validation) |
| `enable_system_grouping()` | Enable group boundary visualization for block set |
| `create_3d_connection_route()` | 3D waypoint routing with cable properties |
| `update_live_thumbnail()` | Update base64 thumbnail for block |

### Living Documentation (cad.py)

| Function | Purpose |
|----------|---------|
| `initialize_living_documentation()` | Init assembly sequence, BOM entry, service manual, change impact, manufacturing progress |
| `generate_assembly_sequence()` | Topological sort of blocks by connections; handles circular deps |
| `estimate_assembly_time()` | Time estimate based on interfaces, links, type multiplier |
| `determine_complexity()` | simple/moderate/complex/critical based on interfaces, links, child diagrams |
| `generate_assembly_instructions()` | Step-by-step instructions list |
| `generate_living_bom()` | Full BOM with items, costs, categories, summary |
| `track_change_impact()` | Analyze downstream impact; low/medium/high/critical levels |
| `update_manufacturing_progress()` | Track stage (design/prototype/production/complete) and completion % |

---

## Multi-Selection System (AdvancedFeatures)

| Method | Purpose |
|--------|---------|
| `addToSelection()` | Add block to multi-selection set |
| `removeFromSelection()` | Remove block from set |
| `toggleSelection()` | Toggle block in/out of set (Ctrl+Click) |
| `clearSelection()` | Clear entire selection set |
| `selectAll()` | Select all blocks |
| `invertSelection()` | Invert selection |
| `startLassoSelection()` | Begin drag-select rectangle |
| `updateLassoSelection()` | Update lasso rect during drag |
| `finishLassoSelection()` | Complete lasso; select enclosed blocks |

---

## Undo/Redo System (AdvancedFeatures)

| Property/Method | Details |
|-----------------|---------|
| `maxUndoLevels` | 50 |
| `saveState()` | Deep clone diagram + groups + layers |
| `undo()` | Pop undo stack, push to redo, restore |
| `redo()` | Pop redo stack, push to undo, restore |
| `restoreState()` | Restore diagram, groups, layers; re-render |

---

## Group Management (AdvancedFeatures)

| Method | Purpose |
|--------|---------|
| `createGroup()` | Create group from selected blocks; calc bounds |
| `ungroupBlocks()` | Dissolve group; remove boundary |
| `calculateGroupBounds()` | Bounding box for group |
| `renderGroupBoundary()` | Draw dashed rectangle around group |
| `removeGroupBoundary()` | Remove group visual |

---

## Layer Management (AdvancedFeatures)

| Method | Purpose |
|--------|---------|
| `createLayer()` | Create named layer |
| `moveBlocksToLayer()` | Move blocks to layer |
| `updateLayerVisibility()` | Toggle layer visibility (opacity + display) |

---

## Notification System

| Method | Colors | Duration |
|--------|--------|----------|
| `PythonInterface.showNotification(msg, type)` | info=#0078d4, success=#2e7d32, warning=#ef6c00, error=#c62828 | 4 seconds auto-remove |

Fixed-position toast notification in top-right corner with
colored left border.

---

## Fusion 360 Add-in Registration

### Commands Registered

| Command ID | Type | Location |
|------------|------|----------|
| `SystemBlocksPaletteShowCommand` | Button | UTILITIES tab → Add-Ins panel |
| `SystemBlocksDiagnosticsCommand` | Button | Appears in same panel |

### Palette Configuration

| Property | Value |
|----------|-------|
| Palette ID | `SystemBlocksPalette` |
| Title | System Blocks |
| HTML Source | `src/palette.html` (file:// URL) |
| `useNewWebBrowser` | `True` (Chromium CEF) |
| Docking | Right panel |
| Size | 400×600 initial |

---

## Error States and Edge Cases

| Scenario | Handling |
|----------|----------|
| No active Fusion document | Persistence functions return None/False; diagnostics report appropriately |
| Bridge action not in enum | Warning logged; handler still attempted via `_handle_{action}` lookup |
| Unknown bridge action | Returns `{"success": false, "error": "Unknown action: {action}"}` |
| Invalid diagram JSON | Falls back to `create_empty_diagram()` |
| Save validation failure | Returns `{"success": false, "error": "Diagram validation or save failed"}` |
| Empty JSON-Patch | Short-circuits with `{"success": true, "patched": false}` |
| Export folder creation fails | Returns error with OS exception message |
| Individual export format fails | Other formats still exported; error key added to response |
| CAD selection timeout | 30-second polling timeout; stops polling |
| CAD link push missed by webview | `_pending_cad_link` global stores data; JS polls to retrieve |
| Circular dependencies in assembly | Blocks marked "critical" complexity with warning instruction |
| jsonschema not available | Falls back to basic key-existence validation |
| Connection to non-existent block | Connection not drawn; silently skipped |
| Self-connection attempt | Prevented by `addConnection()` validation |
| Duplicate connection attempt | Prevented by `addConnection()` validation |
| CEF doesn't render marker-start | Manual polygon arrowhead workaround |
| CEF doesn't show title tooltips | Custom CSS tooltip system with 400ms delay |
| Unsaved changes on New | Confirm dialog before clearing |

---

## CSS / Responsive Behavior

### Custom Tooltip System

- CSS-based because Fusion CEF ignores native `title` attributes
- 400ms show delay via CSS transition
- Positioned below button with small triangle pointer
- Tooltip text stored in `data-tooltip` attribute

### Ribbon Responsive

- Ribbon groups collapse/wrap based on palette width
- Buttons use icon-only mode at narrow widths
- (Details in fusion-ribbon.css)

### Theme

- CSS custom properties for theming (fusion-theme.css)
- Dark/light mode support via Fusion preferences
- Status colors, accent colors, border colors defined as CSS variables

---

## Test Coverage Summary

The existing test suite covers these areas (from `tests/` directory):

| Test File | Coverage Area |
|-----------|--------------|
| `test_adapter.py` | Fusion adapter layer |
| `test_cad.py` | CAD linking, enhanced links, thumbnails, BOM, assembly sequence |
| `test_core_action_plan.py` | Action plan generation |
| `test_core_validation.py` | Core validation logic |
| `test_delta.py` | JSON-Patch delta operations |
| `test_diagram_data.py` | Diagram data CRUD operations |
| `test_document.py` | Document persistence |
| `test_export_reports.py` | All export formats |
| `test_graph_builder.py` | Graph construction |
| `test_hierarchy.py` | Hierarchy operations |
| `test_import.py` | Mermaid + CSV import |
| `test_integration.py` | End-to-end integration |
| `test_logging_util.py` | Logging utilities |
| `test_models.py` | Data models |
| `test_property_based.py` | Property-based testing |
| `test_requirements.py` | Requirements tracking |
| `test_rule_checks.py` | Rule engine checks |
| `test_schema.py` | JSON schema validation |
| `test_selection.py` | Selection logic |
| `test_serialization.py` | Serialization roundtrips |
| `test_status_tracking.py` | Status computation and tracking |
| `test_validation.py` | Validation functions |
