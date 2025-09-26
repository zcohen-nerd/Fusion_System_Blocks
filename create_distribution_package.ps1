# Create Release Package for Distribution
# This script packages your Fusion 360 add-in for end-user distribution

param(
    [string]$Version = "v0.0.1-beta",
    [string]$OutputDir = ".\exports"
)

Write-Host "📦 Creating Fusion 360 Add-in Release Package: $Version" -ForegroundColor Green
Write-Host ""

# Create output directory
$PackageDir = "$OutputDir\Fusion_System_Blocks_$Version"
if (Test-Path $PackageDir) {
    Remove-Item $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null

Write-Host "📋 Copying core files..." -ForegroundColor Cyan

# Copy essential files for Fusion 360 add-in
Copy-Item "Fusion_System_Blocks.py" $PackageDir
Copy-Item "Fusion_System_Blocks.manifest" $PackageDir
Copy-Item "README.md" $PackageDir
Copy-Item "LICENSE" $PackageDir -ErrorAction SilentlyContinue
Copy-Item "FUSION_DEPLOYMENT_GUIDE.md" "$PackageDir\INSTALLATION_GUIDE.md"

# Copy source files (JS/HTML for UI)
if (Test-Path "src") {
    Copy-Item "src" "$PackageDir\src" -Recurse
}

# Copy documentation
if (Test-Path "docs") {
    Copy-Item "docs" "$PackageDir\docs" -Recurse
}

# Copy media/assets
if (Test-Path "media") {
    Copy-Item "media" "$PackageDir\media" -Recurse
}

Write-Host "🔧 Creating distribution package..." -ForegroundColor Cyan

# Create ZIP file for distribution
$ZipPath = "$OutputDir\Fusion_System_Blocks_$Version.zip"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

# Use PowerShell 5.0+ compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($PackageDir, $ZipPath)

Write-Host ""
Write-Host "✅ RELEASE PACKAGE CREATED!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 PACKAGE DETAILS:" -ForegroundColor Yellow
Write-Host "   📁 Folder: $PackageDir"
Write-Host "   📦 ZIP: $ZipPath"
Write-Host "   📊 Size: $([math]::Round((Get-Item $ZipPath).Length / 1MB, 2)) MB"
Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Magenta
Write-Host "   1. Upload ZIP to GitHub release as asset"
Write-Host "   2. Update release notes with installation instructions"
Write-Host "   3. Share with beta testers"
Write-Host ""
Write-Host "🌐 Release URL: https://github.com/zcohen-nerd/Fusion_System_Blocks/releases/tag/$Version"