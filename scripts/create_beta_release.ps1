# Create Beta Release for Public Repository

param(
    [string]$Version = "v0.0.1-beta"
)

Write-Host "🚀 Creating Beta Release: $Version" -ForegroundColor Green
Write-Host ""

# Navigate to public repo
$PublicRepoPath = $env:FSB_PUBLIC_REPO
if (-not $PublicRepoPath) {
    Write-Host "ERROR: Set FSB_PUBLIC_REPO environment variable to public repo path" -ForegroundColor Red
    exit 1
}
Set-Location $PublicRepoPath

# Create a beta release tag
Write-Host "📋 Creating release tag..." -ForegroundColor Cyan
git tag -a $Version -m "Beta Release $Version

Initial public beta release of Fusion System Blocks.

🚧 BETA STATUS:
This is a development preview. Core features are implemented but still undergoing testing.

📦 WHAT'S INCLUDED:
- Complete documentation and schema
- Roadmap and milestone tracking  
- Public API references
- Community support structure

🔒 SOURCE CODE:
Source code remains private during beta phase. Compiled releases will be published here once testing is complete.

🎯 FEEDBACK WELCOME:
- Report issues via GitHub Issues
- Request features via Discussions
- Share use cases and requirements

📅 TIMELINE:
- Current: Documentation and community setup
- Next: Final testing and validation
- Target: Public release November 2025"

# Push the tag
Write-Host "📤 Pushing release tag to GitHub..." -ForegroundColor Cyan
git push origin $Version

Write-Host ""
Write-Host "✅ BETA RELEASE CREATED!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 RELEASE DETAILS:" -ForegroundColor Yellow
Write-Host "   🏷️ Tag: $Version"
Write-Host "   📅 Date: $(Get-Date -Format 'yyyy-MM-dd')"
Write-Host "   🌐 URL: https://github.com/zcohen-nerd/Fusion_System_Blocks/releases/tag/$Version"
Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Magenta
Write-Host "   1. Go to GitHub and edit the release"
Write-Host "   2. Mark as 'Pre-release' since it's beta"
Write-Host "   3. Add any additional release notes"
Write-Host "   4. Consider adding placeholder assets"
Write-Host ""
Write-Host "💡 This creates a professional timeline for your project!"