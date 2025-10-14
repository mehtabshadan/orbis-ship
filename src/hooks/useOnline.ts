// Hook for detecting internet connectivity
'use client';

import { useState, useEffect } from 'react';

interface UseOnlineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useOnline(options: UseOnlineOptions = {}) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        options.onOnline?.();
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      options.onOffline?.();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Additional network check using fetch
    const checkNetworkConnectivity = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        const isConnected = response.ok;
        
        if (isConnected && !isOnline && wasOffline) {
          handleOnline();
        } else if (!isConnected && isOnline) {
          handleOffline();
        }
      } catch {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    // Check connectivity every 30 seconds
    const connectivityInterval = setInterval(checkNetworkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [isOnline, wasOffline, options]);

  return {
    isOnline,
    wasOffline,
  };
}