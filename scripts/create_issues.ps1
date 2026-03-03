#!/usr/bin/env pwsh
# Create GitHub issues for Lucidchart-parity features
# Run from the repo root: .\scripts\create_issues.ps1

$repo = "zcohen-nerd/Fusion_System_Blocks"

$issues = @(
    # ========== P0 — Critical UX Gaps ==========
    @{
        Title  = "[P0] Drag-from-palette shape panel"
        Labels = "enhancement,ux,tier-1-blocking"
        Body   = @"
## Summary
Add a left sidebar shape palette that allows users to drag block shapes directly onto the SVG canvas, replacing the current toolbar "Add Block" button workflow.

## Priority
**P0** — This is the single biggest usability gap compared to Lucidchart.

## Problem
Currently, adding a block requires clicking an "Add Block" toolbar button and selecting a type from a dropdown. This is slow and unintuitive compared to the industry-standard drag-and-drop pattern used by Lucidchart, draw.io, Visio, etc.

## Proposed Solution
- **Left sidebar panel** with collapsible categories (Electrical, Mechanical, Software, Generic)
- **Shape thumbnails** showing a visual preview of each block type
- **HTML5 drag-and-drop** from the sidebar onto the SVG canvas
- Drop position should snap to grid
- The palette tab system (``palette-tabs.js``) is already scaffolded and can be extended

## Acceptance Criteria
- [ ] Sidebar shows categorized block shapes with visual previews
- [ ] Users can drag a shape from the sidebar and drop it onto the canvas
- [ ] Dropped block snaps to grid and is immediately selected
- [ ] Sidebar categories are collapsible
- [ ] Search/filter within the shape palette
- [ ] Works within CEF (Fusion 360 embedded browser)

## Effort Estimate
Medium

## Reference
Lucidchart shape panel, draw.io sidebar, Visio stencils
"@
    },
    @{
        Title  = "[P0] Port-to-port direct connection dragging"
        Labels = "enhancement,ux,tier-1-blocking"
        Body   = @"
## Summary
Replace the two-click "Connection Mode" state machine with direct port-to-port drag interaction — hover a block to reveal connection points, then drag from one port to another block's port.

## Priority
**P0** — This is how every modern diagram tool works.

## Problem
FSB currently requires entering "Connection Mode" via a toolbar button, then clicking a source block, then clicking a destination block. This is a 3-step process for what should be a single drag gesture.

## Proposed Solution
- Show connection port indicators on hover (small circles at block edges)
- Click-and-drag from a port to start a connection
- Show a rubber-band preview line while dragging
- Snap to the nearest compatible port on the target block
- Auto-detect connection type based on block types (or prompt user)
- Pressing Escape cancels the in-progress connection

## Acceptance Criteria
- [ ] Hovering a block reveals connection port indicators
- [ ] Dragging from a port shows a rubber-band preview line
- [ ] Dropping on a valid port creates the connection
- [ ] Dropping on empty canvas cancels (or creates a dangling stub)
- [ ] Port indicators use color coding for compatibility
- [ ] Existing Connection Mode toolbar button still works as fallback
- [ ] Works within CEF

## Effort Estimate
Medium

## Reference
Lucidchart connection dragging, draw.io port hovering
"@
    },
    @{
        Title  = "[P0] Render connection labels"
        Labels = "enhancement,tier-1-blocking"
        Body   = @"
## Summary
The data model already supports connection labels, but ``diagram-renderer.js`` never draws them. Implement rendering and inline editing of connection labels.

## Priority
**P0** — Table-stakes for engineering diagrams (signal names, wire gauges, pipe sizes).

## Problem
Users can set connection labels in the data model, but they are invisible on the canvas. This makes diagrams incomplete for engineering documentation.

## Proposed Solution
- Render connection labels at the midpoint of each connection path
- Labels should follow the path angle or be horizontal (configurable)
- Click a connection line to select it, double-click to edit the label inline
- Label text should have a semi-transparent background for readability
- Support label offset (drag label position along the path)

## Acceptance Criteria
- [ ] Connection labels render at the path midpoint
- [ ] Labels have a readable background
- [ ] Double-click a connection to edit its label inline
- [ ] Labels persist through save/load
- [ ] Labels appear in exports (SVG, PNG)
- [ ] Label position can be adjusted by dragging

## Effort Estimate
Small

## Reference
Lucidchart connection labels, Visio connector text
"@
    },

    # ========== P1 — High-Impact Polish ==========
    @{
        Title  = "[P1] Corner rounding on orthogonal routes"
        Labels = "enhancement,ux,tier-2-powerful"
        Body   = @"
## Summary
Add small radius arcs at corners of orthogonal (Manhattan) connection routes to make them look polished and professional.

## Priority
**P1** — Small effort, high visual impact.

## Problem
Orthogonal routes currently have sharp 90-degree corners, which look rigid and less professional compared to Lucidchart's smooth rounded corners.

## Proposed Solution
- In ``orthogonal-router.js``, modify the SVG path generation to use arc commands (``A``) or quadratic curves (``Q``) at corners
- Add a configurable corner radius (default: 6-8px)
- Ensure rounded corners don't cause path overlap on short segments

## Acceptance Criteria
- [ ] Orthogonal route corners are visually rounded
- [ ] Corner radius is configurable
- [ ] Short segments gracefully degrade (no overlapping arcs)
- [ ] Performance is not impacted (path strings are slightly longer but no extra DOM elements)

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P1] Floating action bar on block selection"
        Labels = "enhancement,ux,tier-2-powerful"
        Body   = @"
## Summary
When a block is selected, show a floating toolbar near the block with quick actions (change color, add text, duplicate, delete, connect).

## Priority
**P1** — Gives immediate action discoverability without right-clicking.

## Problem
Currently, actions on a selected block are only available through the ribbon toolbar or a right-click context menu. New users don't discover available actions.

## Proposed Solution
- Floating bar appears above or below the selected block
- Contains icon buttons: Delete, Duplicate, Change Color/Status, Connect, Edit Properties
- Positioned relative to the block in SVG coordinates, follows zoom/pan
- Dismisses when clicking away or selecting a different block
- Does not overlap the block itself

## Acceptance Criteria
- [ ] Floating bar appears on single block selection
- [ ] Bar contains at least: Delete, Duplicate, Status, Connect actions
- [ ] Bar repositions on pan/zoom
- [ ] Bar dismisses on deselection
- [ ] Bar does not appear during multi-select (use ribbon instead)
- [ ] Keyboard shortcuts still work when bar is visible

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P1] Zoom-to-fit and zoom-to-selection"
        Labels = "enhancement,ux,tier-2-powerful"
        Body   = @"
