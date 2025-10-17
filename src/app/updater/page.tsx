'use client';

import { useState, useEffect, useCallback } from 'react';

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

export default function UpdaterPage() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/updater');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setMessage(data.data.message);
        
        // Show popup if update is available
        if (data.data.updateAvailable && !showUpdatePopup) {
          setShowUpdatePopup(true);
        }
      }
    } catch (error) {
      console.error('Failed to load status:', error);
      setMessage('Failed to load updater status');
    }
  }, [showUpdatePopup]);

  const checkForUpdatesBackground = useCallback(async () => {
    try {
      const response = await fetch('/api/updater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.updateInfo) {
        const updateInfo = data.data.updateInfo as UpdateInfo;
        
        // Show popup if update becomes available
        if (updateInfo.updateAvailable && !showUpdatePopup) {
          setShowUpdatePopup(true);
        }
        
        // Update status to reflect latest check
        setStatus(prev => prev ? {
          ...prev,
          lastCheck: updateInfo.lastCheck,
          updateAvailable: updateInfo.updateAvailable,
          latestVersion: updateInfo.latestVersion,
          releaseName: updateInfo.releaseName
        } : null);
      }
    } catch (error) {
      console.error('Background update check failed:', error);
    }
  }, [showUpdatePopup]);

  // Check for updates in the background every 5 minutes
  useEffect(() => {
    loadStatus();
    
    const interval = setInterval(() => {
      if (status?.isRunning) {
        checkForUpdatesBackground();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [status?.isRunning, loadStatus, checkForUpdatesBackground]);

  const performAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/updater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.data.message);
        
        if (action === 'update') {
          setMessage('Update initiated - Application will restart in a few seconds...');
          setShowUpdatePopup(false);
        } else {
          await loadStatus();
        }
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setMessage(`Failed to ${action} updater`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNow = () => {
    setShowUpdatePopup(false);
    performAction('update');
  };

  const handleUpdateLater = () => {
    setShowUpdatePopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Update Available Popup */}
        {showUpdatePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Update Available</h3>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  A new version of Orbis Ship is available:
                </p>
                <div className="text-sm bg-gray-100 p-3 rounded mt-2">
                  <div className="font-mono">
                    <strong>Current:</strong> v{status?.localVersion}<br/>
                    <strong>Available:</strong> v{status?.latestVersion}
                  </div>
                  {status?.releaseName && (
                    <div className="text-xs text-gray-600 mt-2">
                      <strong>Release:</strong> {status.releaseName}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The application will close briefly during the update process and restart automatically.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleUpdateLater}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Later
                </button>
                <button
                  onClick={handleUpdateNow}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Auto-Updater</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage automatic updates for the Orbis Ship application
            </p>
          </div>

          <div className="p-6">
            {/* Status Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current Status</h2>
              
              {status && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 flex items-center">
                        <div className={`h-3 w-3 rounded-full mr-2 ${status.isRunning ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm text-gray-900">
                          {status.isRunning ? 'Running (Hourly Checks)' : 'Stopped'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Local Version</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">v{status.localVersion || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Latest Version</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {status.latestVersion ? `v${status.latestVersion}` : 'Checking...'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Repository</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{status.repository}</p>
                    </div>
                    
                    {status.releaseName && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Latest Release</label>
                        <p className="mt-1 text-sm text-gray-900">{status.releaseName}</p>
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Last Check</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {status.lastCheck ? new Date(status.lastCheck).toLocaleString() : 'Never'}
                      </p>
                    </div>

                    {status.updateAvailable && (
                      <div className="md:col-span-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">Update Available</h3>
                              <p className="mt-1 text-sm text-blue-700">
                                Version {status.latestVersion} is available for download.
                              </p>
                              {status.releaseName && (
                                <p className="mt-1 text-xs text-blue-600">
                                  {status.releaseName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controls Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Controls</h2>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => performAction('check')}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Check Now
                </button>

                {status?.updateAvailable && (
                  <button
                    onClick={() => performAction('update')}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Now'}
                  </button>
                )}
              </div>
            </div>

            {/* Message Section */}
            {message && (
              <div className="mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">{message}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Information Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">How It Works</h2>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>The auto-updater starts automatically when the application launches</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>Checks for new releases every hour, but only when internet is available</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>Detects updates by comparing version numbers - any version difference means an update is available</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>When an update is found, a popup will appear asking if you want to update</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>The application will restart automatically after the update is applied</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>All data and settings are preserved during updates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2">•</span>
                    <span>Designed to work offline - no update checks when internet is unavailable</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}