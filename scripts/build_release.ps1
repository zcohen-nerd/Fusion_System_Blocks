# Build Release Package for Fusion System Blocks
# Creates a ready-to-install ZIP in dist/
#
# Usage:
#   .\scripts\build_release.ps1            # uses version from manifest
#   .\scripts\build_release.ps1 -Version "0.1.1"  # override version label

param(
    [string]$Version
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

# Read version from manifest if not provided
if (-not $Version) {
    $manifest = Get-Content "Fusion_System_Blocks.manifest" -Raw | ConvertFrom-Json -AsHashtable
    $Version = $manifest.version
}

Write-Host "Building Fusion System Blocks v$Version" -ForegroundColor Cyan

# --- Clean previous build ---
$distDir = "dist\Fusion_System_Blocks"
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

# --- Copy runtime files ---
# Root-level entry point + manifest + license
Copy-Item "Fusion_System_Blocks.py"       $distDir
Copy-Item "Fusion_System_Blocks.manifest" $distDir
Copy-Item "LICENSE"                        $distDir

# Runtime directories
$runtimeDirs = @("fsb_core", "fusion_addin", "src", "resources")
foreach ($d in $runtimeDirs) {
    if (Test-Path $d) {
        Copy-Item $d "$distDir\$d" -Recurse -Force
    } else {
        Write-Warning "Expected directory '$d' not found — skipping."
    }
}

# --- Strip dev-only artifacts ---
# Remove __pycache__ directories
Get-ChildItem $distDir -Recurse -Directory -Filter "__pycache__" |
    Remove-Item -Recurse -Force

# Remove .vscode inside src/
$srcVscode = "$distDir\src\.vscode"
if (Test-Path $srcVscode) { Remove-Item -Recurse -Force $srcVscode }

# Remove any .pyc files that slipped through
Get-ChildItem $distDir -Recurse -File -Filter "*.pyc" | Remove-Item -Force

# --- Create ZIP ---
$zipName = "Fusion_System_Blocks_v$Version.zip"
$zipPath = "dist\$zipName"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $distDir -DestinationPath $zipPath -CompressionLevel Optimal

$sizeKB = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)

Write-Host ""
Write-Host "Release package created:" -ForegroundColor Green
Write-Host "  $zipPath  ($sizeKB KB)" -ForegroundColor Green
Write-Host ""
Write-Host "Install instructions:" -ForegroundColor Yellow
Write-Host "  1. Unzip $zipName"
Write-Host "  2. Copy the 'Fusion_System_Blocks' folder to:"
Write-Host '     Windows: %APPDATA%\Autodesk\ApplicationPlugins\'
Write-Host "     macOS:   ~/Library/Application Support/Autodesk/ApplicationPlugins/"
Write-Host "  3. Restart Fusion and enable via Utilities > Add-Ins"
