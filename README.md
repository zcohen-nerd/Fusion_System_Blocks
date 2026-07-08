<p align="center">
  <img src="assets/logo_full.png" alt="Fusion System Blocks" width="280" />
</p>

<h1 align="center">Fusion System Blocks</h1>

<p align="center">
  Draw system block diagrams right inside Autodesk Fusion.<br>
  Plan how your product fits together — without leaving your CAD environment.
</p>

<p align="center">

[![License: Community](https://img.shields.io/badge/License-Community-blueviolet.svg)](LICENSE)
[![Platform: Fusion](https://img.shields.io/badge/Platform-Fusion-orange.svg)](https://www.autodesk.com/products/fusion)

</p>

---

## What Is This?

Fusion System Blocks adds a diagram editor to Fusion. You draw **blocks** for the parts of your product — a motor, a circuit board, a sensor, a piece of firmware — and draw **wires** between them to show how they connect: power, data, mechanical linkages, and more.

The diagram is saved **inside your Fusion design file**, right next to your 3D model. Anyone who opens the design sees both the physical model and the system plan in one place — no separate Visio or PowerPoint file to keep in sync.

<p align="center">
  <img src="docs/Images/System%20Diagram.png" alt="A system diagram built in Fusion System Blocks" width="720" />
</p>
<p align="center"><em>An example system diagram with blocks, connections, and grouping.</em></p>

**What you can do with it:**

- Draw blocks in 8 shapes, color-coded as Electrical, Mechanical, Software, or Generic.
- Connect blocks with typed wires (power, data, signal, and more), with arrows and tidy right-angle routing.
- Link a block to a real component in your 3D model, so the diagram knows the part's name, material, and mass.
- Track progress: mark each block as Placeholder, Planned, In-Work, Implemented, or Verified.
- Run **Check Rules** to catch problems — unconnected blocks, voltage mismatches, power budgets that don't add up.
- Save snapshots of your diagram over time and restore any earlier version.
- Export reports: PDF, bill of materials (BOM), connection tables, diagrams as images, and more — 11 formats in total.

> **Heads-up: this is an early release (v0.1.1).** It works well for personal and school projects, but expect some rough edges, and keep backups of important work.

---

## Installation

You do **not** need to know anything about programming. If you can install a Fusion add-in, you can install this.

**You need:** Autodesk Fusion (current version) on Windows 10/11 or macOS. Nothing else — no extra software.

### Step by step

1. **Download** the latest release ZIP from the
   [Releases page](https://github.com/zcohen-nerd/Fusion_System_Blocks/releases).

2. **Unzip it.** You'll get a single folder named `Fusion_System_Blocks`.
   Put it somewhere permanent (like your Documents folder) — Fusion will load it from
   this location every time, so don't leave it in Downloads and delete it later.

3. **Open Fusion.** If it was already running, restart it.

4. In Fusion's top toolbar, click **Utilities**, then click the **Add-Ins** button
   (its icon looks like a green plus sign) and choose **Scripts and Add-Ins**.

5. In the window that opens, click the **Add-Ins** tab.

6. Click the **+** (plus) button next to "My Add-Ins", then browse to and select the
   `Fusion_System_Blocks` folder you unzipped in step 2.

7. **Fusion System Blocks** now appears in the list. Click it once to select it,
   check the **Run on Startup** box (so it loads automatically from now on), and
   click **Run**.

That's it. A **System Blocks** button now appears under **Utilities → Add-Ins** in the toolbar. Click it to open the diagram panel.

> **Don't see the button?** Make sure you are in the **Design** workspace (check the
> workspace picker at the top-left of Fusion). Then look under **Utilities →
> Add-Ins**. If it's still missing, restart Fusion and check that the add-in shows
> "Running" in the Scripts and Add-Ins window.

---

## Your First Diagram (2 Minutes)

1. Click the **System Blocks** button to open the panel.
2. Click **Block** in the ribbon at the top of the panel and pick a type
   (Electrical, Mechanical, Software, or Generic). A block appears on the canvas.
3. Type a name for it right away (the name box opens automatically), then press
   <kbd>Enter</kbd>.
4. Add a second block the same way.
5. **Connect them:** click the first block to select it, then press <kbd>C</kbd>
   (or click **Connect** in the ribbon). Small circles appear on the block edges —
   these are connection points. Now click the second block, and a wire appears
   between them.
6. Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save the diagram into your Fusion design.

> **Important:** saving the diagram stores it inside the currently open Fusion
> design. Remember to also **save the Fusion design itself** (Fusion's own save
> button) so everything is kept together in the cloud.

### Moving around the canvas

| To do this… | Do this |
|---|---|
| Move a block | Click and drag it |
| Pan the view | Drag with the **middle mouse button** |
| Zoom | Scroll the mouse wheel |
| Fit everything in view | Press <kbd>Ctrl</kbd>+<kbd>0</kbd> |
| Rename a block | Double-click it |
| Delete something | Click it, press <kbd>Delete</kbd> |
| Undo / Redo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> |

Press <kbd>?</kbd> inside the panel any time to see the full list of shortcuts, or <kbd>F1</kbd> for the built-in help guide.

---

## Everyday Tasks

### Saving and opening diagrams

- <kbd>Ctrl</kbd>+<kbd>S</kbd> saves your work into the open Fusion design.
- **Save As** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>) stores the diagram under a
  name of your choice — useful for keeping variants like "Concept A" and
  "Concept B" in the same design file.
- **Open Named** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd>) lists your named
  diagrams so you can switch between them.

### Linking a block to a real part

1. Click a block to select it.
2. Click **Link to CAD** in the ribbon.
3. The panel steps aside so you can click a component in your 3D model.
4. Done — the block now shows a blue banner with the component's name, so you can
   always see which part of the 3D model it represents.

### Checking your design

Click **Check Rules** to scan the diagram for common problems: blocks with no
connections, mismatched voltage levels, more power drawn than supplied, blocks
still using their default names, and more. Click any result to highlight the
offending blocks on the canvas.

> Tip: for power checks, give your blocks attributes like `current` (e.g. `200mA`)
> and `voltage` (e.g. `5V`) in the properties panel, and give your power supply an
> `output_current` or `power_supply_mw` attribute.

### Snapshots (version history)

Think of snapshots as save points. From the **History** tab you can:

- **Create a snapshot** with a short note ("before motor redesign").
- **Restore** any earlier snapshot — your whole diagram returns to that state.
- **Compare** two snapshots to see what was added, removed, or changed.

### Exporting reports

Click **Export**, tick the formats you want (PDF report, bill of materials,
connection matrix, SVG image, and more), optionally click **Browse** to pick a
destination folder, and confirm. If you don't pick a folder, files go to an
`exports` folder inside the add-in's folder — the confirmation message shows the
exact location.

### Bigger diagrams

- **Pages:** use the tabs at the bottom of the canvas to split a large system
  across several pages (for example "Power" and "Controls").
- **Nested diagrams:** select a block and click **Create Child** to open a diagram
  *inside* that block — great for breaking a complex subsystem into its own sheet.
  Use **Drill Down** and **Go Up** to move between levels.
- **Groups:** select several blocks (drag a box around them) and press
  <kbd>Ctrl</kbd>+<kbd>G</kbd> to group them with a labeled boundary.
- **Net labels:** instead of dragging a long wire across the canvas, drop a
  connection on empty space and give it a name like `5V` — every block with the
  same label counts as connected, just like in electronics schematics.

---

## Troubleshooting

**The System Blocks button disappeared.**
Switch to the Design workspace and look under Utilities → Add-Ins. Restart Fusion
if needed. The button re-adds itself whenever you switch back to the Design
workspace.

**My diagram was gone when I reopened the file.**
The diagram lives inside the Fusion design, so two saves matter: <kbd>Ctrl</kbd>+<kbd>S</kbd>
in the System Blocks panel **and** saving the Fusion design itself. If Fusion
wasn't saved, the diagram from that session is not in the cloud copy.

**Something looks broken.**
Go to **Utilities → Add-Ins** and click **Run Diagnostics**. It runs 30 built-in
self-checks and tells you exactly what passed and failed — without touching your
design.

**Reporting a bug.**
The add-in writes log files to a `FusionSystemBlocks/logs` folder inside your user
folder (`C:\Users\<you>\FusionSystemBlocks\logs` on Windows,
`~/FusionSystemBlocks/logs` on Mac). Attach the newest log file when you
[open an issue](https://github.com/zcohen-nerd/Fusion_System_Blocks/issues) —
it makes problems much easier to track down.

---

## For Developers

Everything below is only relevant if you want to work on the add-in's code —
regular users can stop reading here.

- The Python core (`fsb_core/`, `src/diagram/`) is pure Python with no Fusion
  dependencies; the Fusion-specific layer lives in `fusion_addin/` and
  `Fusion_System_Blocks.py`. The panel UI is plain HTML/JS in `src/`.
- Run the automated test suite (requires the test extras — `pytest`,
  `hypothesis`, and `jsonschema`):

  ```bash
  pip install -e .[test]
  pytest -q
  ```

- Current baseline: **775 passing tests** and **30 in-app diagnostics checks**.
- Manual regression plan: [docs/FUSION_MANUAL_TEST_PLAN.md](docs/FUSION_MANUAL_TEST_PLAN.md)
- Full release validation plan: [docs/DETAILED_TESTING_DOCUMENTATION.md](docs/DETAILED_TESTING_DOCUMENTATION.md)
- Verbose logging for debugging: set the `SYSTEM_BLOCKS_LOG_LEVEL` environment
  variable to `debug` before starting Fusion.

---

## License

The source code is available under the
[Fusion System Blocks Community License](LICENSE) for personal, academic, and
non-commercial use. Commercial use requires a paid license —
[open an issue](https://github.com/zcohen-nerd/Fusion_System_Blocks/issues) to discuss.