## Summary
Add "Fit to page" and "Zoom to selection" commands that automatically adjust the viewBox to show all blocks or just selected blocks.

## Priority
**P1** — Used constantly in diagram tools to navigate large diagrams.

## Problem
Users have no quick way to see the entire diagram or focus on selected elements. They must manually pan and zoom.

## Proposed Solution
- **Zoom to fit**: Calculate bounding box of all blocks, set viewBox with padding
- **Zoom to selection**: Calculate bounding box of selected blocks, set viewBox with padding
- Both should animate the viewBox transition smoothly (250-300ms ease-out)
- Add toolbar buttons and keyboard shortcuts (``Ctrl+Shift+F`` for fit, ``Ctrl+Shift+1`` for selection)

## Acceptance Criteria
- [ ] "Zoom to Fit" shows all blocks with padding
- [ ] "Zoom to Selection" focuses on selected blocks
- [ ] ViewBox transition is animated
- [ ] Toolbar buttons added to the View section
- [ ] Keyboard shortcuts work
- [ ] Works correctly with empty diagrams (no-op or reset to default view)

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P1] Dynamic alignment guides during drag"
        Labels = "enhancement,ux,tier-2-powerful"
        Body   = @"
## Summary
Show dynamic snap/alignment guides (colored dashed lines) when dragging a block, indicating alignment with other blocks' centers, edges, and equal spacing.

## Priority
**P1** — Makes manual layout feel precise without relying on a visible grid.

## Problem
The renderer has ``renderAlignmentGuides()`` but it's unclear if it shows real-time guides during drag. Lucidchart and Figma show red/blue dashed lines when a dragged block aligns with another block's center or edge.

## Proposed Solution
- During block drag, calculate alignment with all other blocks
- Show horizontal/vertical guide lines for: center-to-center, edge-to-edge, equal spacing
- Snap to the guide position with a configurable threshold (e.g., 5px)
- Guide lines should be colored differently from the grid (e.g., magenta/cyan)
- Guides disappear when drag ends

## Acceptance Criteria
- [ ] Center alignment guides shown during drag
- [ ] Edge alignment guides shown during drag
- [ ] Equal spacing guides shown between 3+ blocks
- [ ] Block snaps to guide positions
- [ ] Guides are visually distinct from grid lines
- [ ] Guides disappear on mouse-up
- [ ] Performance is acceptable with 50+ blocks

