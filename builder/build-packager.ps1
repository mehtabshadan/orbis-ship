# ===========================================
# ORBIS NEXT.JS BUILD AND DEPLOYMENT PACKAGER
# ===========================================
# This script builds your Next.js application and creates a deployment package
# that can be deployed to any Windows machine
#
# By default, packages are created in .\dist\ folder
# Use -OutputPath parameter to specify a different location
#
# ===========================================

param(
    [string]$OutputPath = "",
    [string]$PackageName = "OrbisApp-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    [string]$BaseDir = "",
    [switch]$SkipBuild = $false,
    [switch]$OpenFolder = $false
)

# Configuration - Determine the correct base directory
if ($BaseDir) {
    $baseDir = $BaseDir
} elseif ($PSScriptRoot) {
    # This script is in the 'build' folder, so go up one level to project root
    $baseDir = Split-Path $PSScriptRoot -Parent
} else {
    # Fallback to current directory
    $baseDir = (Get-Location).Path
}

# Use local dist folder if no OutputPath specified
if ([string]::IsNullOrEmpty($OutputPath)) {
    $OutputPath = Join-Path $baseDir "dist"
}

$packageDir = Join-Path $OutputPath $PackageName
$zipFile = Join-Path $OutputPath "$PackageName.zip"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    Orbis Build & Deployment Packager" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base Directory: $baseDir" -ForegroundColor Gray
Write-Host "Output Path: $OutputPath" -ForegroundColor Gray
Write-Host ""

# Change to the base directory for all operations
Set-Location $baseDir

