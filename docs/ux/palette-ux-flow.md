# User Flow: Palette Redesign for Task-First Navigation

> **Status: PROPOSED** — This describes a future tabbed UI redesign that has not been implemented. The current UI uses a ribbon interface.

## Entry Point
Palette launches to a landing screen with clear primary actions.

## Flow Steps
1. **Landing (Home Tab)**
   - Quick actions: New Diagram • Load Diagram • Recent
   - Short tips and links: “How linking works”, “Run validation”
   - Status bar: Autosave ON, Last saved time, Diagram health (OK/Warn/Error)

2. **Diagram Tab**
   - Library sidebar with categories (Electrical/Mechanical/Software)
   - Canvas toolbar: pan/zoom, align, auto-layout, group
   - Block inspector: type, status, attributes, interfaces
   - Inline errors: orphan interfaces, missing attributes

3. **Linking Tab**
   - Guided flow: Select Block → Select CAD Occurrence → Confirm
   - Link badges on blocks; health indicators (linked/unlinked/stale)
   - Bulk link actions for repeated patterns
   - “Verify Link” button that checks occurrence token + doc id

4. **Validation Tab**
   - Run checks: orphan detection, interface compatibility, status rules
   - Filters: severity (Error/Warning), category (Power/Data/Hierarchy)
   - Guided fixes: show “How to fix” and quick actions (e.g., link now)
   - Export validation report (JSON/CSV)

5. **Reports Tab**
   - Export presets: BOM, connection matrix, full JSON, HTML summary
   - Destination selector with confirmation of export path
   - “Open Export Folder” button

## Design Principles
1. **Progressive Disclosure:** Critical tasks first; advanced options tucked away.
2. **Clear Status:** Persistent status bar; toasts for events; health color + icon.
3. **Guided Fixes:** Validation results link to actions and micro-help.
4. **Accessible by Default:** Keyboard-first interactions; SR announcements.

## Accessibility Requirements
- Keyboard navigation across all tabs and controls
- Logical tab order; visible focus indicators
- Screen-reader text for notifications and status changes
- Minimum contrast 4.5:1; do not rely on color alone
- Error messages announced and actionable links focusable

## Quick Implementation Tasks (Frontend)
- Add tabbed layout: Home • Diagram • Linking • Validation • Reports
- Implement status bar with autosave indicator and health summary
- Add severity/category filters in validation panel
- Improve toast notifications (non-blocking; SR-friendly)
- Provide “Open Export Folder” utility action after exports

## Success Metrics
- Time to complete Diagram → Link → Validate → Report under 5 minutes
- Reduction in unresolved validation items after first pass by 30%
- 100% of core tasks reachable via keyboard only
