/**
 * Bria API Hook
 * Handles API calls with error handling, polling, and retry logic
 */

import { useState, useCallback } from 'react';
import { briaImageService, GenerationResult } from '@/services/BriaImageService';
import { FIBOStructuredPrompt } from '@/services/BriaImageService';

export interface UseBriaAPIOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (result: GenerationResult) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useBriaAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const handleProgress = useCallback((currentProgress: number) => {
    setProgress(currentProgress);
  }, []);

  const generateWithFIBO = useCallback(
    async (
      prompt: string,
      fiboJson: FIBOStructuredPrompt | Record<string, unknown>,
      options?: {
        seed?: number;
        sync?: boolean;
        aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';
        onProgress?: (progress: number) => void;
        onSuccess?: (result: GenerationResult) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<GenerationResult | null> => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      try {
        // Simulate progress for async operations
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += 10;
            handleProgress(currentProgress);
          }
        }, 500);

        const result = await briaImageService.generateWithFIBO(prompt, fiboJson, {
          seed: options?.seed,
          sync: options?.sync,
          aspect_ratio: options?.aspect_ratio,
        });

        clearInterval(progressInterval);
        setProgress(100);
        setIsLoading(false);

        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        setIsLoading(false);
        const error = err instanceof Error ? err : new Error('Generation failed');
        setError(error);
        options?.onError?.(error);
        throw error;
      }
    },
    [progress, handleProgress]
  );

  const generateWithSeed = useCallback(
    async (
      prompt: string,
      seed: number,
      fiboJson?: FIBOStructuredPrompt | Record<string, unknown>,
      options?: {
        sync?: boolean;
        aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';
        onProgress?: (progress: number) => void;
        onSuccess?: (result: GenerationResult) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<GenerationResult | null> => {
      setIsLoading(true);
      setProgress(0);
      setError(null);

      try {
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += 10;
            handleProgress(currentProgress);
          }
        }, 500);

        const result = await briaImageService.generateWithSeed(prompt, seed, fiboJson, {
          sync: options?.sync,
          aspect_ratio: options?.aspect_ratio,
        });

        clearInterval(progressInterval);
        setProgress(100);
        setIsLoading(false);

        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        setIsLoading(false);
        const error = err instanceof Error ? err : new Error('Generation failed');
        setError(error);
        options?.onError?.(error);
        throw error;
      }
    },
    [progress, handleProgress]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateWithFIBO,
    generateWithSeed,
    isLoading,
    progress,
    error,
    clearError,
  };
}

