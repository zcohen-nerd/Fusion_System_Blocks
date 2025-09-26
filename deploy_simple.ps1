# Simple Deployment Script - No Unicode Characters
# Creates a user-friendly installation package

Write-Host "Creating Fusion System Blocks Installation Package..." -ForegroundColor Green

# Create exports directory if it doesn't exist
$ExportDir = "exports"
if (!(Test-Path $ExportDir)) {
    New-Item -ItemType Directory -Path $ExportDir -Force | Out-Null
}

# Create the distribution package
$PackageName = "Fusion_System_Blocks_v1.0_Beta.zip"
$PackagePath = Join-Path $ExportDir $PackageName

Write-Host "Packaging files..." -ForegroundColor Cyan

# Remove old package if it exists
if (Test-Path $PackagePath) {
    Remove-Item $PackagePath -Force
}

# Files to include in the package
$FilesToPackage = @(
    "Fusion_System_Blocks.py",
    "Fusion_System_Blocks.manifest", 
    "README.md",
    "LICENSE",
    "FUSION_DEPLOYMENT_GUIDE.md"
)

# Create temporary directory for packaging
$TempDir = "temp_package"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copy files to temp directory
foreach ($File in $FilesToPackage) {
    if (Test-Path $File) {
        Copy-Item $File -Destination $TempDir -Force
        Write-Host "  Added: $File" -ForegroundColor Yellow
    } else {
        Write-Host "  Warning: $File not found" -ForegroundColor Red
    }
}

# Copy documentation and schemas
if (Test-Path "docs") {
    Copy-Item "docs" -Destination $TempDir -Recurse -Force
    Write-Host "  Added: docs/" -ForegroundColor Yellow
}

# Create the ZIP package
try {
    Compress-Archive -Path "$TempDir\*" -DestinationPath $PackagePath -Force
    Write-Host "Package created successfully!" -ForegroundColor Green
    Write-Host "Location: $PackagePath" -ForegroundColor White
} catch {
    Write-Host "Error creating package: $($_.Exception.Message)" -ForegroundColor Red
}

# Clean up temp directory
Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "DEPLOYMENT PACKAGE READY" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Package: $PackageName"
Write-Host "Size: $(Get-ChildItem $PackagePath | Select-Object -ExpandProperty Length) bytes"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Test the package by extracting and installing"
Write-Host "2. Upload to GitHub releases when ready"
Write-Host "3. Share with beta testers"