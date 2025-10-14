# Next.js Auto-Updater

This auto-updater system automatically checks for updates from your GitHub repository and applies them in production. It includes both server-side and client-side components.

## Features

- ✅ Automatic update checks every hour
- ✅ Update checks when internet becomes available
- ✅ Manual update triggering
- ✅ Client-side update notifications
- ✅ Server-side auto-updating
- ✅ Git pull + npm install + npm run build
- ✅ PM2 restart support
- ✅ Error handling and logging
- ✅ Development/production mode awareness

## Configuration

### 1. Configure Repository

Edit `lib/updater/config.ts`:

```typescript
export const updaterConfig = {
  repo: 'your-username/your-repo-name', // Change this!
  intervalMs: 60 * 60 * 1000, // 1 hour
  enableAutoUpdate: process.env.NODE_ENV === 'production',
  enableDevNotifications: process.env.NODE_ENV === 'development',
};
```

### 2. Environment Variables

Add to your `.env.local` or production environment:

```bash
# Enable updater in development (optional)
ENABLE_UPDATER=true

# Production settings
NODE_ENV=production
```

## Usage

### Client-Side (React Hook)

```typescript
import { useUpdater } from '@/hooks/useUpdater';

function MyComponent() {
  const {
    updateAvailable,
    isChecking,
    isUpdating,
    localVersion,
    latestVersion,
    checkForUpdates,
    performUpdate,
  } = useUpdater({
    checkOnConnect: true, // Check when internet comes back
    autoUpdate: false, // Set to true for automatic updates
    onUpdateAvailable: (info) => {
      console.log('Update available:', info);
    },
  });

  return (
    <div>
      {updateAvailable && (
        <button onClick={performUpdate}>
          Update to {latestVersion}
        </button>
      )}
    </div>
  );
}
```

### Server-Side

The updater automatically starts in production mode. You can also manually control it:

```typescript
import { updaterService } from '@/lib';

// Start the updater
updaterService.start();

// Stop the updater
updaterService.stop();

// Check if running
const isRunning = updaterService.isRunning();
```

### API Endpoints

#### Check for Updates
```bash
GET /api/updater
```

#### Trigger Manual Update
```bash
POST /api/updater
Content-Type: application/json

{
  "action": "update"
}
```

#### Start/Stop Auto-Updater
```bash
POST /api/updater
Content-Type: application/json

{
  "action": "start" | "stop"
}
```

## Components

### UpdateNotification

A ready-to-use notification component that shows update status:

```typescript
import { UpdateNotification } from '@/components/UpdateNotification';

export default function Layout({ children }) {
  return (
    <div>
      {children}
      <UpdateNotification />
    </div>
  );
}
```

## Hooks

### useUpdater

Main hook for managing updates:

```typescript
const {
  // State
  updateInfo,
  isChecking,
  isUpdating,
  lastChecked,
  error,
  isOnline,
  
  // Actions
  checkForUpdates,
  performUpdate,
  startAutoCheck,
  stopAutoCheck,
  
  // Computed
  updateAvailable,
  localVersion,
  latestVersion,
  releaseInfo,
} = useUpdater(options);
```

### useOnline

Hook for detecting internet connectivity:

```typescript
const { isOnline, wasOffline } = useOnline({
  onOnline: () => console.log('Connected!'),
  onOffline: () => console.log('Disconnected!'),
});
```

## Update Process

When an update is available, the system:

1. Runs `git pull` to get the latest code
2. Runs `npm install --no-audit --no-fund` to update dependencies
3. Runs `npm run build` to rebuild the application
4. Attempts to restart with `pm2 restart orbis-ship`
5. If PM2 fails, exits the process for external restart

## Requirements

- Git repository with proper permissions
- Node.js and npm
- PM2 (optional, for automatic restart)
- Internet connectivity
- GitHub repository with releases/tags

## Production Setup

1. Ensure your application is a git clone of your repository
2. Make sure the git repository has proper permissions
3. Install PM2 globally: `npm install -g pm2`
4. Start your app with PM2: `pm2 start npm --name "orbis-ship" -- start`
5. Configure your repository in `lib/updater/config.ts`

## Development

In development mode:
- Auto-updater is disabled by default
- Update notifications still work
- Set `ENABLE_UPDATER=true` to enable in development

## Troubleshooting

### Common Issues

1. **Git permission denied**: Ensure proper SSH keys or tokens
2. **PM2 not found**: Install PM2 globally or handle restart manually
3. **Build failures**: Check build logs and ensure dependencies are compatible
4. **API rate limits**: GitHub API has rate limits for unauthenticated requests

### Debugging

Enable detailed logging by checking the browser console and server logs:

```typescript
// Client-side logs
console.log('[updater] checking for updates...');

// Server-side logs
console.log('[updater-service] Update started');
```

## Security Notes

- The updater runs git pull and npm install - ensure your repository is secure
- Consider implementing authentication for manual update endpoints
- In production, ensure proper file permissions and process isolation
- Monitor update logs for security issues

## License

This updater system is part of your Next.js application and follows the same license.