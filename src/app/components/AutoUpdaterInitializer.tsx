'use client';

import { useEffect } from 'react';

export default function AutoUpdaterInitializer() {
  useEffect(() => {
    // Initialize the auto-updater by making a GET request to the API
    // This will trigger the auto-start functionality when the app loads
    const initializeUpdater = async () => {
      try {
        console.log('[app] Initializing auto-updater...');
        const response = await fetch('/api/updater', {
          method: 'GET',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[app] Auto-updater initialized:', data.data.message);
        } else {
          console.warn('[app] Failed to initialize auto-updater:', response.status);
        }
      } catch (error) {
        console.error('[app] Error initializing auto-updater:', error);
      }
    };

    // Initialize with a small delay to ensure the app is fully loaded
    const timer = setTimeout(initializeUpdater, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything visible
  return null;
}