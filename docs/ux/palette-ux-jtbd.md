# Jobs-to-be-Done: Fusion System Blocks Palette UX

## Users & Context
- **Primary users:** Mechanical/Electrical engineers and CAD designers working inside Fusion 360.
- **Skill level:** Intermediate–advanced CAD users; beginner–intermediate with system diagrams.
- **Device:** Desktop, mouse + keyboard; high-resolution monitors.
- **Accessibility needs:** Keyboard-first navigation, readable contrasts, screen-reader friendly notifications.
- **Usage context:** During design sessions (30–120 minutes), switching between modeling and system documentation.
- **Frequency:** Daily to weekly depending on project phase.
- **Consequences of failure:** Lost alignment between diagram and CAD; rework; missed dependencies.

## Job Statements
When I am designing or updating a CAD assembly, I want to document and validate the system architecture directly in Fusion 360, so I can keep diagrams, components, and status in sync without juggling external tools.

When I link blocks to CAD occurrences, I want clear feedback and health indicators, so I can trust that traceability and status are accurate.

When I run rule checks and generate reports, I want focused results with actionable fixes, so I can resolve issues quickly and share consistent documentation.

## Current Solution & Pain Points
- **Current:** HTML palette with multiple actions (create/load, link, validate, export). Messaging via Python bridge.
- **Pain points:**
  - Mixed actions in one view; hard to discover primary tasks
  - Limited progress/health feedback; success vs. warning vs. error messages not consistently visible
  - Rule check outputs can be long; need filtering and guidance
  - Linking flow requires context switching; unclear selection state
  - Accessibility gaps: keyboard focus, toast announcements, contrast

## Desired Outcomes
- Faster task completion with fewer clicks and clearer pathways
- Confident system status via visible indicators and inline validations
- Reduced cognitive load through progressive disclosure and task-centric tabs
- Better accessibility with keyboard-first flows and SR-friendly messages

## Success Metrics
- Create/link/validate flow completed in under 5 minutes for typical diagrams
- Rule-check resolution rate >80% on first pass with guidance
- Time-to-export reduced by 50% via simplified reports panel
- Keyboard-only completion for core tasks without mouse usage

## Assumptions & Open Questions
- Assumption: Users prefer staying in Fusion palette vs external windows
- Assumption: Most diagrams < 150 blocks; JSON size manageable
- Open: Team preferences for default tabs and terminology
- Open: Required report formats (CSV/HTML/JSON priority order)
- Open: Localization needs and language support

## Proposed UX Principles
- Task-first navigation with tabs: Diagram • Linking • Validation • Reports
- Clear, persistent status bar with autosave and health indicators
- Inline help and guided fixes in validation results
- Non-blocking toasts + SR announcements for all notifications
- Progressive disclosure: show critical actions first; expand advanced options
