// Updater configuration
export const updaterConfig = {
  // Configure your GitHub repository here
  repo: 'mehtabshadan/orbis-ship', // Change this to your actual repository
  
  // Update check interval (1 hour = 3600000 ms)
  intervalMs: 60 * 60 * 1000,
  
  // Whether to enable auto-updates in production
  enableAutoUpdate: process.env.NODE_ENV === 'production',
  
  // Whether to show update notifications in development
  enableDevNotifications: process.env.NODE_ENV === 'development',
} as const;

export default updaterConfig;