# ===========================================
# STEP 1: Install Dependencies & Build Next.js
# ===========================================
if (-not $SkipBuild) {
    Write-Host "Step 1: Installing dependencies..." -ForegroundColor Cyan
    
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Host "ERROR: package.json not found in base directory: $baseDir" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Install dependencies
    Write-Host "Installing npm dependencies..." -ForegroundColor Gray
    $installResult = cmd /c "npm install 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Dependencies installation failed!" -ForegroundColor Red
        Write-Host $installResult -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "OK: Dependencies installed successfully" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 2: Building Next.js application..." -ForegroundColor Cyan
    
    # Build the application
    Write-Host "Running npm run build..." -ForegroundColor Gray
    $buildResult = cmd /c "npm run build 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Next.js build failed!" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "OK: Next.js build completed successfully" -ForegroundColor Green
    Write-Host ""

    Write-Host "Step 3: Copying static assets to standalone..." -ForegroundColor Cyan
    
    # Ensure static assets are available in standalone build
    Write-Host "INFO: Ensuring static assets are available in standalone build..." -ForegroundColor Gray
    
    if (-not (Test-Path ".next\standalone\.next")) {
        New-Item -ItemType Directory -Path ".next\standalone\.next" -Force | Out-Null
    }
    
    if (Test-Path ".next\static") {
        Copy-Item -Path ".next\static" -Destination ".next\standalone\.next\static" -Recurse -Force
        Write-Host "OK: Static assets copied to standalone" -ForegroundColor Green
    } else {
        Write-Host "WARN: No static assets found" -ForegroundColor Yellow
    }
    
    if (Test-Path "public") {
        Copy-Item -Path "public" -Destination ".next\standalone\public" -Recurse -Force
        Write-Host "OK: Public assets copied to standalone" -ForegroundColor Green
    }
    Write-Host ""

    Write-Host "Step 4: Optimizing standalone files..." -ForegroundColor Cyan
    Write-Host "CLEAN: Removing unnecessary files from standalone..." -ForegroundColor Gray
    
    # Read devDependencies from package.json
    $devDependenciesToRemove = @()
    if (Test-Path "package.json") {
        try {
            $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($packageJson.devDependencies) {
                foreach ($dep in $packageJson.devDependencies.PSObject.Properties) {
                    $depName = $dep.Name
                    $depPath = ".next\standalone\node_modules\$depName"
                    $devDependenciesToRemove += $depPath
                    Write-Host "  Will remove dev dependency: $depName" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "WARN: Could not read devDependencies from package.json: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    # Add additional heavy development dependencies that might not be in devDependencies
    $additionalDevDeps = @(
        ".next\standalone\node_modules\webpack",
        ".next\standalone\node_modules\terser",
        ".next\standalone\node_modules\watchpack",
        ".next\standalone\node_modules\eslint-scope",
        ".next\standalone\node_modules\@babel"
    )
    $devDependenciesToRemove += $additionalDevDeps
    
    foreach ($dep in $devDependenciesToRemove) {
        if (Test-Path $dep) {
            Remove-Item $dep -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  Removed: $dep" -ForegroundColor Gray
        }
    }
    
    # Remove documentation and test files
    $foldersToRemove = @("test", "tests", "docs", "documentation", "__tests__", "spec")
    Get-ChildItem ".next\standalone\node_modules" -Directory -Recurse | Where-Object { 
        $_.Name -in $foldersToRemove 
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    
    # Remove source maps and TypeScript files
    Get-ChildItem ".next\standalone\node_modules" -File -Recurse -ErrorAction SilentlyContinue | Where-Object { 
        $_.Extension -in @(".map", ".ts", ".tsx") 
    } | Remove-Item -Force -ErrorAction SilentlyContinue
    
    # Remove .nft.json files that can cause packaging issues
    Get-ChildItem ".next\standalone" -File -Recurse -Filter "*.nft.json" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    
    Write-Host "OK: Standalone optimization complete!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping build step (using existing build)..." -ForegroundColor Yellow
    Write-Host ""
}

# ===========================================
# STEP 5: Verify Required Files
# ===========================================
Write-Host "Step 5: Verifying required files..." -ForegroundColor Cyan

$requiredFiles = @(
    ".next\standalone\server.js",
    "builder\run.bat",
    "builder\setup.ps1"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $baseDir $file
    if (-not (Test-Path $fullPath)) {
        $missingFiles += $file
        Write-Host "  MISSING: $file (checked: $fullPath)" -ForegroundColor Red
    } else {
        Write-Host "  FOUND: $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please ensure you have:" -ForegroundColor Yellow
    Write-Host "1. Built your Next.js app successfully" -ForegroundColor Gray
    Write-Host "2. Configured standalone output in next.config.js" -ForegroundColor Gray
    Write-Host "3. All required deployment scripts are present in run/ folder" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Current working directory: $(Get-Location)" -ForegroundColor Gray
    Write-Host "Base directory: $baseDir" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "OK: All required files found" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 6: Create Package Directory
# ===========================================
Write-Host "Step 6: Creating deployment package..." -ForegroundColor Cyan

# Ensure the output directory exists
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Host "Created output directory: $OutputPath" -ForegroundColor Gray
}

if (Test-Path $packageDir) {
    Remove-Item $packageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

Write-Host "Package directory created: $packageDir" -ForegroundColor Green
Write-Host "Output location: $(Resolve-Path $OutputPath)" -ForegroundColor Gray
Write-Host ""

# ===========================================
# STEP 7: Copy Application Files
# ===========================================
Write-Host "Step 7: Copying application files..." -ForegroundColor Cyan

# Copy .next/standalone directory
$standaloneSource = Join-Path $baseDir ".next\standalone"
$standaloneTarget = Join-Path $packageDir ".next\standalone"
if (Test-Path $standaloneSource) {
    Write-Host "Copying standalone application..." -ForegroundColor Gray
    Copy-Item -Path $standaloneSource -Destination $standaloneTarget -Recurse -Force
}

# Copy static files if they exist
$staticSource = Join-Path $baseDir ".next\static"
$staticTarget = Join-Path $packageDir ".next\static"
if (Test-Path $staticSource) {
    Write-Host "Copying static files..." -ForegroundColor Gray
    Copy-Item -Path $staticSource -Destination $staticTarget -Recurse -Force
}

# Copy public directory if it exists
$publicSource = Join-Path $baseDir "public"
$publicTarget = Join-Path $packageDir "public"
if (Test-Path $publicSource) {
    Write-Host "Copying public files..." -ForegroundColor Gray
    Copy-Item -Path $publicSource -Destination $publicTarget -Recurse -Force
}

Write-Host "OK: Application files copied successfully" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 8: Copy Script Files to Package
# ===========================================
Write-Host "Step 8: Copying script files..." -ForegroundColor Cyan

$scriptFiles = @(
    @{ Source = "builder\run.bat"; Dest = "run.bat" },
    @{ Source = "builder\setup.ps1"; Dest = "setup.ps1" },
    @{ Source = "run\silent-setup.ps1"; Dest = "silent-setup.ps1" }
)

foreach ($file in $scriptFiles) {
    $sourcePath = Join-Path $baseDir $file.Source
    $destPath = Join-Path $packageDir $file.Dest
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        Write-Host "  Copied: $($file.Source)" -ForegroundColor Gray
    } else {
        Write-Host "  WARNING: File not found: $($file.Source)" -ForegroundColor Yellow
    }
}

Write-Host "OK: Deployment scripts copied successfully" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 9: Skip Installation Instructions and Build Scripts
# ===========================================
Write-Host "Step 9: Excluding build tools from package..." -ForegroundColor Cyan

# Remove build and run folders from the package (they shouldn't be deployed)
$foldersToRemove = @("build", "run")
foreach ($folder in $foldersToRemove) {
    $folderPath = Join-Path $packageDir $folder
    if (Test-Path $folderPath) {
        Remove-Item $folderPath -Recurse -Force
        Write-Host "  Excluded folder: $folder" -ForegroundColor Gray
    }
}

Write-Host "OK: Build tools excluded from package" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 10: Create Version Info
# ===========================================
Write-Host "Step 10: Creating version info..." -ForegroundColor Cyan

# Read package.json to get name and version
$packageJsonPath = Join-Path $baseDir "package.json"
$packageName = "orbis-ship"
$packageVersion = "1.0.0"

if (Test-Path $packageJsonPath) {
    try {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        $packageName = $packageJson.name
        $packageVersion = $packageJson.version
        Write-Host "Read from package.json: $packageName v$packageVersion" -ForegroundColor Gray
    } catch {
        Write-Host "WARN: Could not read package.json, using defaults" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARN: package.json not found, using defaults" -ForegroundColor Yellow
}

$versionInfo = @{
    CreatedDate = Get-Date -Format "yyyy-MM-dd HH.mm.ss"
    Files = (Get-ChildItem $packageDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    TotalSize = [math]::Round((Get-ChildItem $packageDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Version = $packageVersion
    Name = $packageName
} | ConvertTo-Json -Depth 2

$versionInfoFile = Join-Path $packageDir "version.json"
$versionInfo | Out-File -FilePath $versionInfoFile -Encoding UTF8

Write-Host "OK: Version info created" -ForegroundColor Green
Write-Host ""

# ===========================================
# STEP 11: Create ZIP Package
# ===========================================
Write-Host "Step 11: Creating ZIP package..." -ForegroundColor Cyan

# Clean up problematic files that can cause ZIP creation issues
Write-Host "Cleaning up problematic files..." -ForegroundColor Gray
try {
    # Remove .nft.json files that can cause issues
    Get-ChildItem $packageDir -Recurse -Filter "*.nft.json" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    
    # Remove any broken symlinks or junction points
    Get-ChildItem $packageDir -Recurse -ErrorAction SilentlyContinue | Where-Object { 
        $_.Attributes -match "ReparsePoint" 
    } | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    
    Write-Host "OK: Cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "WARN: Cleanup had issues: $($_.Exception.Message)" -ForegroundColor Yellow
}

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($packageDir, $zipFile)
    
    $zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
    Write-Host "OK: ZIP package created: $zipFile ($zipSize MB)" -ForegroundColor Green
}
catch {
    Write-Host "WARN: Could not create ZIP file: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "      The unzipped package in $packageDir is still usable" -ForegroundColor Gray
}

Write-Host ""

# ===========================================
# STEP 12: Test Built Application (Optional)
# ===========================================
Write-Host "Step 12: Testing built application..." -ForegroundColor Cyan

$testServerPath = Join-Path $packageDir ".next\standalone\server.js"
if (Test-Path $testServerPath) {
    Write-Host "Testing the standalone server..." -ForegroundColor Gray
    
    try {
        # Test that the server file can be loaded (syntax check)
        $testResult = node -c $testServerPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Server syntax test passed" -ForegroundColor Green
        } else {
            Write-Host "WARN: Server syntax test failed: $testResult" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "WARN: Could not test server: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARN: Server file not found for testing" -ForegroundColor Yellow
}

Write-Host ""

# ===========================================
# SUMMARY
# ===========================================
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    BUILD & PACKAGE COMPLETED!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package Details:" -ForegroundColor White
Write-Host "  Name: $PackageName" -ForegroundColor Gray
Write-Host "  Source: $baseDir" -ForegroundColor Gray
Write-Host "  Output Folder: $(Resolve-Path $OutputPath)" -ForegroundColor Gray
Write-Host "  Package Location: $packageDir" -ForegroundColor Gray
if (Test-Path $zipFile) {
    Write-Host "  ZIP File: $zipFile" -ForegroundColor Gray
}

# Calculate package statistics with error handling
try {
    $fileCount = (Get-ChildItem $packageDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    $totalSize = [math]::Round((Get-ChildItem $packageDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host "  Total Files: $fileCount" -ForegroundColor Gray
    Write-Host "  Total Size: $totalSize MB" -ForegroundColor Gray
} catch {
    Write-Host "  Total Files: Unable to calculate (symlink issues)" -ForegroundColor Yellow
    Write-Host "  Total Size: Unable to calculate (symlink issues)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Package Contents:" -ForegroundColor White
Write-Host "  * .next/standalone/ - Next.js application" -ForegroundColor Gray
Write-Host "  * runorbis.bat - Server startup script" -ForegroundColor Gray
Write-Host "  * setup.ps1 - Interactive installer" -ForegroundColor Gray
Write-Host "  * version.json - Package version info" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Copy the package to your target machine" -ForegroundColor Gray
Write-Host "2. Extract to desired location (e.g., C:\Apps\OrbisApp)" -ForegroundColor Gray
Write-Host "3. Run setup.ps1 as Administrator to install" -ForegroundColor Gray
Write-Host ""

# Open the package directory if requested
if ($OpenFolder -or ((Read-Host "Open package directory? (y/N)") -eq 'y')) {
    Start-Process explorer.exe -ArgumentList $packageDir
}

Write-Host ""
Write-Host "READY: Your Orbis deployment package is ready!" -ForegroundColor Green
Read-Host "Press Enter to exit"