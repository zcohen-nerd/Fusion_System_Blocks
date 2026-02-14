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
- ✅ Diagram authoring, hierarchy navigation, import/export, rule checking
- ✅ Enhanced CAD linking and status dashboards (milestone 12)
- ✅ Advanced ribbon UI, annotations, and layout tooling (milestone 14)
- ✅ Two-layer architecture with production logging (milestone 16)
- ✅ Delta serialization for incremental saves (JSON-Patch style diffs)
- ✅ Shared bridge action constants between Python and JavaScript
- ✅ Built-in "Run Diagnostics" command for self-testing
- ✅ GitHub Actions CI: ruff, mypy, pytest on Python 3.9–3.12 (605 tests)
- ✅ 11-format export pipeline with PDF report support
- ✅ Requirements & verification engine with version control
- ✅ Orthogonal connection routing with obstacle avoidance
- ✅ Canvas minimap, undo history panel, connection context menu
- ✅ Crash recovery auto-backup, keyboard shortcut help, schema versioning
- ✅ 10 professional block shapes with shape-aware rendering
- 🚧 3D visualization and living documentation workflows (milestone 13, not started)

## Troubleshooting

### Run Diagnostics
If the add-in isn't working correctly:
1. In Fusion, go to **Utilities** → **Add-Ins** panel
2. Click **Run Diagnostics**
3. A message box shows pass/fail status with test counts
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