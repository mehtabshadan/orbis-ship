// Update notification component
'use client';

import { useUpdater } from '../hooks/useUpdater';
import { useState } from 'react';

export function UpdateNotification() {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    updateAvailable,
    isChecking,
    isUpdating,
    lastChecked,
    error,
    isOnline,
    localVersion,
    latestVersion,
    releaseInfo,
    checkForUpdates,
    performUpdate,
  } = useUpdater({
    checkOnConnect: true,
    onUpdateAvailable: (info) => {
      console.log('Update available:', info);
    },
    onUpdateStart: () => {
      console.log('Update started');
    },
    onUpdateComplete: (success) => {
      console.log('Update completed:', success);
    },
    onUpdateError: (error) => {
      console.error('Update error:', error);
    },
  });

  if (!updateAvailable && !error && !isChecking) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {error && (
            <div className="text-red-600 text-sm font-medium mb-2">
              Update Error: {error}
            </div>
          )}
          
          {isChecking && (
            <div className="text-blue-600 text-sm font-medium mb-2">
              Checking for updates...
            </div>
          )}
          
          {isUpdating && (
            <div className="text-blue-600 text-sm font-medium mb-2">
              Updating application...
            </div>
          )}
          
          {updateAvailable && !isUpdating && (
            <div>
              <div className="text-green-600 text-sm font-medium mb-2">
                Update Available!
              </div>
              <div className="text-xs text-gray-600 mb-3">
                {localVersion} → {latestVersion}
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {updateAvailable && !isUpdating && (
              <button
                onClick={performUpdate}
                className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Update Now
              </button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500 text-xs hover:text-gray-700 transition-colors"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            
            {!isChecking && !isUpdating && (
              <button
                onClick={checkForUpdates}
                className="text-gray-500 text-xs hover:text-gray-700 transition-colors"
              >
                Check Again
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={() => {/* Close notification */}}
          className="text-gray-400 hover:text-gray-600 text-sm ml-2"
        >
          ×
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <div>Online: {isOnline ? 'Yes' : 'No'}</div>
          <div>Local Version: {localVersion}</div>
          <div>Latest Version: {latestVersion}</div>
          {lastChecked && (
            <div>Last Checked: {lastChecked.toLocaleTimeString()}</div>
          )}
          {releaseInfo && (
            <div className="mt-2">
              <div className="font-medium">Release Notes:</div>
              <div className="text-xs bg-gray-50 p-2 rounded mt-1 max-h-20 overflow-y-auto">
                {releaseInfo.body || 'No release notes available'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}