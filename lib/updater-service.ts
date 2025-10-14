// Server-side updater service
import { NextJSUpdater } from './updater';
import updaterConfig from './updater/config';

class UpdaterService {
  private static instance: UpdaterService | null = null;
  private updater: NextJSUpdater | null = null;
  private isStarted = false;

  private constructor() {}

  public static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService();
    }
    return UpdaterService.instance;
  }

  public start(): void {
    if (this.isStarted) {
      console.log('[updater-service] Already started');
      return;
    }

    if (!updaterConfig.enableAutoUpdate) {
      console.log('[updater-service] Auto-update disabled');
      return;
    }

    this.updater = new NextJSUpdater({
      repo: updaterConfig.repo,
      intervalMs: updaterConfig.intervalMs,
      onUpdateStart: () => {
        console.log('[updater-service] Update started');
      },
      onUpdateComplete: (success) => {
        console.log(`[updater-service] Update completed: ${success}`);
      },
      onUpdateError: (error) => {
        console.error('[updater-service] Update error:', error.message);
      },
    });

    this.updater.start();
    this.isStarted = true;
    console.log('[updater-service] Service started');
  }

  public stop(): void {
    if (this.updater) {
      this.updater.stop();
      this.updater = null;
    }
    this.isStarted = false;
    console.log('[updater-service] Service stopped');
  }

  public getUpdater(): NextJSUpdater | null {
    return this.updater;
  }

  public isRunning(): boolean {
    return this.isStarted;
  }
}

export const updaterService = UpdaterService.getInstance();
export default updaterService;