## Effort Estimate
Medium
"@
    },

    # ========== P2 — Medium-Impact Enhancements ==========
    @{
        Title  = "[P2] Focal-point smooth zoom"
        Labels = "enhancement,ux,tier-3-pro"
        Body   = @"
## Summary
Improve scroll-wheel zoom to center on the cursor position with smooth easing, rather than zooming relative to the viewBox origin.

## Priority
**P2** — Small effort, noticeable quality improvement.

## Problem
Current zoom adjusts the viewBox but doesn't center the zoom on the cursor position. This forces users to pan after zooming to find their area of interest.

## Proposed Solution
- On wheel event, calculate the cursor position in SVG coordinates
- Adjust the viewBox so that the SVG point under the cursor stays fixed
- Apply ease-out animation (CSS transition on viewBox or requestAnimationFrame interpolation)
- Respect min/max zoom limits

## Acceptance Criteria
- [ ] Zooming centers on cursor position
- [ ] Zoom transition feels smooth (not jerky)
- [ ] Min/max zoom limits respected
- [ ] Pinch-to-zoom on trackpad also centers correctly (if supported)

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P2] Block rotation (90-degree increments)"
        Labels = "enhancement,tier-3-pro"
        Body   = @"
## Summary
Support rotating blocks in 90-degree increments. This is needed for engineering diagrams where component orientation matters.

## Priority
**P2** — Listed as a known gap in the codebase.

## Problem
Blocks cannot be rotated. In engineering block diagrams, component orientation (e.g., a motor mounted vertically vs. horizontally) is important for clarity.

## Proposed Solution
- Add a ``rotation`` property to the block data model (0, 90, 180, 270)
- Apply SVG ``transform="rotate()"`` during rendering
- Rotate connection port positions accordingly
- Add a rotation button to the floating action bar and context menu
- Keyboard shortcut: ``R`` to rotate selected block 90° clockwise

## Acceptance Criteria
- [ ] Blocks can be rotated in 90° increments
- [ ] Connection ports rotate with the block
- [ ] Rotation persists through save/load
- [ ] Rotation appears correctly in exports
- [ ] Keyboard shortcut ``R`` rotates selected block
- [ ] Undo/redo supports rotation

## Effort Estimate
Medium
"@
    },
    @{
        Title  = "[P2] Dark/light theme toggle"
        Labels = "enhancement,ux,tier-3-pro"
        Body   = @"
## Summary
Add a UI toggle to switch between dark and light themes. The CSS variable infrastructure (120+ variables in ``fusion-theme.css``) already exists.

## Priority
**P2** — Infrastructure is already in place, just needs an alternate value set and a toggle.

## Problem
FSB is dark-theme only. Some users prefer light themes, and engineering printouts often need a white background.

## Proposed Solution
- Define a ``.theme-light`` class with alternate values for all CSS variables
- Add a toggle button in the toolbar (sun/moon icon)
- Persist theme preference in localStorage
- SVG canvas background should also switch (white for light, dark for dark)

## Acceptance Criteria
- [ ] Light theme defined with readable colors
- [ ] Toggle button in toolbar
- [ ] Preference persisted across sessions
- [ ] SVG canvas background adapts
- [ ] All UI elements remain readable in both themes
- [ ] Exports use the active theme's colors

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P2] Command palette (Ctrl+K)"
        Labels = "enhancement,ux,tier-3-pro"
        Body   = @"
## Summary
Add a universal command palette (like VS Code's ``Ctrl+Shift+P``) that lets users search for and execute any action, navigate to blocks, or run commands by name.

## Priority
**P2** — Huge productivity multiplier for power users.

## Problem
Users must know where toolbar buttons are or remember keyboard shortcuts. A command palette makes all actions discoverable through search.

## Proposed Solution
- ``Ctrl+K`` opens a modal search overlay
- Index all available actions (Add Block, Delete, Align Left, Export SVG, etc.)
- Index all blocks by name for quick navigation ("Go to Motor Controller")
- Fuzzy matching on action names
- Recently used actions shown first
- Escape or clicking outside dismisses

## Acceptance Criteria
- [ ] ``Ctrl+K`` opens command palette
- [ ] All toolbar actions are searchable
- [ ] Block names are searchable (navigates and selects the block)
- [ ] Fuzzy matching works
- [ ] Recent actions appear first
- [ ] Keyboard navigation (arrow keys + Enter) works
- [ ] Palette dismisses on Escape or outside click

## Effort Estimate
Medium
"@
    },

    # ========== P3 — Nice-to-Have ==========
    @{
        Title  = "[P3] Vertical distribute spacing"
        Labels = "enhancement,tier-3-pro"
        Body   = @"
## Summary
Add "Distribute Vertically" to complement the existing horizontal distribute. Also add "Match Width" and "Match Height" operations.

## Priority
**P3** — Small gap, easy fix.

## Problem
Horizontal distribute exists but vertical distribute is missing. This is noted as a gap in the codebase.

## Acceptance Criteria
- [ ] Distribute Vertically evenly spaces selected blocks
- [ ] Match Width sets all selected blocks to the same width
- [ ] Match Height sets all selected blocks to the same height
- [ ] Toolbar buttons added to the Arrange section
- [ ] Undo/redo support

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P3] Format painter (copy-paste style)"
        Labels = "enhancement,ux,tier-3-pro"
        Body   = @"
