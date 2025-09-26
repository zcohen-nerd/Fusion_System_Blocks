# Fusion 360 Add-in Deployment Guide

## For End Users - Installation Instructions

### Automatic Installation (Recommended)
1. Download the latest release from: https://github.com/zcohen-nerd/Fusion_System_Blocks/releases
2. Extract the ZIP file to your Downloads folder
3. In Fusion 360:
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
   Windows: %APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\
   Mac: ~/Library/Application Support/Autodesk/Autodesk Fusion 360/API/AddIns/
   ```

2. Restart Fusion 360

3. Access via **Utilities** → **ADD-INS**

## System Requirements
- Fusion 360 (Latest version recommended)
- Windows 10/11 or macOS
- Python 3.8+ (included with Fusion 360)

## Features Available in Beta
- ✅ System block diagram creation
- ✅ Hierarchical structure management  
- ✅ Basic validation rules
- ⚠️ Advanced CAD integration (Testing phase)
- ⚠️ Import/Export features (Testing phase)

## Support
- 📋 Issues: https://github.com/zcohen-nerd/Fusion_System_Blocks/issues
- 💬 Discussions: https://github.com/zcohen-nerd/Fusion_System_Blocks/discussions
- 📧 Contact: Via GitHub issues preferred

## License
Private Beta - Licensed for evaluation use only