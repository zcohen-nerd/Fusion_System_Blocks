#!/usr/bin/env python3
"""
Repository Split Script for Fusion System Blocks
Splits the project into public and private repositories while preserving Git history.
"""

import os
import shutil
import sys
import argparse
from pathlib import Path


class RepositorySplitter:
    def __init__(self, source_path, public_path, private_path):
        self.source_path = Path(source_path).resolve()
        self.public_path = Path(public_path).resolve()
        self.private_path = Path(private_path).resolve()
        
        # Define what goes where
        self.public_files = [
            'README.md',
            'LICENSE', 
            'tasks.md',
            'docs/',
            # Note: copilot-instructions.md, media/, CHANGELOG.md don't exist yet
        ]
        
        self.private_files = [
            'src/',
            'tests/',
            '.github/workflows/',
            'Fusion_System_Blocks.py',
            'Fusion_System_Blocks.manifest',
            '.gitignore',
            '.vscode/',
            'examples/',
            'exports/',
            '__pycache__/',
            'test-modular-loading.html',
            # All the internal documentation and testing files
            'TESTING_CHECKLIST.md',
            'DETAILED_TESTING_DOCUMENTATION.md',
            'FRONTEND_MODULARIZATION_COMPLETE.md',
            'CRITICAL_ISSUES.md',
            'MILESTONE_10_TESTING.md',
            'MILESTONE_1_FIXES.md',
            'PERFORMANCE_FIXES_ROUND3.md',
        ]

    def create_directories(self):
        """Create target directories if they don't exist."""
        print(f"📁 Ensuring directories exist...")
        self.public_path.mkdir(parents=True, exist_ok=True)
        self.private_path.mkdir(parents=True, exist_ok=True)
        print(f"   Public repo: {self.public_path}")
        print(f"   Private repo: {self.private_path}")

    def copy_files(self, file_list, destination, description):
        """Copy files from source to destination."""
        print(f"\n📋 Copying {description} files...")
        
        for item in file_list:
            source_item = self.source_path / item
            dest_item = destination / item
            
            if not source_item.exists():
                print(f"   ⚠️  {item} does not exist, skipping")
                continue
                
            try:
                if source_item.is_dir():
                    if dest_item.exists():
                        shutil.rmtree(dest_item)
                    shutil.copytree(source_item, dest_item)
                    print(f"   📂 {item}")
                else:
                    dest_item.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_item, dest_item)
                    print(f"   📄 {item}")
            except Exception as e:
                print(f"   ❌ Failed to copy {item}: {e}")

    def create_requirements_txt(self):
        """Create requirements.txt for the private repo."""
        requirements_content = """# Fusion System Blocks Requirements
# Core dependencies for Fusion 360 Add-in

# Testing
pytest>=7.0.0
pytest-cov>=4.0.0

# Code quality
flake8>=6.0.0
black>=23.0.0

# Development tools
setuptools>=60.0.0
wheel>=0.37.0

# Optional: If using specific libraries
# requests>=2.28.0
# numpy>=1.21.0
"""
        
        requirements_path = self.private_path / 'requirements.txt'
        with open(requirements_path, 'w', encoding='utf-8') as f:
            f.write(requirements_content)
        print(f"   📄 Created requirements.txt")

    def update_public_readme(self):
        """Update README.md in the public repo with licensing info."""
        public_readme = self.public_path / 'README.md'
        
        if not public_readme.exists():
            print("   ⚠️  README.md not found in public repo")
            return
            
        # Read original README
        with open(public_readme, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add licensing notice at the top after title
        lines = content.split('\n')
        title_line = -1
        
        for i, line in enumerate(lines):
            if line.startswith('# '):
                title_line = i
                break
        
        if title_line >= 0:
            licensing_notice = [
                "",
                "## 🔒 Source Code Privacy Notice",
                "",
                "**Source code is private as of current version.** Compiled add-ins are distributed here via Releases. Documentation, schema, and updates remain public.",
                "",
                "- 📦 **Releases**: Pre-compiled add-ins available in [Releases](../../releases)",
                "- 📚 **Documentation**: Full API documentation and usage guides", 
                "- 🔄 **Updates**: Feature announcements and changelogs",
                "- 🛠️ **Support**: Issue tracking and community support",
                "",
            ]
            
            # Insert after title
            lines = lines[:title_line+1] + licensing_notice + lines[title_line+1:]
            
            # Write back
            with open(public_readme, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            print(f"   📝 Updated README.md with privacy notice")
        else:
            print(f"   ⚠️  Could not find title in README.md")

    def create_gitignore_files(self):
        """Create appropriate .gitignore files for both repos."""
        
        # Public repo .gitignore
        public_gitignore = """# Public Repository - Documentation and Releases Only
*.pyc
__pycache__/
.DS_Store
Thumbs.db
.vscode/
.idea/
*.tmp
*.log

# Keep only documentation and release artifacts
"""
        
        # Private repo .gitignore  
        private_gitignore = """# Private Repository - Full Development Environment
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/
.nox/
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/

# Virtual environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Fusion 360 specific
*.f3d.bak
*.f3z.bak
*.log

# Build artifacts
exports/
*.zip
*.tar.gz
"""
        
        with open(self.public_path / '.gitignore', 'w', encoding='utf-8') as f:
            f.write(public_gitignore)
        print(f"   📄 Created public .gitignore")
        
        with open(self.private_path / '.gitignore', 'w', encoding='utf-8') as f:
            f.write(private_gitignore)
        print(f"   📄 Created private .gitignore")

    def create_github_workflow(self):
        """Create GitHub Actions workflow for private repo."""
        workflow_dir = self.private_path / '.github' / 'workflows'
        workflow_dir.mkdir(parents=True, exist_ok=True)
        
        workflow_content = """name: Build and Release to Public Repo

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      release_version:
        description: 'Release version (e.g., v1.0.0)'
        required: true
        default: 'v1.0.0'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout private repo
        uses: actions/checkout@v4
        
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          
      - name: Run linting
        run: |
          flake8 src/ tests/ --max-line-length=88 --exclude=__pycache__
          
      - name: Run tests
        run: |
          pytest tests/ -v --cov=src/ --cov-report=term-missing

  build-and-release:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout private repo
        uses: actions/checkout@v4
        
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Get version
        id: get_version
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "VERSION=${{ github.event.inputs.release_version }}" >> $GITHUB_OUTPUT
          else
            echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
          fi
          
      - name: Build add-in package
        run: |
          # Create build directory
          mkdir -p build/Fusion_System_Blocks
          
          # Copy essential files
          cp Fusion_System_Blocks.py build/Fusion_System_Blocks/
          cp Fusion_System_Blocks.manifest build/Fusion_System_Blocks/
          cp -r src/ build/Fusion_System_Blocks/
          cp LICENSE build/Fusion_System_Blocks/
          
          # Create README for the package
          cat > build/Fusion_System_Blocks/README.txt << EOF
          Fusion System Blocks Add-in
          Version: ${{ steps.get_version.outputs.VERSION }}
          
          Installation:
          1. Extract this folder to your Fusion 360 Add-ins directory
          2. Restart Fusion 360
          3. Enable the add-in from the Scripts and Add-ins panel
          
          For documentation and support, visit:
          https://github.com/zcohen-nerd/Fusion_System_Blocks
          EOF
          
          # Create zip package
          cd build
          zip -r "Fusion_System_Blocks_${{ steps.get_version.outputs.VERSION }}.zip" Fusion_System_Blocks/
          
      - name: Checkout public repo
        uses: actions/checkout@v4
        with:
          repository: zcohen-nerd/Fusion_System_Blocks  # Update with actual public repo name
          token: ${{ secrets.PUBLIC_REPO_TOKEN }}
          path: public-repo
          
      - name: Create Release in Public Repo
        uses: softprops/action-gh-release@v1
        with:
          token: ${{ secrets.PUBLIC_REPO_TOKEN }}
          repository: zcohen-nerd/Fusion_System_Blocks  # Update with actual public repo name
          tag_name: ${{ steps.get_version.outputs.VERSION }}
          name: "Fusion System Blocks ${{ steps.get_version.outputs.VERSION }}"
          body: |
            ## Fusion System Blocks ${{ steps.get_version.outputs.VERSION }}
            
            ### 📦 Installation
            1. Download `Fusion_System_Blocks_${{ steps.get_version.outputs.VERSION }}.zip`
            2. Extract to your Fusion 360 Add-ins directory
            3. Restart Fusion 360 and enable the add-in
            
            ### 🚀 What's New
            - Latest features and improvements
            - Bug fixes and performance enhancements
            - Updated documentation
            
            ### 📚 Documentation
            See the [README](README.md) for full documentation and usage instructions.
            
            ### 🐛 Issues
            Report issues on the [Issues page](../../issues).
          files: |
            build/Fusion_System_Blocks_${{ steps.get_version.outputs.VERSION }}.zip
          draft: false
          prerelease: false

# Required secrets:
# - PUBLIC_REPO_TOKEN: Personal Access Token with repo permissions for the public repository
"""
        
        workflow_path = workflow_dir / 'build-and-release.yml'
        with open(workflow_path, 'w', encoding='utf-8') as f:
            f.write(workflow_content)
        print(f"   📄 Created GitHub Actions workflow")

    def create_commit_scripts(self):
        """Create PowerShell scripts for making commits."""
        
        # Public repo commit script
        public_commit = """# Public Repository Commit Script
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
"""

        # Private repo commit script  
        private_commit = """# Private Repository Commit Script
param(
    [string]$RepoPath = "."
)

Set-Location $RepoPath

Write-Host "🔄 Setting up private repository..."

# Initialize git if needed
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git repository initialized"
}

# Add all files
git add .
Write-Host "📁 Files staged"

# First commit
git commit -m "chore: split project into public/private repos

- Moved source code and tests to private repo
- Added CI/CD workflow for public releases
- Configured development environment"

Write-Host "✅ Private repo initial commit complete"

# Add workflow commit
git add .github/workflows/build-and-release.yml
git commit -m "ci: add workflow to publish compiled build to public repo

- Automated testing with pytest and flake8
- Package building and zip creation
- Automated release to public repository
- Version management through tags"

Write-Host "✅ Private repo CI commit complete"
Write-Host "📝 Next steps:"
Write-Host "   1. git remote add origin <private-repo-url>"
Write-Host "   2. git push -u origin main" 
Write-Host "   3. Add PUBLIC_REPO_TOKEN secret in GitHub repo settings"
"""
        
        with open(self.public_path / 'commit_public.ps1', 'w', encoding='utf-8') as f:
            f.write(public_commit)
        print(f"   📄 Created public repo commit script")
        
        with open(self.private_path / 'commit_private.ps1', 'w', encoding='utf-8') as f:
            f.write(private_commit)
        print(f"   📄 Created private repo commit script")

    def run_split(self):
        """Execute the complete repository split."""
        print("🚀 Starting repository split...")
        print(f"Source: {self.source_path}")
        
        # Verify source exists
        if not self.source_path.exists():
            print(f"❌ Source path does not exist: {self.source_path}")
            return False
            
        try:
            # Create target directories
            self.create_directories()
            
            # Copy files to respective repos
            self.copy_files(self.public_files, self.public_path, "PUBLIC")
            self.copy_files(self.private_files, self.private_path, "PRIVATE")
            
            # Create additional files
            print(f"\n🔧 Creating additional files...")
            self.create_requirements_txt()
            self.update_public_readme()
            self.create_gitignore_files()
            self.create_github_workflow()
            self.create_commit_scripts()
            
            print(f"\n✅ Repository split complete!")
            print(f"\n📋 Next steps:")
            print(f"   1. Review files in both repositories")
            print(f"   2. Create GitHub repositories:")
            print(f"      - Public: Fusion_System_Blocks (or similar)")
            print(f"      - Private: Fusion_System_Blocks_Private (or similar)")
            print(f"   3. Run commit scripts in each directory:")
            print(f"      - Public: .\\commit_public.ps1")
            print(f"      - Private: .\\commit_private.ps1")
            print(f"   4. Push to GitHub and configure secrets")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during repository split: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description='Split Fusion System Blocks into public and private repositories')
    parser.add_argument('--source', '-s', default='.', help='Source repository path (default: current directory)')
    parser.add_argument('--public', '-p', required=True, help='Public repository target path')
    parser.add_argument('--private', '-r', required=True, help='Private repository target path')
    
    args = parser.parse_args()
    
    splitter = RepositorySplitter(args.source, args.public, args.private)
    success = splitter.run_split()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()