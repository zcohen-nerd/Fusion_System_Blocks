# Repository Split Usage Guide

> **Note (October 2025):** The active project now keeps all source code public. This guide and associated scripts remain for historical context or future scenarios where a split might be required.

## Quick Start

### Option 1: PowerShell Script (Recommended)
```powershell
.\split_repos.ps1 -PublicPath "C:\path\to\public\repo" -PrivatePath "C:\path\to\private\repo"
```

### Option 2: Python Script Directly
```bash
python split_repositories.py --public "C:\path\to\public\repo" --private "C:\path\to\private\repo"
```

## What Gets Split

### Public Repository (`Fusion_System_Blocks`)
- `README.md` (updated with privacy notice)
- `LICENSE`
- `tasks.md`
- `docs/` (documentation)
- `.gitignore` (public-focused)
- Commit script (`commit_public.ps1`)

### Private Repository (`Fusion_System_Blocks_Private`)  
- `src/` (all source code)
- `tests/` (test suite)
- `Fusion_System_Blocks.py` (main entry point)
- `Fusion_System_Blocks.manifest`
- `.github/workflows/` (CI/CD)
- `requirements.txt` (auto-generated)
- Development files and documentation
- `.gitignore` (development-focused)
- Commit script (`commit_private.ps1`)

## After Running the Split

### 1. Create GitHub Repositories
- **Public**: `Fusion_System_Blocks` (or your preferred name)
- **Private**: `Fusion_System_Blocks_Private` (or your preferred name)

### 2. Initialize and Push Public Repo
```powershell
cd "C:\path\to\public\repo"
.\commit_public.ps1
git remote add origin https://github.com/username/Fusion_System_Blocks.git
git push -u origin main
```

### 3. Initialize and Push Private Repo
```powershell
cd "C:\path\to\private\repo"  
.\commit_private.ps1
git remote add origin https://github.com/username/Fusion_System_Blocks_Private.git
git push -u origin main
```

### 4. Configure GitHub Secrets (Private Repo)
In your private repository settings, add:
- **Secret Name**: `PUBLIC_REPO_TOKEN`
- **Secret Value**: Personal Access Token with `repo` permissions
- **Purpose**: Allows private repo to create releases in public repo

### 5. Update Workflow Repository Names
Edit `.github/workflows/build-and-release.yml` in the private repo:
- Replace `zcohen-nerd/Fusion_System_Blocks` with your actual public repo name

## Testing the CI/CD Pipeline

### Manual Trigger
1. Go to your private repo → Actions → "Build and Release to Public Repo"
2. Click "Run workflow"
3. Enter version (e.g., `v1.0.0`)
4. Click "Run workflow"

### Tag-based Trigger
```bash
git tag v1.0.0
git push origin v1.0.0
```

## File Structure After Split

```
Public Repo (Documentation & Releases)
├── README.md (updated)
├── LICENSE
├── tasks.md
├── docs/
├── .gitignore
└── commit_public.ps1

Private Repo (Source Code & Development)
├── src/
├── tests/
├── .github/workflows/build-and-release.yml
├── Fusion_System_Blocks.py
├── Fusion_System_Blocks.manifest
├── requirements.txt
├── .gitignore
└── commit_private.ps1
```

## Troubleshooting

### Python Not Found
- Install Python 3.7+ from python.org
- Add Python to your PATH environment variable

### Permission Errors
- Run PowerShell as Administrator
- Check that target directories are writable

### Git Issues
- Install Git from git-scm.com
- Configure git user: `git config --global user.name "Your Name"`
- Configure git email: `git config --global user.email "your@email.com"`

### GitHub Token Issues
- Create token at: https://github.com/settings/tokens
- Select `repo` scope for full repository access
- Copy token immediately (it won't be shown again)

## Benefits of This Split

✅ **Security**: Source code remains private  
✅ **Distribution**: Easy public releases via GitHub Actions  
✅ **Documentation**: Public docs and issue tracking  
✅ **Automation**: Automated testing, building, and releasing  
✅ **Compliance**: Clear separation of proprietary and public content