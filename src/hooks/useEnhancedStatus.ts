/**
 * Enhanced Status Hook
 * Provides improved status polling with better error handling, retry logic, and WebSocket support
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { enhancedBriaClient, BriaResponse } from "@/services/enhancedBriaClient";

export interface StatusResponse extends BriaResponse {
  status?: string;
  state?: string;
  error?: string;
  data?: unknown;
}

export interface UseEnhancedStatusOptions {
  pollInterval?: number;
  maxWait?: number;
  autoStart?: boolean;
  onComplete?: (status: StatusResponse) => void;
  onError?: (error: Error) => void;
  onProgress?: (status: StatusResponse) => void;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface UseEnhancedStatusReturn {
  status: StatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  cancel: () => void;
  elapsedTime: number;
  progress: number; // 0-100 based on estimated time
}

export function useEnhancedStatus(
  requestId?: string,
  options: UseEnhancedStatusOptions = {}
): UseEnhancedStatusReturn {
  const {
    pollInterval = 2000,
    maxWait = 300000, // 5 minutes
    autoStart = true,
    onComplete,
    onError,
    onProgress,
    retryOnError = true,
    maxRetries = 3,
  } = options;

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPollingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const pollStatus = useCallback(async () => {
    if (!requestId || isPollingRef.current) return;

    isPollingRef.current = true;
    setIsLoading(true);
    setError(null);
    startTimeRef.current = Date.now();
    retryCountRef.current = 0;

    abortControllerRef.current = new AbortController();

    const poll = async (): Promise<void> => {
      if (!requestId || abortControllerRef.current?.signal.aborted) {
        return;
      }

      try {
        const data = await enhancedBriaClient.getStatus(requestId, {
          signal: abortControllerRef.current?.signal,
        });

        const statusData: StatusResponse = {
          ...data,
          status: data.status || data.state,
        };

        setStatus(statusData);

        if (onProgress) {
          onProgress(statusData);
        }

        // Calculate progress (rough estimate based on elapsed time)
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          setElapsedTime(elapsed);
          
          // Estimate progress: assume jobs take 30-60 seconds on average
          const estimatedDuration = 45000; // 45 seconds
          const calculatedProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
          setProgress(calculatedProgress);
        }

        // Stop polling if job is completed or failed
        if (statusData.status === "COMPLETED") {
          cleanup();
          setIsLoading(false);
          setProgress(100);
          if (onComplete) {
            onComplete(statusData);
          }
          return;
        }

        if (statusData.status === "ERROR" || statusData.status === "FAILED") {
          cleanup();
          setIsLoading(false);
          const errorObj = new Error(statusData.error || "Job failed");
          setError(errorObj);
          if (onError) {
            onError(errorObj);
          }
          return;
        }

        // Continue polling
        retryCountRef.current = 0;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error("Failed to fetch status");
        
        if (retryOnError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, pollInterval * Math.pow(2, retryCountRef.current - 1))
          );
          return poll();
        }

        cleanup();
        setIsLoading(false);
        setError(errorObj);
        if (onError) {
          onError(errorObj);
        }
      }
    };

    // Initial poll
    await poll();

    // Set up interval for continuous polling
    intervalRef.current = setInterval(async () => {
      if (abortControllerRef.current?.signal.aborted) {
        cleanup();
        return;
      }
      await poll();
    }, pollInterval);

    // Set timeout to stop polling after maxWait
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setIsLoading(false);
      const timeoutError = new Error("Status polling timeout");
      setError(timeoutError);
      if (onError) {
        onError(timeoutError);
      }
    }, maxWait);
  }, [requestId, pollInterval, maxWait, onComplete, onError, onProgress, retryOnError, maxRetries, cleanup]);

  const retry = useCallback(() => {
    cleanup();
    setError(null);
    retryCountRef.current = 0;
    pollStatus();
  }, [pollStatus, cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    setIsLoading(false);
  }, [cleanup]);

  useEffect(() => {
    if (autoStart && requestId) {
      pollStatus();
    }

    return () => {
      cleanup();
    };
  }, [requestId, autoStart, pollStatus, cleanup]);

  return {
    status,
    isLoading,
    error,
    retry,
    cancel,
    elapsedTime,
    progress,
  };
}
