/**
 * React hook for BRIA Image Editing API v2
 * Provides easy access to all image editing operations via edge functions
 */

import { useState, useCallback } from 'react';
import { briaClient } from '@/services/briaClient';
import type {
  EraseParams,
  GenFillParams,
  RemoveBackgroundParams,
  ReplaceBackgroundParams,
  ExpandParams,
  EnhanceParams,
  BlurBackgroundParams,
  EraseForegroundParams,
  CropForegroundParams,
  IncreaseResolutionParams,
  MaskGeneratorParams,
  BriaImageEditingResponse,
} from '@/services/briaImageEditingService';

export function useBriaImageEditing() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeOperation = useCallback(
    async (operation: string, params: Record<string, unknown>) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await briaClient.editImageV2({
          operation,
          ...params,
        });

        // Handle async responses - poll for status if needed
        if (response.status === 'IN_PROGRESS' && response.request_id) {
          const finalResponse = await briaClient.pollStatus(response.request_id);
          return {
            result: {
              image_url: (finalResponse.data as { image_url?: string })?.image_url || '',
            },
            request_id: response.request_id,
          } as BriaImageEditingResponse;
        }

        return {
          result: (response.data as { result?: { image_url?: string } })?.result || {
            image_url: (response.data as { image_url?: string })?.image_url || '',
          },
          request_id: response.request_id || '',
        } as BriaImageEditingResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const erase = useCallback(
    async (params: EraseParams) => {
      return executeOperation('erase', params);
    },
    [executeOperation]
  );

  const generativeFill = useCallback(
    async (params: GenFillParams) => {
      return executeOperation('gen_fill', params);
    },
    [executeOperation]
  );

  const removeBackground = useCallback(
    async (params: RemoveBackgroundParams) => {
      return executeOperation('remove_background', params);
    },
    [executeOperation]
  );

  const replaceBackground = useCallback(
    async (params: ReplaceBackgroundParams) => {
      return executeOperation('replace_background', params);
    },
    [executeOperation]
  );

  const expand = useCallback(
    async (params: ExpandParams) => {
      return executeOperation('expand', params);
    },
    [executeOperation]
  );

  const enhance = useCallback(
    async (params: EnhanceParams) => {
      return executeOperation('enhance', params);
    },
    [executeOperation]
  );

  const blurBackground = useCallback(
    async (params: BlurBackgroundParams) => {
      return executeOperation('blur_background', params);
    },
    [executeOperation]
  );

  const eraseForeground = useCallback(
    async (params: EraseForegroundParams) => {
      return executeOperation('erase_foreground', params);
    },
    [executeOperation]
  );

  const cropForeground = useCallback(
    async (params: CropForegroundParams) => {
      return executeOperation('crop_foreground', params);
    },
    [executeOperation]
  );

  const increaseResolution = useCallback(
    async (params: IncreaseResolutionParams) => {
      return executeOperation('increase_resolution', params);
    },
    [executeOperation]
  );

  const generateMasks = useCallback(
    async (params: MaskGeneratorParams) => {
      return executeOperation('generate_masks', params);
    },
    [executeOperation]
  );

  const completeLightingEnhancement = useCallback(
    async (
      imageUrl: string,
      options?: {
        removeBackground?: boolean;
        replaceBackground?: boolean;
        enhance?: boolean;
        expandCanvas?: boolean;
        backgroundPrompt?: string;
        expandAspectRatio?: string | number;
      }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        let currentImageUrl = imageUrl;
        const workflow: string[] = [];
        const timing: Record<string, number> = {};

        // Step 1: Remove background
        if (options?.removeBackground !== false) {
          const start = Date.now();
          const bgResponse = await removeBackground({ image: currentImageUrl, sync: true });
          currentImageUrl = bgResponse.result?.image_url || currentImageUrl;
          workflow.push('background_removed');
          timing.backgroundRemoval = Date.now() - start;
        }

        // Step 2: Replace background
        if (options?.replaceBackground !== false && options?.backgroundPrompt) {
          const start = Date.now();
          const bgReplaceResponse = await replaceBackground({
            image: currentImageUrl,
            prompt: options.backgroundPrompt,
            mode: 'high_control',
            sync: true,
          });
          currentImageUrl = bgReplaceResponse.result?.image_url || currentImageUrl;
          workflow.push('background_replaced');
          timing.backgroundReplacement = Date.now() - start;
        }

        // Step 3: Expand canvas
        if (options?.expandCanvas !== false) {
          const start = Date.now();
          const expandResponse = await expand({
            image: currentImageUrl,
            prompt: 'Professional studio background with neutral lighting',
            aspectRatio: options.expandAspectRatio || '16:9',
            sync: true,
          });
          currentImageUrl = expandResponse.result?.image_url || currentImageUrl;
          workflow.push('canvas_expanded');
          timing.canvasExpansion = Date.now() - start;
        }

        // Step 4: Enhance
        if (options?.enhance !== false) {
          const start = Date.now();
          const enhanceResponse = await enhance({
            image: currentImageUrl,
            resolution: '2MP',
            sync: true,
          });
          currentImageUrl = enhanceResponse.result?.image_url || currentImageUrl;
          workflow.push('quality_enhanced');
          timing.qualityEnhancement = Date.now() - start;
        }

        return {
          originalImageUrl: imageUrl,
          finalUrl: currentImageUrl,
          workflow,
          timing,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [removeBackground, replaceBackground, expand, enhance]
  );

  return {
    // Operations
    erase,
    generativeFill,
    removeBackground,
    replaceBackground,
    expand,
    enhance,
    blurBackground,
    eraseForeground,
    cropForeground,
    increaseResolution,
    generateMasks,
    completeLightingEnhancement,
    // State
    isLoading,
    error,
  };
}
