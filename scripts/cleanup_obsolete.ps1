Param(
  [switch]$WhatIf,
  [switch]$SkipVenv
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "Cleaning obsolete files in" $root -ForegroundColor Cyan

$files = @(
  "src/milestone10-demo.html",
  "src/milestone13-demo.html",
  "src/milestone14-demo.html",
  "src/fusion-ribbon-demo.html",
  "src/context-menu-test.html",
  "src/css-test.html",
  "src/debug-test.html",
  "src/shapes-demo.html",
  "test-modular-loading.html",
  "fusion_system_blocks/manifest.xml",
  "IMPROVED_PUBLIC_README.md",
  "MILESTONE_1_FIXES.md",
  "MILESTONE_10_TESTING.md",
  "PERFORMANCE_FIXES_ROUND3.md",
  "FRONTEND_MODULARIZATION_COMPLETE.md",
  "REPOSITORY_SPLIT_GUIDE.md",
  "SPLIT_SUMMARY.md",
  "split_repositories.py",
  "split_repos.ps1",
  "reorganize_files.ps1",
  "src/.vscode/launch.json"
)

$dirs = @(
  "frontend/components",
  "frontend/css",
  "frontend/js",
  "frontend/html",
  "frontend",
  "examples",
  "src/__pycache__",
  "tests/__pycache__",
  ".pytest_cache",
  if ($SkipVenv) { $null } else { ".venv" }
)

function Set-NormalAttributesRecursively([string]$path) {
  try {
    Get-ChildItem -LiteralPath $path -File -Recurse -Force -ErrorAction SilentlyContinue |
      ForEach-Object { $_.Attributes = 'Normal' }
  } catch { }
}

function Stop-VenvProcesses([string]$venvPath) {
  try {
    $scriptsPath = Join-Path $venvPath 'Scripts'
    $pythonPath = Join-Path $scriptsPath 'python.exe'
    $pipPath = Join-Path $scriptsPath 'pip.exe'
    $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and ($_.Path -eq $pythonPath -or $_.Path -eq $pipPath) }
    foreach ($p in $procs) {
      Write-Host "Stopping process: $($p.Name) ($($p.Id))" -ForegroundColor Magenta
      if (-not $WhatIf) { Stop-Process -Id $p.Id -Force }
    }
  } catch { }
}

function Remove-DirectorySafe([string]$path) {
  if (-not (Test-Path $path)) { return }
  Write-Host "Removing directory: $((Resolve-Path $path).Path)" -ForegroundColor Yellow
  if ($WhatIf) { Write-Host "(WhatIf) Would remove $path recursively"; return }

  try {
    Set-NormalAttributesRecursively $path
    Remove-Item -LiteralPath $path -Force -Recurse -ErrorAction Stop
    return
  } catch {
    # If venv, attempt to stop any running processes first
    if ($path -like "*\/.venv*" -or $path -like "*\\.venv*") {
      Stop-VenvProcesses $path
    }
    try {
      Set-NormalAttributesRecursively $path
      Remove-Item -LiteralPath $path -Force -Recurse -ErrorAction Stop
      return
    } catch {
      Write-Warning "Fallback removal via cmd for: $path"
      $cmd = "cmd /c rd /s /q `"$path`""
      Invoke-Expression $cmd
    }
  }
}

# Files first
foreach ($f in $files) {
  if (-not $f) { continue }
  $path = Join-Path $root $f
  if (Test-Path $path -PathType Leaf) {
    Write-Host "Removing file: $f" -ForegroundColor Yellow
    if ($WhatIf) { Write-Host "(WhatIf) Would remove $path" } else {
      try { Remove-Item -LiteralPath $path -Force } catch { }
    }
  }
}

# Then directories (with resilience)
foreach ($d in $dirs) {
  if (-not $d) { continue }
  $path = Join-Path $root $d
  if (Test-Path $path) {
    Remove-DirectorySafe $path
  }
}

Write-Host "Cleanup complete." -ForegroundColor Green
