# Next.js Auto-Updater Setup Guide

## Quick Setup

### 1. Configure Your Repository

Edit `lib/updater/config.ts` and change the repo:

```typescript
export const updaterConfig = {
  repo: 'your-username/your-repo-name', // ← Change this!
  intervalMs: 60 * 60 * 1000, // 1 hour
  enableAutoUpdate: process.env.NODE_ENV === 'production',
  enableDevNotifications: process.env.NODE_ENV === 'development',
};
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test in Development

```bash
# Start the development server
npm run dev

# Visit http://localhost:3000/updater-demo to see the updater in action
```

### 4. Production Deployment

```bash
# Build the application
npm run build

# Start in production mode
npm run start

# Or with PM2 (recommended)
pm2 start npm --name "orbis-ship" -- start
```

## What You Get

### ✅ Server-Side Auto-Updater
- Checks for updates every hour
- Automatically performs git pull, npm install, npm run build
- Restarts the application with PM2
- Runs only in production mode

### ✅ Client-Side Update Hooks
- `useUpdater()` - Manages update checking and execution
- `useOnline()` - Detects internet connectivity
- Checks for updates when internet comes back online

### ✅ API Endpoints
- `GET /api/updater` - Check for updates
- `POST /api/updater` - Trigger manual updates or control auto-updater

### ✅ Update Notification Component
- Shows update status to users
- Displays version information
- Allows manual update triggering
- Shows release notes

### ✅ Example Implementation
- Visit `/updater-demo` to see it in action
- Full working example with all features

## Files Created

```
lib/
├── updater/
│   ├── index.ts           # Main updater class
│   └── config.ts          # Configuration
├── updater-service.ts     # Server-side service
├── updater-init.ts        # Initialization helpers
└── index.ts               # Exports

src/
├── hooks/
│   ├── useUpdater.ts      # Update management hook
│   └── useOnline.ts       # Internet connectivity hook
├── components/
│   └── UpdateNotification.tsx  # Update notification UI
└── app/
    ├── api/
    │   ├── updater/
    │   │   └── route.ts   # Update API endpoints
    │   └── health/
    │       └── route.ts   # Health check endpoint
    └── updater-demo/
        └── page.tsx       # Demo page

UPDATER_README.md          # Detailed documentation
.env.example               # Environment template
```

## Configuration Options

### Repository Settings
- Change `repo` in `lib/updater/config.ts`
- Must point to a GitHub repository with releases/tags
- Version in `package.json` should match release tags

### Update Intervals
- Default: 1 hour (3600000 ms)
- Configure in `lib/updater/config.ts`
- Also checks when internet becomes available

### Environment Control
- Auto-updater only runs in production
- Set `ENABLE_UPDATER=true` to enable in development
- Client-side notifications work in all environments

## Usage Examples

### Basic Usage (Automatic)
The updater starts automatically in production. Just configure your repo and deploy!

### Manual Control
```typescript
import { useUpdater } from '@/hooks/useUpdater';

const { checkForUpdates, performUpdate, updateAvailable } = useUpdater();

// Check manually
await checkForUpdates();

// Update manually
if (updateAvailable) {
  await performUpdate();
}
```

### Server-Side Control
```typescript
import { updaterService } from '@/lib';

// Start/stop the service
updaterService.start();
updaterService.stop();
```

## Requirements

- Git repository with proper access
- Node.js and npm
- PM2 (recommended for production)
- GitHub repository with releases/tags
- Internet connectivity

## Troubleshooting

1. **No updates detected**: Check that your `package.json` version matches GitHub release tags
2. **Git errors**: Ensure repository has proper permissions
3. **Build failures**: Check that all dependencies are compatible
4. **PM2 restart fails**: Install PM2 globally or handle restart manually

## Next Steps

1. Configure your repository in `lib/updater/config.ts`
2. Test in development with `/updater-demo`
3. Deploy to production
4. Monitor logs for update activity
5. Customize the notification component as needed

The updater is now ready to use! 🚀