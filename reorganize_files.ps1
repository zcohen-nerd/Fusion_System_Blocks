# File Organization Script - Clean up the repository structure
Write-Host "Starting Repository Reorganization..." -ForegroundColor Green
Write-Host ""

# Move frontend JavaScript files
Write-Host "Moving JavaScript files..." -ForegroundColor Cyan
if (Test-Path "src\*.js") {
    Move-Item "src\*.js" "frontend\js\" -Force
    Write-Host "  Moved JavaScript files to frontend/js/"
}

# Move CSS files
Write-Host "Moving CSS files..." -ForegroundColor Cyan
if (Test-Path "src\*.css") {
    Move-Item "src\*.css" "frontend\css\" -Force
    Write-Host "  Moved CSS files to frontend/css/"
}

# Move HTML files
Write-Host "Moving HTML files..." -ForegroundColor Cyan
if (Test-Path "src\*.html") {
    Move-Item "src\*.html" "frontend\html\" -Force
    Write-Host "  Moved HTML files to frontend/html/"
}

# Move component directories from src
Write-Host "Moving component directories..." -ForegroundColor Cyan
if (Test-Path "src\core") {
    Move-Item "src\core" "frontend\components\core" -Force
    Write-Host "  Moved src/core to frontend/components/"
}
if (Test-Path "src\ui") {
    Move-Item "src\ui" "frontend\components\ui" -Force
    Write-Host "  Moved src/ui to frontend/components/"
}
if (Test-Path "src\features") {
    Move-Item "src\features" "frontend\components\features" -Force
    Write-Host "  Moved src/features to frontend/components/"
}
if (Test-Path "src\interface") {
    Move-Item "src\interface" "frontend\components\interface" -Force
    Write-Host "  Moved src/interface to frontend/components/"
}

# Move scripts
Write-Host "Moving PowerShell scripts..." -ForegroundColor Cyan
Move-Item "*.ps1" "scripts\" -Force
Write-Host "  Moved PowerShell scripts to scripts/"

# Move documentation files
Write-Host "Moving documentation..." -ForegroundColor Cyan
Move-Item "docs" "documentation\" -Force
Move-Item "*.md" "documentation\" -Force -Exclude "README.md"
Write-Host "  Moved documentation files"

# Move media to assets
Write-Host "Moving media files..." -ForegroundColor Cyan
if (Test-Path "media") {
    Move-Item "media" "assets\media" -Force
    Write-Host "  Moved media to assets/"
}

# Move old files to archive
Write-Host "Moving old files to archive..." -ForegroundColor Cyan
if (Test-Path "*_old.*") {
    Move-Item "*_old.*" "archive\" -Force
    Write-Host "  Moved old files to archive/"
}

# Move pycache and temporary files to archive  
Write-Host "Moving temporary files..." -ForegroundColor Cyan
if (Test-Path "__pycache__") {
    Move-Item "__pycache__" "archive\root_pycache" -Force
    Write-Host "  Moved __pycache__ to archive/"
}
if (Test-Path "src\__pycache__") {
    Move-Item "src\__pycache__" "archive\src_pycache" -Force
    Write-Host "  Moved src/__pycache__ to archive/"
}

# Clean up empty src directory
Write-Host "Cleaning up empty directories..." -ForegroundColor Cyan
if (Test-Path "src") {
    $srcContents = Get-ChildItem "src" -Force
    if ($srcContents.Count -eq 0) {
        Remove-Item "src" -Force
        Write-Host "  Removed empty src directory"
    } else {
        Write-Host "  src directory still contains files:"
        $srcContents | ForEach-Object { Write-Host "    - $($_.Name)" }
    }
}

Write-Host ""
Write-Host "Repository reorganization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "New structure:" -ForegroundColor Yellow
Write-Host "  fusion_system_blocks/    - Main Python package"
Write-Host "  frontend/               - Web UI components"
Write-Host "  scripts/                - Build and deployment scripts"
Write-Host "  documentation/          - All documentation"
Write-Host "  assets/                 - Media and static files"
Write-Host "  tests/                  - Unit tests"
Write-Host "  examples/               - Example files"
Write-Host "  exports/                - Generated outputs"
Write-Host "  archive/                - Old and temporary files"