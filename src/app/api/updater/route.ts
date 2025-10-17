import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO = 'mehtabshadan/orbis-ship';
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Function to check internet connectivity
async function isInternetAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('[updater] Internet connectivity check failed:', error);
    return false;
  }
}

interface UpdaterStatus {
  isRunning: boolean;
  localVersion: string | null;
  repository: string;
  lastCheck: string | null;
  updateAvailable: boolean;
  latestVersion: string | null;
  releaseName?: string;
}

interface UpdateInfo {
  updateAvailable: boolean;
  localVersion: string | null;
  latestVersion: string | null;
  lastCheck: string;
  releaseName?: string;
  releaseNotes?: string;
  error?: string;
}

// In-memory state for the updater
let isUpdaterRunning = false;
let checkInterval: NodeJS.Timeout | null = null;
let lastUpdateInfo: UpdateInfo = {
  updateAvailable: false,
  localVersion: null,
  latestVersion: null,
  lastCheck: new Date().toISOString()
};

function getLocalVersion(): string | null {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || null;
  } catch (error) {
    console.error('[updater] Failed to read package.json:', error);
    return null;
  }
}

function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[updater] Running command:', cmd);
    
    exec(cmd, { 
      cwd: process.cwd(),
      timeout: 300000 // 5 minute timeout
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('[updater] Command failed:', err.message);
        if (stderr) console.error('[updater] STDERR:', stderr);
        return reject(err);
      }
      
      if (stdout) console.log('[updater] STDOUT:', stdout.trim());
      if (stderr) console.warn('[updater] STDERR:', stderr.trim());
      
      resolve(stdout);
    });
  });
}

async function downloadAndExtractUpdate(downloadUrl: string): Promise<void> {
  const tempDir = path.join(process.cwd(), 'temp-update');
  const zipFile = path.join(tempDir, 'update.zip');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Download the update file
    console.log('[updater] Downloading update from:', downloadUrl);
    const response = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'orbis-ship-updater' }
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(zipFile, Buffer.from(buffer));

    // Extract the update (using PowerShell on Windows)
    await runCommand(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${tempDir}' -Force"`);
    
    console.log('[updater] Update downloaded and extracted successfully');
  } catch (error) {
    console.error('[updater] Failed to download/extract update:', error);
    throw error;
  }
}

async function checkForUpdates(): Promise<void> {
  try {
    console.log('[updater] Checking for updates...');
    
    // Check internet connectivity first
    const hasInternet = await isInternetAvailable();
    if (!hasInternet) {
      console.log('[updater] No internet connection available, skipping update check');
      return;
    }
    
    const response = await fetch(GITHUB_API, { 
      headers: { 'User-Agent': 'orbis-ship-updater' } 
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const localVersion = getLocalVersion();
    
    // Extract version from release name instead of tag_name
    // Example: "Orbis Ship Latest (v0.0.9)" -> "0.0.9"
    let latestVersion = null;
    if (data.name) {
      const versionMatch = data.name.match(/\(v?([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?)\)/);
      if (versionMatch) {
        latestVersion = versionMatch[1]; // Extract the version number without 'v'
      }
    }
    
    // Fallback to tag_name if name parsing fails
    if (!latestVersion && data.tag_name) {
      latestVersion = data.tag_name.replace(/^v/, '');
    }
    
    console.log(`[updater] Release name: "${data.name}"`);
    console.log(`[updater] Extracted version from name: ${latestVersion}`);
    console.log(`[updater] Local version: ${localVersion} | Latest version: ${latestVersion}`);
    
    // Update the global state
    lastUpdateInfo = {
      updateAvailable: false,
      localVersion: localVersion,
      latestVersion: latestVersion,
      lastCheck: new Date().toISOString(),
      releaseName: data.name
    };
    
    if (!latestVersion) {
      console.log(`[updater] Could not extract version from release name: "${data.name}"`);
      return;
    }
    
    // Simplified update detection - since versions always increment,
    // any difference means an update is available
    if (localVersion !== latestVersion) {
      console.log(`[updater] Update available: ${localVersion} → ${latestVersion}`);
      lastUpdateInfo.updateAvailable = true;
    } else {
      console.log('[updater] Application is up-to-date');
    }
    
  } catch (error) {
    console.error('[updater] Update check failed:', error);
  }
}

async function performUpdate(): Promise<boolean> {
  try {
    console.log('[updater] Starting update process...');
    
    const response = await fetch(GITHUB_API, { 
      headers: { 'User-Agent': 'orbis-ship-updater' } 
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`);
    }
    
    const data = await response.json();
    const assets = data.assets || [];
    const zipAsset = assets.find((asset: { name: string; browser_download_url: string }) => asset.name.endsWith('.zip'));
    
    if (!zipAsset) {
      throw new Error('No ZIP asset found in release');
    }
    
    // Download and extract the update
    await downloadAndExtractUpdate(zipAsset.browser_download_url);
    
    // Replace current files with updated ones
    const tempDir = path.join(process.cwd(), 'temp-update');
    const extractedDir = fs.readdirSync(tempDir).find(name => fs.statSync(path.join(tempDir, name)).isDirectory());
    
    if (!extractedDir) {
      throw new Error('No extracted directory found');
    }
    
    const updateSource = path.join(tempDir, extractedDir);
    
    // Copy files (excluding temp-update directory itself)
    await runCommand(`robocopy "${updateSource}" "${process.cwd()}" /E /XD temp-update`);
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('[updater] Update completed successfully!');
    console.log('[updater] Restarting application...');
    
    // Schedule process restart after a short delay
    setTimeout(() => {
      process.exit(0);
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('[updater] Update process failed:', error);
    return false;
  }
}

function startBackgroundUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  // Check immediately, then every hour
  checkForUpdates();
  checkInterval = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
  
  console.log('[updater] Background updater started - checking every hour');
}

function stopBackgroundUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log('[updater] Background updater stopped');
}

// Auto-start the updater when the module loads
function initializeAutoUpdater(): void {
  if (!isUpdaterRunning) {
    isUpdaterRunning = true;
    startBackgroundUpdater();
    console.log('[updater] Auto-updater initialized and started automatically');
  }
}

// Initialize the auto-updater when the module loads
initializeAutoUpdater();

export async function GET() {
  try {
    const status: UpdaterStatus = {
      isRunning: isUpdaterRunning,
      localVersion: getLocalVersion(),
      repository: REPO,
      lastCheck: lastUpdateInfo.lastCheck,
      updateAvailable: lastUpdateInfo.updateAvailable,
      latestVersion: lastUpdateInfo.latestVersion,
      releaseName: lastUpdateInfo.releaseName
    };
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        message: status.isRunning ? 'Auto-updater is running' : 'Auto-updater is stopped'
      }
    });
  } catch (error) {
    console.error('Updater status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get updater status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'start':
        isUpdaterRunning = true;
        startBackgroundUpdater();
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Background auto-updater started',
            isRunning: true
          }
        });
      
      case 'stop':
        isUpdaterRunning = false;
        stopBackgroundUpdater();
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Background auto-updater stopped',
            isRunning: false
          }
        });
      
      case 'check':
        await checkForUpdates();
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Update check completed',
            updateInfo: lastUpdateInfo
          }
        });

      case 'update':
        const updateResult = await performUpdate();
        
        return NextResponse.json({
          success: true,
          data: {
            message: updateResult ? 'Update initiated - application will restart' : 'Update failed',
            updatePerformed: updateResult
          }
        });
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: start, stop, check, update'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Updater action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: `Updater action failed: ${errorMessage}`
    }, { status: 500 });
  }
}