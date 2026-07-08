Detailed step-by-step test plan for the current Fusion System Blocks
repository. This document replaces the older milestone-by-milestone,
future-state checklist with a current-state verification plan.

## Current Baseline

- Updated: April 3, 2026
- Repository status: 18 milestones total; 16 complete; 2 not started
  (Milestone 13 and Milestone 15)
- Latest local automated regression: `pytest -q` passed 775 tests
- In-app diagnostics baseline: `DiagnosticsRunner` discovers 32 checks
- Companion smoke plan:
  [FUSION_MANUAL_TEST_PLAN.md](FUSION_MANUAL_TEST_PLAN.md)

## Purpose

Use this document for full regression and release validation of the add-in as
it exists now. It is organized as an execution plan, not as a historical
feature catalog.

The main changes from the older version are:

- Removed test phases that treated future milestones as already shipped.
- Converted broad milestone prose into explicit run-order steps.
- Marked partial or backend-only features so they do not become false release
  blockers.
- Added current regression focus areas such as named-document behavior,
  snapshot persistence, bridge readiness, and power-budget validation.

## Scope

| Area | How it is covered here | Status |
| --- | --- | --- |
| Core diagramming, persistence, hierarchy, exports, CAD linking, rules, history, accessibility | Primary manual acceptance | Fully in scope |
| Requirements verification | Hybrid manual plus seeded fixture | In scope, but no dedicated authoring UI |
| Schema migration | Hybrid manual plus prepared legacy document | In scope |
| Snapshot comparison | Backend-capable only | Not a primary manual gate |
| ECAD linking | UI placeholder only | Informational, not a release gate |
| Milestone 13: 3D visualization and living documentation | Excluded from this pass | Not implemented as a shipped user workflow |
| Milestone 15: AI-powered assistant | Excluded from this pass | Not implemented |

## Test Environment

