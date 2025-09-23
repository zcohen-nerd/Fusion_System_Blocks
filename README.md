# Fusion 360 System Blocks Add-in

## 📌 Overview
Fusion 360 is powerful for CAD and ECAD once you’re deep into design — but it lacks a native way to capture **system-level block diagrams** that drive those designs.  
This add-in introduces a **System Blocks Workspace**:

- Draw flowcharts/block diagrams inside Fusion 360  
- Attach attributes (voltages, protocols, constraints) to blocks  
- Link blocks to real CAD components or ECAD devices  
- Track status (Placeholder → Verified) as designs evolve  
- Run rule checks (logic-level compatibility, power budgets)  
- Export system overviews, pin maps, and reports  

Unlike static diagrams (Visio, draw.io, Lucidchart), these block diagrams remain **fluid** and integrated — serving as a live check between requirements and implementation.

---

## ✨ Features (Planned)
- **Diagram Canvas**: Drag-and-drop blocks, connect with typed interfaces (power, data, mechanical).  
- **Block Library**: Predefined templates (MCU, Power, Sensor, Motor Driver, Actuator, Custom).  
- **Metadata**: Voltage, current, protocol, constraints stored per block.  
- **Link Manager**: Tie blocks to Fusion CAD/ECAD components and track implementation.  
- **Status Tracking**: Color halos and rollup checks (Placeholder, In-Work, Implemented, Verified).  
- **Rule Checks**: Validate voltage levels, power budgets, and completeness.  
- **Export**: Auto-generate Markdown/PDF reports and CSV pin maps.  
- **Import**: Seed diagrams from Mermaid or draw.io.  
- **Hierarchy (Stretch)**: Expand blocks into sub-diagrams for complex systems.  

---
## 🛠 Roadmap

 - Basic node/edge editor in palette (SVG/Canvas)
 - JSON persistence into Fusion adsk.core.Attributes
 - Link blocks to CAD occurrences & ECAD devices
 - Status tracking UI + rule checks
 - Export Markdown/CSV reports
 - Mermaid/draw.io import
 - Hierarchical blocks

## 🤝 Contributing

This project is currently experimental and being built with heavy use of AI programming agents (Copilot, ChatGPT, etc.).
If you want to hack on it:
Fork → create feature branch → open PR.
Keep commits clean and small.
Follow linting/tests (CI will enforce).
