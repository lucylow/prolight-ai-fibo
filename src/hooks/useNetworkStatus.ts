/**
 * Hook to monitor network status and handle offline/online states
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineTime: Date | null;
  lastOfflineTime: Date | null;
}

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      isOnline,
      wasOffline: false,
      lastOnlineTime: isOnline ? new Date() : null,
      lastOfflineTime: isOnline ? null : new Date(),
    };
  });

  const handleOnline = useCallback(() => {
    const now = new Date();
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline,
      lastOnlineTime: now,
      lastOfflineTime: prev.lastOfflineTime,
    }));

    // Show toast if we were offline
    if (!status.isOnline) {
      toast.success('Connection restored', {
        description: 'You are back online.',
        duration: 3000,
      });
    }
  }, [status.isOnline]);

  const handleOffline = useCallback(() => {
    const now = new Date();
    setStatus((prev) => ({
      isOnline: false,
      wasOffline: prev.wasOffline || prev.isOnline,
      lastOnlineTime: prev.lastOnlineTime,
      lastOfflineTime: now,
    }));

    toast.error('Connection lost', {
      description: 'You are offline. Some features may not work.',
      duration: 5000,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}

/**
 * Hook to check if online before performing actions
 */
export function useOnlineGuard() {
  const { isOnline } = useNetworkStatus();

  const guard = useCallback(
    <T,>(fn: () => T, offlineMessage = 'You are offline. Please check your connection.'): T | null => {
      if (!isOnline) {
        toast.error(offlineMessage);
        return null;
      }
      return fn();
    },
    [isOnline]
  );

  return { isOnline, guard };
}

