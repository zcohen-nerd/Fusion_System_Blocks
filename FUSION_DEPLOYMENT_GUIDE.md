# Fusion Add-in Deployment Guide

## For End Users - Installation Instructions

### Automatic Installation (Recommended)
1. Download the latest release from: https://github.com/zcohen-nerd/Fusion_System_Blocks/releases
2. Extract the ZIP file to your Downloads folder
3. In Fusion:
   - Go to **Utilities** → **ADD-INS**
   - Click the **Scripts and Add-Ins** button
   - In the **Add-Ins** tab, click the **+** (Add) button
   - Navigate to and select the extracted folder
   - Click **OK**
   - Select "Fusion System Blocks" from the list
   - Click **Run** (for one-time use) or **Run on Startup** (automatic)

### Manual Installation
1. Copy the add-in folder to:
   ```
   Windows: %APPDATA%\Autodesk\Autodesk Fusion\API\AddIns\
   Mac: ~/Library/Application Support/Autodesk/Autodesk Fusion/API/AddIns/
   ```

2. Restart Fusion

3. Access via **Utilities** → **ADD-INS**

## System Requirements
- Fusion (Latest version recommended)
- Windows 10/11 or macOS
- Python 3.9+ (included with Fusion)

## Feature Availability
- ✅ Current release line: 16 of 18 milestones complete
- ✅ Diagram authoring, save/load, named documents, hierarchy navigation,
   import/export, and rule checking
- ✅ Enhanced CAD linking with persisted links and current document-aware sync
- ✅ Requirements verification and snapshot-backed version history
- ✅ Advanced ribbon UI, annotations, alignment tools, grouping, minimap, and
   undo history panel
- ✅ Orthogonal connection routing with obstacle avoidance and waypoint editing
- ✅ Two-layer architecture, production logging, diagnostics, delta
   serialization, and shared bridge constants
- ✅ GitHub Actions CI: ruff, mypy, pytest on Python 3.9–3.12;
   current workspace baseline is 707 passing tests
- ✅ 11-format export pipeline with PDF report support
- ✅ 8 professional block shapes with shape-aware rendering
- 🚧 ECAD link button exists, but the authoring flow is still a placeholder
- 🚧 Snapshot comparison is backend-capable, but no primary compare control is
   exposed in the History tab yet
- 🚧 3D visualization and living documentation workflows (milestone 13, not started)
- 🚧 AI-powered assistant workflows (milestone 15, not started)

## Validation and Testing

- Built-in Fusion self-test: **Run Diagnostics** from **Utilities** →
   **Add-Ins**
- Current workspace validation baseline: 707 passing `pytest` tests and 32
   in-app diagnostics checks
- Quick manual regression plan:
   [docs/FUSION_MANUAL_TEST_PLAN.md](docs/FUSION_MANUAL_TEST_PLAN.md)
- Full release validation plan:
   [docs/DETAILED_TESTING_DOCUMENTATION.md](docs/DETAILED_TESTING_DOCUMENTATION.md)

## Troubleshooting

### Run Diagnostics
If the add-in isn't working correctly:
1. In Fusion, go to **Utilities** → **Add-Ins** panel
2. Click **Run Diagnostics**
3. A message box shows pass/fail status with the number of checks run
    (currently 32 when healthy)
4. Check the log file at `~/FusionSystemBlocks/logs/` for details

### Log Files
Session logs are stored at:
- **Windows:** `%USERPROFILE%\FusionSystemBlocks\logs\`
- **macOS:** `~/FusionSystemBlocks/logs/`

Each session creates a new log file: `systemblocks_<timestamp>_<session>.log`

## Support
- 📋 Issues: https://github.com/zcohen-nerd/Fusion_System_Blocks/issues
- 💬 Discussions: https://github.com/zcohen-nerd/Fusion_System_Blocks/discussions
- 📧 Commercial licensing inquiries: open an issue referencing “commercial license”

## License
- Fusion System Blocks Community License (see `LICENSE`) permits personal, academic, and non-commercial research use.
- Commercial deployments require a paid license; contact the maintainer to discuss terms and pricing.