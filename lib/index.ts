// Export all updater functionality
export { NextJSUpdater, type UpdaterConfig, type GitHubRelease } from './updater';
export { default as updaterConfig } from './updater/config';
export { default as updaterService } from './updater-service';
export { initializeUpdater, stopUpdater } from './updater-init';