// Example page showing updater usage
'use client';

import { useUpdater } from '../../hooks/useUpdater';
import { useOnline } from '../../hooks/useOnline';

export default function UpdaterExamplePage() {
  const { isOnline, wasOffline } = useOnline();
  
  const {
    updateAvailable,
    isChecking,
    isUpdating,
    lastChecked,
    error,
    localVersion,
    latestVersion,
    releaseInfo,
    checkForUpdates,
    performUpdate,
  } = useUpdater({
    checkOnConnect: true,
    onUpdateAvailable: (info: any) => {
      console.log('🔔 Update available:', info);
    },
    onUpdateStart: () => {
      console.log('🚀 Update started');
    },
    onUpdateComplete: (success: boolean) => {
      console.log(success ? '✅ Update completed' : '❌ Update failed');
    },
    onUpdateError: (error: Error) => {
      console.error('💥 Update error:', error);
    },
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Auto-Updater Demo</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        {wasOffline && isOnline && (
          <div className="text-sm text-gray-600 mt-1">
            Connection restored - checking for updates...
          </div>
        )}
      </div>

      {/* Update Status */}
      <div className="mb-6 p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-3">Update Status</h2>
        
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Local Version:</span> {localVersion || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Latest Version:</span> {latestVersion || 'Unknown'}
          </div>
          {lastChecked && (
            <div>
              <span className="font-medium">Last Checked:</span> {lastChecked.toLocaleString()}
            </div>
          )}
        </div>

        {updateAvailable && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-blue-800 font-medium">Update Available!</div>
            <div className="text-blue-600 text-sm">
              Version {latestVersion} is ready to install
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        
        <div className="space-x-3">
          <button
            onClick={checkForUpdates}
            disabled={isChecking || !isOnline}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </button>
          
          {updateAvailable && (
            <button
              onClick={performUpdate}
              disabled={isUpdating || !isOnline}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
          )}
        </div>
      </div>

      {/* Release Information */}
      {releaseInfo && (
        <div className="mb-6 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Release Information</h2>
          
          <div className="space-y-2">
            <div>
              <span className="font-medium">Release:</span> {releaseInfo.name}
            </div>
            <div>
              <span className="font-medium">Tag:</span> {releaseInfo.tag_name}
            </div>
            <div>
              <span className="font-medium">Published:</span>{' '}
              {new Date(releaseInfo.published_at).toLocaleString()}
            </div>
            
            {releaseInfo.body && (
              <div>
                <span className="font-medium">Release Notes:</span>
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                  {releaseInfo.body}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 rounded-lg border bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">How it Works</h2>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Automatically checks for updates every hour</li>
          <li>Checks for updates when internet connection is restored</li>
          <li>Compares your package.json version with GitHub releases</li>
          <li>Can manually trigger updates</li>
          <li>Shows real-time status and progress</li>
        </ul>
      </div>
    </div>
  );
}