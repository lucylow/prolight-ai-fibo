/**
 * React Hook for Bria Async Generation with Status Polling
 * 
 * Provides a React hook for managing async Bria API jobs with:
 * - Automatic status polling
 * - Progress callbacks
 * - Error handling
 * - Request cancellation
 * 
 * Usage:
 * ```tsx
 * const { generate, status, isLoading, error, cancel } = useBriaAsync();
 * 
 * const handleGenerate = async () => {
 *   await generate({
 *     prompt: "silver lamp",
 *     sync: false
 *   });
 * };
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { BriaClient, type GenerateImageRequest, type StatusResponse } from '../lib/bria-client';

export interface UseBriaAsyncOptions {
  pollInterval?: number;
  maxPollAttempts?: number;
  onProgress?: (status: StatusResponse) => void;
  onComplete?: (result: StatusResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseBriaAsyncReturn {
  generate: (request: GenerateImageRequest) => Promise<StatusResponse | null>;
  status: StatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  cancel: () => void;
  reset: () => void;
}

export function useBriaAsync(
  options: UseBriaAsyncOptions = {}
): UseBriaAsyncReturn {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<BriaClient | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!clientRef.current) {
    clientRef.current = new BriaClient({
      pollInterval: options.pollInterval,
      maxPollAttempts: options.maxPollAttempts,
    });
  }

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setStatus(null);
    setError(null);
    setIsLoading(false);
  }, [cancel]);

  const generate = useCallback(
    async (request: GenerateImageRequest): Promise<StatusResponse | null> => {
      // Reset state
      setError(null);
      setIsLoading(true);
      setStatus(null);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Step 1: Generate image (async)
        const generateResult = await clientRef.current!.generateImage({
          ...request,
          sync: false, // Force async for status polling
        });

        // If sync was requested and we got immediate result, return it
        if (request.sync && generateResult.status === 'COMPLETED') {
          setIsLoading(false);
          return generateResult as unknown as StatusResponse;
        }

        // Step 2: Poll for completion
        if (generateResult.request_id) {
          const finalStatus = await clientRef.current!.pollStatus(
            generateResult.request_id,
            (progressStatus) => {
              setStatus(progressStatus);
              if (options.onProgress) {
                options.onProgress(progressStatus);
              }
            }
          );

          setStatus(finalStatus);
          setIsLoading(false);

          if (options.onComplete) {
            options.onComplete(finalStatus);
          }

          return finalStatus;
        } else {
          // No request_id, assume completed
          setIsLoading(false);
          return generateResult as unknown as StatusResponse;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [options]
  );

  return {
    generate,
    status,
    isLoading,
    error,
    cancel,
    reset,
  };
}
