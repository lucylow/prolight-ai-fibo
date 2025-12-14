/**
 * React Hook for Bria Status Tracking
 * 
 * Provides a React hook for managing Bria async request status:
 * - Get current status
 * - Start background polling
 * - Subscribe to real-time updates via SSE
 * 
 * Usage:
 * ```tsx
 * const { status, isLoading, error, getStatus, startPoll, subscribe } = useBriaStatus();
 * 
 * // Get status
 * await getStatus('request_id_123');
 * 
 * // Start polling
 * await startPoll('request_id_123', 'image_generation');
 * 
 * // Subscribe to updates
 * const unsubscribe = subscribe('request_id_123', {
 *   onUpdate: (status) => console.log('Status:', status),
 *   onError: (error) => console.error('Error:', error),
 *   onComplete: () => console.log('Completed'),
 * });
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  briaStatusService,
  type BriaStatusResponse,
  type StartPollResponse,
} from '../services/briaStatusService';

export interface UseBriaStatusOptions {
  autoPoll?: boolean;
  autoSubscribe?: boolean;
  pollInterval?: number;
}

export interface UseBriaStatusReturn {
  status: BriaStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  getStatus: (requestId: string) => Promise<BriaStatusResponse>;
  startPoll: (requestId: string, endpointType?: string) => Promise<StartPollResponse>;
  subscribe: (
    requestId: string,
    callbacks: {
      onUpdate?: (status: BriaStatusResponse) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    }
  ) => () => void;
  reset: () => void;
}

export function useBriaStatus(
  options: UseBriaStatusOptions = {}
): UseBriaStatusReturn {
  const [status, setStatus] = useState<BriaStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const getStatus = useCallback(async (requestId: string): Promise<BriaStatusResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const statusResponse = await briaStatusService.getStatus(requestId);
      setStatus(statusResponse);
      return statusResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startPoll = useCallback(
    async (requestId: string, endpointType?: string): Promise<StartPollResponse> => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await briaStatusService.startPoll(requestId, endpointType);
        
        // If polling started, optionally set up auto-refresh
        if (response.started && options.pollInterval) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          
          pollIntervalRef.current = setInterval(async () => {
            try {
              const currentStatus = await briaStatusService.getStatus(requestId);
              setStatus(currentStatus);
              
              // Stop polling if terminal
              if (['COMPLETED', 'ERROR', 'UNKNOWN'].includes(currentStatus.status)) {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
              }
            } catch (err) {
              console.error('Poll interval error:', err);
            }
          }, options.pollInterval);
        }
        
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options.pollInterval]
  );

  const subscribe = useCallback(
    (
      requestId: string,
      callbacks: {
        onUpdate?: (status: BriaStatusResponse) => void;
        onError?: (error: Error) => void;
        onComplete?: () => void;
      }
    ): (() => void) => {
      // Cleanup existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      // Set up new subscription
      const unsubscribe = briaStatusService.subscribe(requestId, {
        onUpdate: (statusUpdate) => {
          setStatus(statusUpdate);
          callbacks.onUpdate?.(statusUpdate);
        },
        onError: (err) => {
          setError(err);
          callbacks.onError?.(err);
        },
        onComplete: () => {
          setIsLoading(false);
          callbacks.onComplete?.();
        },
      });

      unsubscribeRef.current = unsubscribe;
      setIsLoading(true);

      return unsubscribe;
    },
    []
  );

  const reset = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setStatus(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    status,
    isLoading,
    error,
    getStatus,
    startPoll,
    subscribe,
    reset,
  };
}

/**
 * Simplified hook for tracking a single request_id
 */
export function useBriaStatusForRequest(
  requestId: string | null,
  options: UseBriaStatusOptions = {}
): UseBriaStatusReturn {
  const hook = useBriaStatus(options);

  useEffect(() => {
    if (!requestId) {
      hook.reset();
      return;
    }

    // Auto-fetch status
    hook.getStatus(requestId).catch(console.error);

    // Auto-start polling if enabled
    if (options.autoPoll) {
      hook.startPoll(requestId).catch(console.error);
    }

    // Auto-subscribe if enabled
    if (options.autoSubscribe) {
      const unsubscribe = hook.subscribe(requestId, {
        onUpdate: (status) => {
          console.log('Status update:', status);
        },
        onError: (error) => {
          console.error('Status error:', error);
        },
        onComplete: () => {
          console.log('Status completed');
        },
      });

      return () => {
        unsubscribe();
      };
    }
  }, [requestId, options.autoPoll, options.autoSubscribe]);

  return hook;
}
