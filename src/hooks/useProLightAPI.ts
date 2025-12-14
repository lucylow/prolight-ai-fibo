/**
 * useProLightAPI Hook
 * Custom React hook for ProLight AI API interactions
 */

import { useState, useCallback } from 'react';
import { apiClient, APIError } from '@/services/apiClient';
import { toast } from 'sonner';
import type {
  GenerateRequest,
  GenerationResponse,
  PresetListResponse,
  HistoryResponse,
  HistoryItem,
  BatchJobResponse,
  LightingAnalysis,
  LightingPreset,
} from '@/types/fibo';

interface UseProLightAPIState<T = unknown> {
  loading: boolean;
  error: APIError | null;
  data: T | null;
}

const handleError = (error: unknown, defaultMessage: string): APIError => {
  if (error instanceof APIError) {
    toast.error(error.getUserMessage());
    return error;
  }
  
  const apiError = new APIError(
    error instanceof Error ? error.message : defaultMessage,
    'UNKNOWN_ERROR',
    0
  );
  toast.error(apiError.getUserMessage());
  return apiError;
};

export function useGenerateImage() {
  const [state, setState] = useState<UseProLightAPIState<GenerationResponse>>({
    loading: false,
    error: null,
    data: null,
  });

  const generate = useCallback(async (request: GenerateRequest) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.generate(request);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Failed to generate image');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, generate };
}

export function usePresets() {
  const [state, setState] = useState<UseProLightAPIState<PresetListResponse>>({
    loading: false,
    error: null,
    data: null,
  });

  const listPresets = useCallback(
    async (category?: string, page: number = 1, pageSize: number = 10) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.listPresets(category, page, pageSize);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  const getPreset = useCallback(async (presetId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.getPreset(presetId);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const searchPresets = useCallback(
    async (query: string, page: number = 1, pageSize: number = 10) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.searchPresets(query, page, pageSize);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  return { ...state, listPresets, getPreset, searchPresets };
}

export function useHistory() {
  const [state, setState] = useState<UseProLightAPIState<HistoryResponse>>({
    loading: false,
    error: null,
    data: null,
  });

  const getHistory = useCallback(
    async (page: number = 1, pageSize: number = 10, presetFilter?: string) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.getHistory(page, pageSize, presetFilter);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  const getGenerationDetail = useCallback(async (generationId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.getGenerationDetail(generationId);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const deleteGeneration = useCallback(async (generationId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.deleteGeneration(generationId);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const getStats = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.getHistoryStats();
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, getHistory, getGenerationDetail, deleteGeneration, getStats };
}

interface BatchItem {
  scene_description: string;
  lighting_setup?: Record<string, unknown>;
  [key: string]: unknown;
}

export function useBatchGeneration() {
  const [state, setState] = useState<UseProLightAPIState<BatchJobResponse>>({
    loading: false,
    error: null,
    data: null,
  });

  const batchGenerate = useCallback(
    async (items: BatchItem[], presetName?: string, totalCount?: number) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.batchGenerate(items, presetName, totalCount);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  const getBatchStatus = useCallback(async (batchId: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.getBatchStatus(batchId);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const generateProductVariations = useCallback(
    async (
      productDescription: string,
      numAngles: number = 4,
      numLightingSetups: number = 3,
      presetId?: string
    ) => {
      setState({ loading: true, error: null, data: null });
      try {
      const result = await apiClient.generateProductVariations(
        productDescription,
        numAngles,
        numLightingSetups,
        presetId
      );
      setState({ loading: false, error: null, data: result });
      return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  return { ...state, batchGenerate, getBatchStatus, generateProductVariations };
}

export function useLightingAnalysis() {
  const [state, setState] = useState<UseProLightAPIState<LightingAnalysis>>({
    loading: false,
    error: null,
    data: null,
  });

  const analyzeLighting = useCallback(async (lightingSetup: Record<string, unknown>) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.analyzeLighting(lightingSetup);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Operation failed');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const compareLightingSetups = useCallback(
    async (setup1: Record<string, unknown>, setup2: Record<string, unknown>) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.compareLightingSetups(setup1, setup2);
        setState({ loading: false, error: null, data: result as LightingAnalysis });
        return result;
      } catch (error) {
        const err = handleError(error, 'Failed to fetch presets');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  const getStyleRecommendations = useCallback(async (lightingStyle: string) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.getStyleRecommendations(lightingStyle);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = handleError(error, 'Failed to get style recommendations');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, analyzeLighting, compareLightingSetups, getStyleRecommendations };
}