- Autodesk Fusion installed and running.
- Fusion System Blocks deployed to the Fusion add-in folder.
- Fusion restarted after deployment.
- A test Fusion document open with at least 3 components and 1 subassembly.
- A writable export folder available for report generation checks.
- Access to the session log directory:
  `%USERPROFILE%\FusionSystemBlocks\logs\`
- Optional but recommended:
  - A second Fusion document open for multi-document CAD-link regression.
  - A prepared fixture document that already contains top-level
    `requirements` data.
  - A prepared legacy document saved without `schemaVersion` for migration
    testing.

## Execution Order

1. Run automated preflight first.
2. Run Fusion startup and diagnostics before opening the palette.
3. Execute Phases 2 through 11 in order for the main manual pass.
4. Run Phase 12 for accessibility, undo history panel, and recovery checks.
5. Run Phase 13 when validating requirements and legacy-schema behavior.
6. Record failures with screenshots, exported artifacts, and log paths.

## Phase 0: Automated Preflight

Run these steps from the repository root before starting Fusion-side manual
testing.

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 0.1 | Activate the project environment and confirm you are in the repo root. | Commands run against the correct workspace. | [ ] |
| 0.2 | Run `pytest -q`. | All tests pass. Current baseline on this repo state: 775 passed. | [ ] |
| 0.3 | Run `ruff check .`. | No lint failures. | [ ] |
| 0.4 | Review editor diagnostics for touched files. | No blocking syntax or import errors remain. | [ ] |
| 0.5 | If any preflight step fails, stop the manual pass and log the blocker. | Manual testing does not continue on a known-bad baseline. | [ ] |

## Phase 1: Fusion Launch and Diagnostics

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 1.1 | Open the Fusion test document. | Fusion is running with a writable design open. | [ ] |
| 1.2 | Open Utilities -> Add-Ins. | `Fusion System Blocks` and `Run Diagnostics` are visible. | [ ] |
| 1.3 | Run `Run Diagnostics`. | Diagnostics complete without crashing Fusion. | [ ] |
| 1.4 | Review the diagnostics summary. | All 32 checks pass and a log path is shown. | [ ] |
| 1.5 | Launch `Fusion System Blocks`. | The palette opens successfully. | [ ] |
| 1.6 | Watch for startup errors or dialog boxes. | No uncaught startup exception is surfaced to the user. | [ ] |
| 1.7 | Wait for the footer bridge pill to settle. | Footer shows `Bridge: connected` with queue and pending counts. | [ ] |
| 1.8 | Confirm a new session log was created. | A timestamped log file exists in the System Blocks log folder. | [ ] |

## Phase 2: Palette Shell, Ribbon, Tabs, and Help

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 2.1 | Inspect the ribbon. | 11 groups are present: File, Edit, Create, Navigate, Select, Arrange, Annotate, View, Validate, CAD Links, Help. | [ ] |
| 2.2 | Inspect the secondary toolbar. | Search input, status filters, connection-type dropdown, arrow-direction dropdown, and breadcrumb are visible. | [ ] |
| 2.3 | Inspect the tab bar. | The tabs `Home`, `Diagram`, `Linking`, `Validation`, `Reqs`, `History`, and `Reports` are visible and clickable. | [ ] |
| 2.4 | Inspect the footer. | `Save`, `Autosave`, `Health`, `Last saved`, and `Bridge` controls are visible. | [ ] |
| 2.5 | Hover a ribbon button for about 0.5 seconds. | The short tooltip appears. | [ ] |
| 2.6 | Keep hovering the same button for about 2 seconds. | The expanded tooltip appears with description and shortcut. | [ ] |
| 2.7 | Resize the palette to a narrow width. | Controls remain usable; ribbon groups do not overlap. | [ ] |
| 2.8 | Resize the palette wide again. | Groups and controls lay out cleanly. | [ ] |
| 2.9 | Press `F1`. | The help overlay opens. | [ ] |
| 2.10 | Press `?`. | The keyboard-shortcuts dialog opens. | [ ] |

## Phase 3: Core Diagram Editing, Block Libraries, and Properties

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 3.1 | Start a new diagram from the Home tab or the File ribbon group. | The canvas is blank and ready for editing. | [ ] |
| 3.2 | Add a generic block from the Create workflow. | A new block appears on the canvas. | [ ] |
| 3.3 | Add an electrical block from the block-type library or quick block menu. | An electrical block is created with electrical styling. | [ ] |
| 3.4 | Add a mechanical block from the block-type library. | A mechanical block is created with mechanical styling. | [ ] |
| 3.5 | Add a software block from the block-type library. | A software block is created with software styling. | [ ] |
| 3.6 | Double-click a block name and rename it inline. | The block label updates immediately. | [ ] |
| 3.7 | Select a block and inspect the right-side properties panel. | Name, Type, Status, Shape, Attributes, and connection summary fields are visible. | [ ] |
| 3.8 | Inspect the default engineering attributes on a newly created block. | The default keys exist: Manufacturer, Part Number, Datasheet URL, Rating / Specification, Cost, Lead Time, Notes. | [ ] |
| 3.9 | Cycle one block through all 8 shapes. | Rectangle, Rounded, Diamond, Ellipse, Hexagon, Parallelogram, Cylinder, and Triangle all render correctly. | [ ] |
| 3.10 | Drag the block around the canvas and resize it. | Movement is smooth; resize handles work; snap-to-grid behavior is consistent when enabled. | [ ] |
| 3.11 | Copy and paste a selected block or duplicate it with the keyboard shortcut. | A distinct copy is created with preserved visual properties. | [ ] |
| 3.12 | Delete a selected block, then undo and redo the action. | Delete, undo, and redo all behave correctly. | [ ] |

## Phase 4: Selection, Grouping, Arrange Tools, and Annotations

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 4.1 | Click a single block. | Only that block is selected. | [ ] |
| 4.2 | Ctrl+click additional blocks. | Multi-selection grows without losing earlier selections. | [ ] |
| 4.3 | Press `Ctrl+A`. | All blocks are selected. | [ ] |
| 4.4 | Press `Escape`. | The selection clears. | [ ] |
| 4.5 | Lasso-select several blocks by dragging on empty canvas space. | Blocks inside the lasso are selected; text is not accidentally selected instead. | [ ] |
| 4.6 | With 2 or more blocks selected, click `Create Group`. | A dashed group boundary appears and persists. | [ ] |
| 4.7 | Click `Ungroup`. | The group boundary disappears and the blocks become independent. | [ ] |
| 4.8 | Scatter 4 or more blocks, then click `Auto Layout`. | Blocks rearrange into a cleaner layout with no obvious overlap. | [ ] |
| 4.9 | Select 3 blocks and run `Align Left`, `Align Center`, and `Align Right`. | The selected blocks align correctly for each command. | [ ] |
| 4.10 | Select 4 or more blocks and run `Distribute Horizontal`. | Spacing becomes even across the selection. | [ ] |
| 4.11 | Drag one block near another block edge. | Smart alignment guides appear and snapping behaves consistently. | [ ] |
| 4.12 | Add a text annotation. | A text annotation appears and is editable. | [ ] |
| 4.13 | Add a note, a dimension, and a callout annotation. | All 3 annotation types render and persist on the canvas. | [ ] |
| 4.14 | Edit one annotation and delete another. | Annotation edit and delete flows work correctly. | [ ] |

## Phase 5: Connections, Routing, Search, and Filters

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 5.1 | Hover a block. | Connection port dots appear. | [ ] |
| 5.2 | Create a connection using the port-dot workflow. | A connection is drawn between the selected blocks. | [ ] |
| 5.3 | Create another connection using `C` or the block context menu. | Keyboard and context-menu entry points work as well. | [ ] |
| 5.4 | Open the connection-type dropdown. | The options include auto, power, data, signal, electrical, mechanical, software, optical, and thermal. | [ ] |
| 5.5 | Change a connection through several types. | Stroke color and line style update for each type. | [ ] |
| 5.6 | Change arrow direction through forward, backward, bidirectional, and none. | Arrow rendering updates correctly at each setting. | [ ] |
| 5.7 | Select a connection and delete it. | The selected connection is removed. | [ ] |
| 5.8 | Attempt to connect a block to itself. | The self-loop is rejected. | [ ] |
| 5.9 | Attempt to create the same connection twice. | Duplicate connection creation is rejected. | [ ] |
| 5.10 | Toggle orthogonal routing mode on. | Connections render as right-angle routes instead of bezier curves. | [ ] |
| 5.11 | Move a block so it obstructs an orthogonal route. | The route recalculates around the obstacle. | [ ] |
| 5.12 | Add and then remove a waypoint in orthogonal mode. | The route bends through the waypoint, then recalculates after removal. | [ ] |
| 5.13 | Press `Ctrl+F` and search for a block by name. | Matching blocks remain visible and non-matching blocks dim. | [ ] |
| 5.14 | Use the status-filter buttons: All, Placeholder, Planned, In-Work, Implemented. | Filtering behaves as labeled; the `Implemented` filter includes Implemented and Verified blocks. | [ ] |

## Phase 6: Save, Load, Named Documents, Autosave, and Close Warnings

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 6.1 | Save the current diagram. | Save succeeds and no error notification appears. | [ ] |
| 6.2 | Inspect the footer after save. | `Last saved` updates to the current timestamp. | [ ] |
| 6.3 | Click `New`. | The active canvas clears. | [ ] |
| 6.4 | Click `Load`. | The previously saved diagram is restored. | [ ] |
| 6.5 | Use `Save As...` to save the current diagram as `Named Diagram A`. | A named document is created successfully. | [ ] |
| 6.6 | Make an obvious change and use `Save As...` again for `Named Diagram B`. | A second named document is created successfully. | [ ] |
| 6.7 | Use `Open...` to load `Named Diagram A`. | The A version is restored. | [ ] |
| 6.8 | Use `Open...` to load `Named Diagram B`. | The B version is restored. | [ ] |
| 6.9 | Trigger `Save` and `Load` from the Home tab. | Home-tab actions behave the same as the ribbon actions. | [ ] |
| 6.10 | Make an unsaved change and attempt to close the palette. | A browser-style unsaved-changes warning appears. | [ ] |
| 6.11 | Cancel the close action. | The palette stays open and the diagram is unchanged. | [ ] |
| 6.12 | Save the diagram and then close the palette. | The palette closes without the unsaved-changes warning. | [ ] |
| 6.13 | Reopen the palette, enable `Autosave`, make a small change, and wait at least 5 seconds. | The change is saved automatically and `Last saved` updates. | [ ] |
| 6.14 | Disable `Autosave`. | Autosave stops and an informational notification appears. | [ ] |

## Phase 7: Hierarchy and Cross-Diagram Navigation

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 7.1 | Select a parent block and create a child diagram. | Navigation moves into the child diagram. | [ ] |
| 7.2 | Inspect the breadcrumb. | It updates from `Root` to `Root > <Block Name>`. | [ ] |
| 7.3 | Add blocks inside the child diagram. | The child canvas behaves like the root canvas. | [ ] |
| 7.4 | Use `Go Up`. | Navigation returns to the parent diagram. | [ ] |
| 7.5 | Inspect the parent block after returning. | A child-diagram indicator is visible on the parent block. | [ ] |
| 7.6 | Use `Drill Down` on the same parent block. | Navigation returns to the child diagram. | [ ] |
| 7.7 | Save, close, reopen, and drill back into the child diagram. | Child-diagram data persists across save/load. | [ ] |
| 7.8 | Optional: if your regression target includes cross-diagram connections, test `Connect Across Diagrams...` from the context menu. | The cross-diagram picker works without corrupting the active diagram. | [ ] |
| 7.9 | Optional: if your regression target includes named stubs, create and rename a net stub. | Stub creation, rename, and persistence behave correctly. | [ ] |

## Phase 8: CAD Linking

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 8.1 | Select a block and click `Link to CAD`. | The palette hides and Fusion enters component-selection mode. | [ ] |
| 8.2 | Select a component in the Fusion viewport. | The palette returns automatically. | [ ] |
| 8.3 | Inspect the linked block. | A CAD-link badge appears with the selected component name. | [ ] |
| 8.4 | Inspect notifications and the Linking tab status. | The UI reports a successful CAD link. | [ ] |
| 8.5 | Save and reload the diagram. | The CAD-link badge and stored metadata persist. | [ ] |
| 8.6 | Link the same block to a different component. | The badge and stored component name update cleanly. | [ ] |
| 8.7 | Trigger CAD selection from the `Linking` tab instead of the ribbon. | The same selection workflow runs successfully. | [ ] |
| 8.8 | Start CAD selection again and cancel with `Escape`. | The palette returns and the cancellation is surfaced cleanly. | [ ] |
| 8.9 | If you have multiple Fusion documents open, repeat one link operation on the active test document. | The link resolves against the correct document and does not pick stale metadata from another open design. | [ ] |

Notes for this phase:

- The ECAD button exists in the UI, but the authoring flow is still a
  placeholder. Do not fail the release solely because ECAD linking is not a
  completed user workflow yet.

## Phase 9: Validation, Visible Status Behavior, and Power Rules

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 9.1 | Open the `Validation` tab. | Error and warning filters, category dropdown, run button, and results list are visible. | [ ] |
| 9.2 | Create an obvious orphan or placeholder block and run `Run Checks`. | At least one validation result appears. | [ ] |
| 9.3 | Manually set a block status to `Implemented` without adding interfaces, attributes, and links, then rerun checks. | The implementation-completeness rule flags the mismatch. | [ ] |
| 9.4 | Create a power-supply block with `output_current = 1000mA` and a load block with `current = 200mA`, then rerun checks. | No power-budget error is reported for that pair. | [ ] |
| 9.5 | Reduce the supply to `100mA` and rerun checks. | A power-budget exceeded error appears. | [ ] |
| 9.6 | Change the supply value to `abc` and rerun checks. | An invalid-power-value error appears instead of being silently ignored. | [ ] |
| 9.7 | Remove the supply value or delete the supply block and rerun checks. | A warning reports incomplete or missing power data. | [ ] |
| 9.8 | Watch the footer health pill before and after fixing issues. | It moves between `Issues detected` and `OK` appropriately. | [ ] |
| 9.9 | Inspect the Home-tab status legend against block colors. | Placeholder, Planned, In-Work, Implemented, and Verified colors still match the UI. | [ ] |

Notes for this phase:

- Automatic status computation still exists in the core logic and automated
  tests, but the current manual pass should focus on visible status selection,
  legends, and validation output.

## Phase 10: History, Snapshots, and Named-Document Snapshot Scope

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 10.1 | Open the `History` tab on a fresh default-scope diagram. | The empty-state message reads `No snapshots yet.` | [ ] |
| 10.2 | Create a snapshot with the description `v1`. | A snapshot entry appears in the list. | [ ] |
| 10.3 | Make a visible change and create a second snapshot `v2`. | A second snapshot appears. | [ ] |
| 10.4 | Click `Refresh`. | The list remains current and ordered with the newest snapshot first. | [ ] |
| 10.5 | Restore the older snapshot. | The diagram returns to the earlier state. | [ ] |
| 10.6 | Save, close, reopen, and reload the diagram. | The snapshot list persists with the document. | [ ] |
| 10.7 | Save the diagram as `Named Diagram A` and create snapshot `A1`. | Snapshot `A1` appears under that named document. | [ ] |
| 10.8 | Save the diagram as `Named Diagram B` and create snapshot `B1`. | Snapshot `B1` appears under that second named document. | [ ] |
| 10.9 | Reopen `Named Diagram A`. | The History tab shows only the A-scope snapshots. | [ ] |
| 10.10 | Reopen `Named Diagram B`. | The History tab shows only the B-scope snapshots. | [ ] |
| 10.11 | Start a brand-new unnamed diagram after using a named document. | The active named-document scope clears and the History tab refreshes back to the default scope. | [ ] |

Notes for this phase:

- Snapshot comparison exists in the backend and bridge contract, but there is
  no primary compare control in the History UI yet. Treat snapshot comparison
  as backend coverage rather than a manual release gate.

## Phase 11: Import, Export, Reporting, and Exported Artifacts

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 11.1 | Open the Import dialog. | Mermaid and CSV import modes are available. | [ ] |
| 11.2 | In Mermaid mode, paste the fixture from Appendix A and import it. | The expected blocks and connection are created. | [ ] |
| 11.3 | Reopen the dialog in CSV mode and paste the block and connection fixtures from Appendix A. | CSV import succeeds and the diagram matches the fixture. | [ ] |
| 11.4 | Open the Export dialog from the Reports tab or the File ribbon group. | The export dialog opens without error. | [ ] |
| 11.5 | Inspect the format list. | All 11 formats are present. | [ ] |
| 11.6 | Click `Select None`, then `Select All`. | The selection helpers work correctly. | [ ] |
| 11.7 | Export only Markdown and HTML to a temporary folder. | Exactly 2 files are produced. | [ ] |
| 11.8 | Export the full set of formats to a temporary folder. | All 11 files are produced. | [ ] |
| 11.9 | Open the Markdown report. | It contains an executive summary plus block and connection data. | [ ] |
| 11.10 | Open the HTML report. | It contains the same summary data with styled output and print-ready formatting. | [ ] |
| 11.11 | Open BOM CSV and BOM JSON. | Item data, quantities, and totals are present and consistent. | [ ] |
| 11.12 | Open Assembly Sequence Markdown and JSON. | Step ordering and metadata are present. | [ ] |
| 11.13 | Open the Connection Matrix CSV. | The adjacency matrix reflects the current connections. | [ ] |
| 11.14 | Open the SVG output. | Shapes, colors, and connection rendering are recognizable and non-empty. | [ ] |
| 11.15 | Open the PDF output. | The PDF contains header, block, connection, and validation content. | [ ] |

Notes for this phase:

- The backend supports `quick`, `standard`, and `full` export profiles, but the
  current UI drives exports through explicit format selection. Profile behavior
  is primarily covered by automated tests.

## Phase 12: Accessibility, Undo History Panel, and Crash Recovery

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 12.1 | Use arrow keys, `Home`, and `End` on the tab bar. | Tab focus and selection move according to the WAI-ARIA tab pattern. | [ ] |
| 12.2 | Tab through ribbon buttons with the keyboard. | A clear `:focus-visible` style is shown. | [ ] |
| 12.3 | Open a modal dialog and press `Tab` repeatedly, then `Escape`. | Focus stays inside the modal until `Escape` closes it. | [ ] |
| 12.4 | If high-contrast mode is available, enable it and inspect the palette. | Borders and focus outlines remain visible and usable. | [ ] |
| 12.5 | Open the undo history panel from the Edit ribbon group. | The history panel opens and shows labeled entries. | [ ] |
| 12.6 | Perform a few actions, then click an older entry in the history panel. | The diagram jumps to the selected historical state. | [ ] |
| 12.7 | Close the history panel. | The panel closes cleanly. | [ ] |
| 12.8 | Optional: create unsaved changes, wait at least 30 seconds for auto-backup, force-close the session, and reopen the add-in. | A recovery prompt appears on startup. | [ ] |
| 12.9 | Optional: choose `Recover` from the recovery prompt. | The recovered diagram is restored. | [ ] |
| 12.10 | Optional: repeat the recovery test and choose `Discard`. | The backup is removed and the recovery prompt does not reappear. | [ ] |

## Phase 13: Hybrid Verification for Requirements and Legacy Schema

Use this phase when you need to validate requirements and migration behavior.
These workflows are real, but they are not fully authorable through a polished
manual UI path yet.

| Step | Action | Expected Result | Pass |
| --- | --- | --- | --- |
| 13.1 | Load a prepared fixture document that contains a top-level `requirements` array, or seed one using the Appendix B JSON through a developer harness. | The diagram loads without dropping the requirement data. | [ ] |
| 13.2 | Open the `Reqs` tab and click `Check Requirements`. | The results table appears with pass/fail rows and the status pill updates. | [ ] |
| 13.3 | Save, close, reopen, and load the same fixture document. | Requirements survive persistence and still validate correctly. | [ ] |
| 13.4 | Load a prepared legacy document that has no `schemaVersion` field. | The document still loads successfully. | [ ] |
| 13.5 | Save that legacy document and reload it again. | The migrated document continues to load after save. | [ ] |
| 13.6 | If you are using automated coverage instead of seeded manual data, rerun targeted tests: `pytest -q tests/test_requirements.py tests/test_version_control.py tests/test_status_tracking.py tests/test_rule_checks.py`. | Targeted requirements, version-control, status, and rule tests all pass. | [ ] |

## Known Partial or Deferred Areas

- ECAD linking remains a placeholder UI path and is not a release-blocking
  manual acceptance item yet.
- Snapshot comparison is backend-capable but does not have a primary compare
  control in the History panel.
- Milestone 13 user-facing 3D visualization and living-documentation workflows
  are not part of this manual test pass.
- Milestone 15 AI workflows are not part of this manual test pass.

## Defect Capture Checklist

For every failure, record all of the following:

- Phase and step number
- Exact user action and expected result
- Actual result
- Whether the issue is reproducible
- Screenshot or exported artifact, if applicable
- Fusion version, OS, and whether a named document was active
- Relevant log file path from `%USERPROFILE%\FusionSystemBlocks\logs\`

## Pass Criteria

- Phase 0 and Phase 1 must pass before the rest of the plan is considered
  valid.
- All non-optional steps in Phases 2 through 11 should pass for release
  readiness.
- Phase 12 optional recovery steps and Phase 13 hybrid steps may be satisfied by
  either seeded manual verification or targeted automated tests, depending on
  the release scope.
- Any failure in persistence, load integrity, CAD linking, export correctness,
  or rule validation is release-blocking.

## Appendix A: Pasteable Import Fixtures

### Mermaid Fixture

```text
flowchart TD
  A[Power Supply] --> B[Controller]
