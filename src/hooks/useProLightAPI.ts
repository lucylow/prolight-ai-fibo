/**
 * useProLightAPI Hook
 * Custom React hook for ProLight AI API interactions
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import type {
  GenerateRequest,
  GenerationResponse,
  PresetListResponse,
  HistoryResponse,
  LightingAnalysis,
} from '@/types/fibo';

interface UseProLightAPIState {
  loading: boolean;
  error: Error | null;
  data: any;
}

export function useGenerateImage() {
  const [state, setState] = useState<UseProLightAPIState>({
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
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, generate };
}

export function usePresets() {
  const [state, setState] = useState<UseProLightAPIState>({
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
        const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
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
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  return { ...state, listPresets, getPreset, searchPresets };
}

export function useHistory() {
  const [state, setState] = useState<UseProLightAPIState>({
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
        const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, getHistory, getGenerationDetail, deleteGeneration, getStats };
}

export function useBatchGeneration() {
  const [state, setState] = useState<UseProLightAPIState>({
    loading: false,
    error: null,
    data: null,
  });

  const batchGenerate = useCallback(
    async (items: any[], presetName?: string, totalCount?: number) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.batchGenerate(items, presetName, totalCount);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
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
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ loading: false, error: err, data: null });
        throw err;
      }
    },
    []
  );

  return { ...state, batchGenerate, getBatchStatus, generateProductVariations };
}

export function useLightingAnalysis() {
  const [state, setState] = useState<UseProLightAPIState>({
    loading: false,
    error: null,
    data: null,
  });

  const analyzeLighting = useCallback(async (lightingSetup: Record<string, any>) => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await apiClient.analyzeLighting(lightingSetup);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  const compareLightingSetups = useCallback(
    async (setup1: Record<string, any>, setup2: Record<string, any>) => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await apiClient.compareLightingSetups(setup1, setup2);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
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
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ loading: false, error: err, data: null });
      throw err;
    }
  }, []);

  return { ...state, analyzeLighting, compareLightingSetups, getStyleRecommendations };
}
