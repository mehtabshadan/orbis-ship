// Hook for managing application updates
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnline } from './useOnline';

interface UpdateInfo {
  updateAvailable: boolean;
  localVersion: string | null;
  latestVersion: string | null;
  releaseInfo?: {
    tag_name: string;
    name: string;
    published_at: string;
    body: string;
  };
}

interface UseUpdaterOptions {
  checkInterval?: number; // in milliseconds, default 1 hour
  checkOnConnect?: boolean; // check when internet becomes available
  autoUpdate?: boolean; // automatically apply updates
  onUpdateAvailable?: (info: UpdateInfo) => void;
  onUpdateStart?: () => void;
  onUpdateComplete?: (success: boolean) => void;
  onUpdateError?: (error: Error) => void;
}

export function useUpdater(options: UseUpdaterOptions = {}) {
  const {
    checkInterval = 60 * 60 * 1000, // 1 hour
    checkOnConnect = true,
    autoUpdate = false,
    onUpdateAvailable,
    onUpdateStart,
    onUpdateComplete,
    onUpdateError,
  } = options;

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle internet connectivity
  const { isOnline } = useOnline({
    onOnline: () => {
      if (checkOnConnect) {
        checkForUpdates();
      }
    },
  });

  const checkForUpdates = useCallback(async (signal?: AbortSignal) => {
    if (isChecking) return;
    
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/updater', {
        signal,
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`Failed to check for updates: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const info = result.data as UpdateInfo;
        setUpdateInfo(info);
        setLastChecked(new Date());

        if (info.updateAvailable) {
          onUpdateAvailable?.(info);
          
          // Note: We'll call performUpdate separately to avoid circular dependency
        }
      } else {
        throw new Error(result.message || 'Failed to check for updates');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onUpdateError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, onUpdateAvailable, onUpdateError]);

  const performUpdate = useCallback(async () => {
    if (isUpdating) return false;
    
    setIsUpdating(true);
    setError(null);
    onUpdateStart?.();

    try {
      const response = await fetch('/api/updater', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update' }),
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        onUpdateComplete?.(true);
        // Refresh update info after successful update
        await checkForUpdates();
        return true;
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onUpdateError?.(error instanceof Error ? error : new Error(errorMessage));
      onUpdateComplete?.(false);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, onUpdateStart, onUpdateComplete, onUpdateError, checkForUpdates]);

  const startAutoCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check immediately
    checkForUpdates();

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (isOnline) {
        checkForUpdates();
      }
    }, checkInterval);
  }, [checkForUpdates, checkInterval, isOnline]);

  const stopAutoCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Start auto-checking when component mounts
  useEffect(() => {
    startAutoCheck();
    
    return () => {
      stopAutoCheck();
    };
  }, [startAutoCheck, stopAutoCheck]);

  // Update abort controller for ongoing requests
  useEffect(() => {
    if (isChecking) {
      abortControllerRef.current = new AbortController();
    }
  }, [isChecking]);

  // Handle auto-update when updates are available
  useEffect(() => {
    if (autoUpdate && updateInfo?.updateAvailable && !isUpdating) {
      performUpdate();
    }
  }, [autoUpdate, updateInfo?.updateAvailable, isUpdating, performUpdate]);

  return {
    // State
    updateInfo,
    isChecking,
    isUpdating,
    lastChecked,
    error,
    isOnline,
    
    // Actions
    checkForUpdates: () => checkForUpdates(),
    performUpdate,
    startAutoCheck,
    stopAutoCheck,
    
    // Computed values
    updateAvailable: updateInfo?.updateAvailable ?? false,
    localVersion: updateInfo?.localVersion,
    latestVersion: updateInfo?.latestVersion,
    releaseInfo: updateInfo?.releaseInfo,
  };
}