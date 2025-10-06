# Fusion System Blocks

Fusion System Blocks is a Fusion 360 add-in that embeds system block diagrams directly inside a CAD assembly. Diagrams, CAD components, and documentation stay in sync so designers can plan architecture, link components, and capture engineering intent without leaving Fusion 360.

[![License: Community](https://img.shields.io/badge/License-Community-blueviolet.svg)](LICENSE)
[![Fusion 360](https://img.shields.io/badge/Platform-Fusion%20360-orange.svg)](https://www.autodesk.com/products/fusion-360)
[![Status](https://img.shields.io/badge/Milestones-14%20of%2015%20Complete-blue.svg)]()

---

## Overview

The add-in delivers a full diagramming environment inside Fusion 360:

- Create electrical, mechanical, and software blocks with typed connections.
- Link blocks to Fusion 360 components and track status automatically.
- Maintain multi-level system hierarchies with drill-down navigation.
- Generate reports such as bills of materials and connection matrices.
- Prepare for 3D overlay visualization of diagrams on assemblies (milestone 13).

The repository contains the full code base, tests, documentation, and deployment scripts. Source code is public for personal, academic, and non-commercial research use; commercial deployments require a paid license (see [Licensing](#licensing)).

---

## Current Status

| Milestone | Scope | Status |
| --- | --- | --- |
| 1 | Diagram core & persistence | Complete |
| 2 | CAD/ECAD linking | Complete |
| 3 | Status tracking | Complete |
| 4 | Hierarchical navigation | Complete |
| 5 | Import/export | Complete |
| 6 | Rule checking engine | Complete |
| 7 | Search & navigation | Complete |
| 8 | Undo/redo & UI polish | Complete |
| 9 | Advanced connection system | Complete |
| 10 | Fusion 360 UI integration | Complete |
| 10.5 | UI/UX improvements | Partially complete |
| 11 | Advanced block types & templates | Complete |
| 12 | Enhanced CAD linking | Complete |
| 13 | 3D visualization & living documentation | In progress |
| 14 | Advanced diagram features | Complete |
| 15 | AI-powered assistant | Planned |

A detailed breakdown of remaining work lives in `tasks.md`.

---

## Feature Summary

### Diagramming
- Canvas with pan, zoom, and snap-to-grid controls.
- Block library spanning electrical, mechanical, and software domains.
- Typed connections with customizable arrow styles and annotations.
- Multi-selection, grouping, alignment, and automated layout tools.

### CAD Integration
- Link blocks to Fusion 360 occurrences with health monitoring.
- Synchronize component properties and track change history (milestone 12).
- Prepare for 3D visualization and living documentation workflows (milestone 13).

### Reporting & Validation
- Save/load diagrams inside Fusion 360 document attributes.
- Export reports (JSON, CSV, HTML) and comprehensive BOMs.
- Rule-checking engine for orphan detection, interface compatibility, and system status.
- Status dashboards with automatic progression based on linked data.

### User Experience
- Fusion 360-style ribbon interface with responsive layout.
- Professional icon set and theming aligned with Fusion UI guidelines.
- Notification system, tooltips, and accessibility improvements.

---

## Repository Structure

- `Fusion_System_Blocks.py` – Fusion 360 entry point and command definitions.
- `fusion_system_blocks/` – Packaged add-in files for deployment builds.
- `src/` – JavaScript frontend modules, CSS, HTML palette, and demos.
- `tests/` – Pytest suite covering diagram data, imports/exports, and validation logic.
- `docs/` – Design notes and JSON schema for stored diagram data.
- `scripts/` – Automation for packaging, deployment, and repository management.

---

## Installation

1. Clone or download this repository.
2. Copy the folder into your Fusion 360 Add-ins directory:

	```text
	Windows: %APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\
	macOS: ~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/
	```

3. Launch Fusion 360, open **Utilities → Add-Ins**, and add the folder.
4. Enable “Run on Startup” or run the add-in manually from the panel.

See `FUSION_DEPLOYMENT_GUIDE.md` for packaging instructions and troubleshooting tips.

---

## Usage Highlights

1. Create a new diagram from the ribbon.
2. Add blocks and connections, using templates and annotations as needed.
3. Link blocks to Fusion occurrences for CAD traceability.
4. Run rule checks to validate diagram consistency.
5. Export reports or save the model to persist diagram data inside the Fusion document.

Demo HTML files in `src/` illustrate frontend features outside of Fusion 360.

---

## Testing

The repository includes pytest-based coverage for the Python backend.

```powershell
pwsh -File scripts/run_tests.ps1
```

or, with an activated virtual environment:

```powershell
pytest
```

Use `TESTING_CHECKLIST.md` for a 30-minute manual verification run inside Fusion 360, and `DETAILED_TESTING_DOCUMENTATION.md` for step-by-step validation procedures.

---

## Licensing

- Source code and assets are available for **personal, academic, and non-commercial research use** under the Fusion System Blocks Community License (see `LICENSE`).
- **Commercial use** requires a paid license. Open an issue in this repository to discuss pricing and terms.

---

## Contributing

1. Review open items in `tasks.md` and existing issues.
2. Fork the repository and create a feature branch.
3. Add or update tests where applicable.
4. Submit a pull request with a clear description of changes and test evidence.

Contributors focused on documentation can help expand user guides, add screenshots, or improve deployment instructions.

---

## Additional Resources

- `FRONTEND_MODULARIZATION_COMPLETE.md` – Notes on the JavaScript modularization work.
- `PERFORMANCE_FIXES_ROUND3.md` – Details on optimization passes for the canvas and input handling.
- `CRITICAL_ISSUES.md` – Closed issues discovered during milestone 10 testing.
- `REPOSITORY_SPLIT_GUIDE.md` & `SPLIT_SUMMARY.md` – Historical documentation of the public/private repo workflow.
- `docs/MILESTONES.md` – Snapshot of milestone progress and outstanding work.

---

## Acknowledgements

Fusion System Blocks builds on Autodesk Fusion 360’s API and the work of contributors who validated each milestone. Feedback and testing from educators and engineers helped shape the current feature set.