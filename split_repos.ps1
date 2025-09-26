# Fusion System Blocks Repository Splitter
# PowerShell wrapper for easy execution

param(
    [Parameter(Mandatory=$true)]
    [string]$PublicPath,
    
    [Parameter(Mandatory=$true)]
    [string]$PrivatePath,
    
    [string]$SourcePath = "."
)

Write-Host "🚀 Fusion System Blocks Repository Splitter" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Validate paths
$SourcePath = Resolve-Path $SourcePath -ErrorAction SilentlyContinue
if (-not $SourcePath) {
    Write-Host "❌ Source path does not exist" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Configuration:" -ForegroundColor Yellow
Write-Host "   Source:  $SourcePath"
Write-Host "   Public:  $PublicPath" 
Write-Host "   Private: $PrivatePath"
Write-Host ""

# Confirm before proceeding
$confirmation = Read-Host "Proceed with repository split? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
    exit 0
}

# Run the Python script
Write-Host "🐍 Running Python splitter script..." -ForegroundColor Green

try {
    python split_repositories.py --source "$SourcePath" --public "$PublicPath" --private "$PrivatePath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Repository split completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Quick start commands:" -ForegroundColor Cyan
        Write-Host "   # For public repo:"
        Write-Host "   cd `"$PublicPath`""
        Write-Host "   .\commit_public.ps1"
        Write-Host ""
        Write-Host "   # For private repo:"  
        Write-Host "   cd `"$PrivatePath`""
        Write-Host "   .\commit_private.ps1"
    } else {
        Write-Host "❌ Repository split failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running Python script: $_" -ForegroundColor Red
    Write-Host "💡 Make sure Python is installed and in your PATH" -ForegroundColor Yellow
    exit 1
}