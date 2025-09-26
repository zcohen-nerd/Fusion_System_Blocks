# Public Repository Commit Script
param(
    [string]$RepoPath = "."
)

Set-Location $RepoPath

Write-Host "🔄 Initializing public repository..."

# Initialize git if needed
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git repository initialized"
}

# Add all files
git add .
Write-Host "📁 Files staged"

# Commit
git commit -m "chore: split project into public/private repos

- Added documentation and public-facing files
- Updated README with privacy notice and release info
- Public repo focuses on documentation and releases"

Write-Host "✅ Public repo commit complete"
Write-Host "📝 Next steps:"
Write-Host "   1. git remote add origin <public-repo-url>"
Write-Host "   2. git push -u origin main"
