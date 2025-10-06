# Fusion System Blocks

This add-in embeds a block-diagram authoring experience inside Autodesk Fusion 360. Engineers can plan system architecture, link diagram blocks to CAD components, and generate reports that stay synchronized with the 3D model.

This document offers a concise public-facing overview for the project website or GitHub landing page.

---

## Key Facts

- **Platform:** Autodesk Fusion 360 (Windows and macOS)
- **Language Stack:** Python 3.11+ backend, modular ES6 frontend, HTML/CSS UI
- **License:** Free for personal, academic, and non-commercial research use under the Fusion System Blocks Community License. Commercial licensing available on request.
- **Repository:** Full source, tests, and build tooling are public. Releases include pre-packaged add-ins.

---

## Feature Highlights

- Create electrical, mechanical, and software blocks with typed connections.
- Persist diagrams directly in Fusion 360 document attributes.
- Link blocks to CAD components and monitor sync status.
- Build multi-level hierarchies with drill-down navigation.
- Export JSON/CSV/HTML reports for documentation and manufacturing.
- Use a Fusion-style ribbon interface with responsive layout, grouping, and annotations.
- Prepare for in-canvas 3D overlays and living documentation (milestone 13 in progress).

---

## Project Status (October 2025)

- Milestones 1–12 & 14: Complete and available in the repository.
- Milestone 13: 3D visualization and living documentation features under active development.
- Milestone 15: AI-assisted design planned; not started.
- Manual and automated testing workflows are documented in `TESTING_CHECKLIST.md` and `DETAILED_TESTING_DOCUMENTATION.md`.

See `tasks.md` for the full backlog and current priorities.

---

## Getting Started

1. Clone or download the repository.
2. Copy the project folder into your Fusion 360 Add-ins directory.
3. Launch Fusion 360, open **Utilities → Add-Ins**, and enable Fusion System Blocks.
4. Follow the quick-start instructions in `README.md` to create and link blocks.

Pre-built packages and release notes live under the repository’s Releases tab.

---

## Licensing & Commercial Use

- Personal, academic, and non-commercial research use is permitted under the Fusion System Blocks Community License (`LICENSE`).
- Commercial deployments require a paid license. Reach out through the issue tracker or contact links in the repository to discuss terms and pricing.

---

## Support & Contributions

- Report bugs or request features via GitHub Issues.
- Documentation contributions, testing feedback, and sample diagrams are welcome.
- Before submitting code changes, review `tasks.md` and follow the contributing guidelines in `README.md`.

---

## Additional Resources

- `README.md` – Detailed overview, installation, and testing notes.
- `FUSION_DEPLOYMENT_GUIDE.md` – Step-by-step deployment guidance.
- `docs/DESIGN_NOTES.md` – High-level design considerations and schema references.
- `FRONTEND_MODULARIZATION_COMPLETE.md` – Summary of the modular frontend architecture.

---

Fusion System Blocks is evolving into a complete system-engineering companion for Fusion 360. Follow along, file feedback, and help shape the next milestones.