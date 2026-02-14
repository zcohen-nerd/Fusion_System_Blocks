<p align="center">
  <img src="assets/logo_full.png" alt="Fusion System Blocks" width="280" />
</p>

<h1 align="center">Fusion System Blocks</h1>

<p align="center">
  A block-diagram editor that lives inside Autodesk Fusion.<br>
  Plan your system architecture without leaving your CAD environment.
</p>

<p align="center">

[![License: Community](https://img.shields.io/badge/License-Community-blueviolet.svg)](LICENSE)
[![Platform: Fusion](https://img.shields.io/badge/Platform-Fusion-orange.svg)](https://www.autodesk.com/products/fusion)

</p>

---

## What This Tool Does

Fusion System Blocks adds a **system block diagram palette** directly inside Fusion. You draw blocks that represent the subsystems in your product — sensors, motors, PCBs, housings, software modules — and wire them together with typed connections. The diagram saves inside your Fusion document, right next to the 3D model.

**Key capabilities:**

- Drag-and-drop blocks from electrical, mechanical, and software libraries.
- Connect blocks with typed wires (power, data, mechanical, etc.).
- Link any block to an actual Fusion component so the diagram and the CAD model stay in sync.
- Run rule checks to catch orphan blocks, interface mismatches, and power budget violations.
- Export reports: BOM, connection matrix, pin map, PDF, SVG, and more.

---

## Why This Exists

Most engineering teams document their system architecture in separate tools — Visio, Draw.io, PowerPoint — that immediately fall out of sync with the CAD model. Fusion System Blocks keeps the diagram **inside the assembly file** so there is one source of truth. When you rename a component in the 3D model, the linked block updates automatically. When a newcomer opens the Fusion document, they see both the physical design and the logical architecture in one place.

---

## Current Status

> **Experimental — v0.1.0**
>
> Core diagramming, CAD linking, and export features are implemented and tested (600+ automated tests). The add-in is usable for personal and academic projects. APIs and file formats may change before v1.0.

---

## Installation

### Requirements

- **Autodesk Fusion** (latest version) on Windows 10/11 or macOS.
- No other dependencies — Fusion bundles its own Python runtime.

### Step-by-Step

1. **Download** the latest release ZIP from the [Releases page](https://github.com/zcohen-nerd/Fusion_System_Blocks/releases).

2. **Unzip** it. You will get a single folder called `Fusion_System_Blocks`.

3. **Move** that folder into your Fusion Add-Ins directory:

   | OS | Path |
   |---|---|
   | **Windows** | `%APPDATA%\Autodesk\ApplicationPlugins\` |
   | **macOS** | `~/Library/Application Support/Autodesk/ApplicationPlugins/` |

4. **Open Fusion** (or restart it if it was already running).

5. Go to **Utilities → Add-Ins** (or press <kbd>Shift</kbd>+<kbd>S</kbd>).

6. Find **Fusion System Blocks** in the list, select it, and click **Run**.

   > Optionally check **Run on Startup** so it loads every time you open Fusion.

That's it — a "System Blocks" button appears in the toolbar. Click it to open the diagram palette.

---

## Usage

### What Is a System Block?

A **system block** is a rectangle (or other shape) on the diagram that represents one piece of your product — a motor controller, a chassis, a sensor module, a firmware process, etc. Each block has **ports** (connection points) and can carry metadata like status, cost, and mass.

### Creating Your First Diagram

1. Click the **System Blocks** button in the Fusion toolbar to open the palette.
2. In the ribbon, choose a block type from the **Create** group (Electrical, Mechanical, or Software).
3. The block appears on the canvas. Double-click it to rename it.
4. Add a second block the same way.
5. Select the first block and press <kbd>C</kbd> to enter connection mode, then click the second block. A wire appears between them.
6. Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save the diagram inside the Fusion document.

### Typical Workflow

```
Open Fusion document
  → Open System Blocks palette
    → Add blocks for each subsystem
      → Wire them together
        → Link blocks to CAD components (optional)
          → Run Check Rules to validate
            → Export a report (PDF, BOM, etc.)
              → Save — diagram persists inside the .f3d file
```

---

## License

Source code is available under the [Fusion System Blocks Community License](LICENSE) for personal, academic, and non-commercial use. Commercial use requires a paid license — open an issue to discuss.