## Summary
Add a "Format Painter" tool that copies the visual style (color, border, status, shape) from one block and applies it to others.

## Priority
**P3** — Small feature, big time-saver for consistent styling.

## Proposed Solution
- Select a block, click Format Painter button (or ``Ctrl+Shift+C`` to copy style)
- Click other blocks to apply that style (``Ctrl+Shift+V`` to paste style)
- Style includes: status (color), shape type, custom attributes like border width

## Acceptance Criteria
- [ ] Copy style from selected block
- [ ] Paste style onto one or more target blocks
- [ ] Keyboard shortcuts work
- [ ] Undo/redo support

## Effort Estimate
Small
"@
    },
    @{
        Title  = "[P3] Multi-page diagram tabs"
        Labels = "enhancement,tier-3-pro"
        Body   = @"
## Summary
Support multiple pages/sheets within a single diagram document, with a tab bar at the bottom to switch between them.

## Priority
**P3** — Differentiating feature for complex system designs.

## Problem
FSB has hierarchy navigation for parent/child block drill-down, but no support for flat multi-page diagrams (e.g., "Page 1: Power Distribution", "Page 2: Signal Routing").

## Proposed Solution
- Tab bar at the bottom of the canvas
- Each page has its own blocks, connections, and viewport state
- Add Page / Rename Page / Delete Page / Reorder Pages
- Cross-page connections via named stubs (already supported)
- Pages saved as an array in the diagram JSON

## Acceptance Criteria
- [ ] Tab bar shows all pages
- [ ] Switching pages preserves viewport state per page
- [ ] Add/rename/delete/reorder pages
- [ ] Cross-page references work via named stubs
- [ ] All pages included in exports
- [ ] Undo/redo works across page operations

## Effort Estimate
Medium
"@
    },
    @{
        Title  = "[P3] Client-side PDF export"
        Labels = "enhancement,tier-3-pro"
        Body   = @"
## Summary
Enable PDF export directly in the browser using ``jsPDF`` + ``svg2pdf.js``, removing the dependency on the Python backend for PDF generation.

## Priority
**P3** — Currently PDF export depends on the backend, which may not always be available.

## Proposed Solution
- Integrate ``jsPDF`` and ``svg2pdf.js`` libraries
- Convert the SVG canvas to PDF with proper scaling and margins
- Support page size selection (A4, Letter, A3)
- Include diagram title and metadata as PDF properties
- Multi-page PDF for multi-page diagrams (if implemented)

## Acceptance Criteria
- [ ] PDF export works entirely client-side
- [ ] Output quality matches the SVG rendering
- [ ] Page size is selectable
- [ ] Diagram title appears in PDF metadata
- [ ] Works within CEF

## Effort Estimate
Medium
"@
    },
    @{
        Title  = "[P3] A*-based orthogonal routing engine"
        Labels = "enhancement,tier-3-pro"
        Body   = @"
## Summary
Replace the heuristic shift-based orthogonal routing with a proper A*-based pathfinding algorithm for more reliable obstacle avoidance.

## Priority
**P3** — Current routing works for most cases but fails on complex layouts.

## Problem
``orthogonal-router.js`` uses a fixed set of heuristic strategies with brute-force shift attempts and a 12-segment cap. Complex layouts with many obstacles can produce routes that cross blocks.

## Proposed Solution
- Implement A* pathfinding on a visibility graph or grid discretization
- Respect block bounding boxes as obstacles
- Support user-placed waypoints as intermediate targets
- Add per-connection routing mode (straight, Bezier, orthogonal)
- Corner rounding (see related issue)

## Acceptance Criteria
- [ ] Routes reliably avoid all block obstacles
- [ ] No hard segment cap (or much higher limit)
- [ ] Waypoints are honored
- [ ] Per-connection routing mode selectable
- [ ] Performance acceptable for 100+ blocks and 200+ connections
- [ ] Fallback to simple route if pathfinding times out

## Effort Estimate
Large
"@
    }
)

foreach ($issue in $issues) {
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $issue.Body | Out-File -FilePath $bodyFile -Encoding utf8

    Write-Host "Creating: $($issue.Title)..." -ForegroundColor Cyan
    gh issue create -R $repo --title $issue.Title --label $issue.Labels --body-file $bodyFile
    
    Remove-Item $bodyFile -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500  # Rate limit courtesy
}

Write-Host "`nAll issues created!" -ForegroundColor Green