```

### CSV Blocks Fixture

```csv
name,type,x,y,status
Power Supply,PowerSupply,100,100,Verified
Controller,Microcontroller,320,100,Planned
```

### CSV Connections Fixture

```csv
from,to,kind,protocol
Power Supply,Controller,electrical,3.3V
```

## Appendix B: Requirements Fixture for Seeded Manual Tests

Do not paste this into the Import dialog. The current Import dialog supports
Mermaid and CSV only. Use this JSON through a prepared Fusion document or a
developer harness.

```json
{
  "schemaVersion": "1.0",
  "schema": "system-blocks-v2",
  "id": "req-fixture",
  "name": "Requirements Fixture",
  "blocks": [
    {
      "id": "b1",
      "name": "Battery",
      "type": "Electrical",
      "x": 100,
      "y": 100,
      "status": "Implemented",
      "attributes": {
        "mass": "2.5",
        "voltage": "3.3"
      },
      "links": [],
      "interfaces": []
    },
    {
      "id": "b2",
      "name": "Controller",
      "type": "Software",
      "x": 320,
      "y": 100,
      "status": "Implemented",
      "attributes": {
        "mass": "1.3"
      },
      "links": [],
      "interfaces": []
    }
  ],
  "connections": [],
  "groups": [],
  "namedStubs": [],
  "metadata": {},
  "requirements": [
    {
      "id": "r1",
      "name": "Max Weight",
      "targetValue": 5.0,
      "operator": "<=",
      "unit": "kg",
      "linkedAttribute": "mass",
      "tolerance": 0.0
    },
    {
      "id": "r2",
      "name": "Bus Voltage",
      "targetValue": 3.3,
      "operator": "==",
      "unit": "V",
      "linkedAttribute": "voltage",
      "tolerance": 0.01
    }
  ]
}
```

## Results Summary

| Phase | Area | Result | Notes |
| --- | --- | --- | --- |
| 0 | Automated preflight |  |  |
| 1 | Fusion launch and diagnostics |  |  |
| 2 | Palette shell, ribbon, tabs, and help |  |  |
| 3 | Core editing, block libraries, and properties |  |  |
| 4 | Selection, grouping, arrange tools, and annotations |  |  |
| 5 | Connections, routing, search, and filters |  |  |
| 6 | Save, load, named documents, autosave, and close warnings |  |  |
| 7 | Hierarchy and cross-diagram navigation |  |  |
| 8 | CAD linking |  |  |
| 9 | Validation, visible status behavior, and power rules |  |  |
| 10 | History, snapshots, and named-document snapshot scope |  |  |
| 11 | Import, export, reporting, and exported artifacts |  |  |
| 12 | Accessibility, undo history panel, and crash recovery |  |  |
| 13 | Hybrid requirements and legacy schema verification |  |  |

Tester: ____________________

Date: ____________________

Fusion version: ____________________

OS: ____________________

Overall result: [ ] PASS  [ ] FAIL