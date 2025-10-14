// Updater initialization - call this in your app startup
import updaterService from './updater-service';

export async function initializeUpdater() {
  try {
    // Only start in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_UPDATER === 'true') {
      updaterService.start();
      console.log('[app] Updater initialized');
    } else {
      console.log('[app] Updater disabled in development mode');
    }
  } catch (error) {
    console.error('[app] Failed to initialize updater:', error);
  }
}

export function stopUpdater() {
  updaterService.stop();
  console.log('[app] Updater stopped');
}