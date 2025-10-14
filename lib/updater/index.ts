// Auto-updater for Next.js application
// Checks GitHub Releases for updates and performs git pull + rebuild

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
}

interface UpdaterConfig {
  repo: string;
  packageJsonPath?: string;
  intervalMs?: number;
  onUpdateStart?: () => void;
  onUpdateComplete?: (success: boolean) => void;
  onUpdateError?: (error: Error) => void;
}

class NextJSUpdater {
  private repo: string;
  private githubApiUrl: string;
  private packageJsonPath: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private onUpdateStart?: () => void;
  private onUpdateComplete?: (success: boolean) => void;
  private onUpdateError?: (error: Error) => void;

  constructor(config: UpdaterConfig) {
    this.repo = config.repo;
    this.githubApiUrl = `https://api.github.com/repos/${this.repo}/releases/latest`;
    this.packageJsonPath = config.packageJsonPath || path.join(process.cwd(), 'package.json');
    this.intervalMs = config.intervalMs || 60 * 60 * 1000; // 1 hour default
    this.onUpdateStart = config.onUpdateStart;
    this.onUpdateComplete = config.onUpdateComplete;
    this.onUpdateError = config.onUpdateError;
  }

  private getLocalVersion(): string | null {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version || null;
    } catch (error) {
      console.error('[updater] Failed to read package.json:', error);
      return null;
    }
  }

  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    try {
      const response = await fetch(this.githubApiUrl, {
        headers: {
          'User-Agent': 'nextjs-auto-updater',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as GitHubRelease;
      return data;
    } catch (error) {
      console.error('[updater] Failed to fetch latest release:', error);
      return null;
    }
  }

  private runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[updater] Running: ${command}`);
      
      const process = exec(command, { 
        cwd: path.dirname(this.packageJsonPath),
        timeout: 300000 // 5 minutes timeout
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[updater] Command failed: ${error.message}`);
          console.error(`[updater] stderr: ${stderr}`);
          return reject(error);
        }
        
        if (stdout) console.log(`[updater] stdout: ${stdout}`);
        resolve(stdout);
      });

      // Handle process events
      process.on('error', (error) => {
        console.error(`[updater] Process error: ${error.message}`);
        reject(error);
      });
    });
  }

  private async performUpdate(): Promise<boolean> {
    try {
      this.onUpdateStart?.();
      console.log('[updater] Starting update process...');

      // Step 1: Git pull
      await this.runCommand('git pull');
      console.log('[updater] Git pull completed');

      // Step 2: Install dependencies
      await this.runCommand('npm install --no-audit --no-fund');
      console.log('[updater] Dependencies installed');

      // Step 3: Build application
      await this.runCommand('npm run build');
      console.log('[updater] Build completed');

      // Step 4: Try to restart with PM2 (if available)
      try {
        await this.runCommand('pm2 restart orbis-ship');
        console.log('[updater] PM2 restart completed');
      } catch (pm2Error) {
        console.warn('[updater] PM2 restart failed. Application may need manual restart.');
        console.warn('[updater] PM2 Error:', pm2Error);
        
        // In production, you might want to exit the process
        // so that a process manager can restart it
        if (process.env.NODE_ENV === 'production') {
          console.log('[updater] Exiting process for external restart...');
          setTimeout(() => process.exit(0), 2000);
        }
      }

      this.onUpdateComplete?.(true);
      return true;
    } catch (error) {
      console.error('[updater] Update failed:', error);
      this.onUpdateError?.(error as Error);
      this.onUpdateComplete?.(false);
      return false;
    }
  }

  public async checkForUpdates(): Promise<{
    updateAvailable: boolean;
    localVersion: string | null;
    latestVersion: string | null;
    releaseInfo?: GitHubRelease;
  }> {
    try {
      const localVersion = this.getLocalVersion();
      const latestRelease = await this.fetchLatestRelease();

      if (!latestRelease) {
        return {
          updateAvailable: false,
          localVersion,
          latestVersion: null,
        };
      }

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const updateAvailable = localVersion !== latestVersion;

      console.log(`[updater] Version check - Local: ${localVersion}, Latest: ${latestVersion}, Update available: ${updateAvailable}`);

      return {
        updateAvailable,
        localVersion,
        latestVersion,
        releaseInfo: latestRelease,
      };
    } catch (error) {
      console.error('[updater] Check for updates failed:', error);
      return {
        updateAvailable: false,
        localVersion: this.getLocalVersion(),
        latestVersion: null,
      };
    }
  }

  public async checkAndUpdate(): Promise<boolean> {
    const updateCheck = await this.checkForUpdates();
    
    if (updateCheck.updateAvailable) {
      console.log(`[updater] Update available: ${updateCheck.latestVersion}`);
      return await this.performUpdate();
    }
    
    console.log('[updater] No updates available');
    return false;
  }

  public start(): void {
    if (this.checkInterval) {
      this.stop();
    }

    // Run initial check
    this.checkAndUpdate().catch(console.error);

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.checkAndUpdate().catch(console.error);
    }, this.intervalMs);

    console.log(`[updater] Auto-updater started. Checking every ${this.intervalMs / 1000} seconds`);
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[updater] Auto-updater stopped');
    }
  }

  public async manualUpdate(): Promise<boolean> {
    console.log('[updater] Manual update triggered');
    return await this.checkAndUpdate();
  }
}

export { NextJSUpdater, type UpdaterConfig, type GitHubRelease };