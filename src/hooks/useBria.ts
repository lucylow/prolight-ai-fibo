import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  briaClient,
  type TextToImageRequest,
  type TailoredGenerationRequest,
  type AdsGenerationRequest,
  type ImageEditRequest,
  type ProductShotRequest,
  type VideoEditRequest,
  type BriaError,
} from '@/services/briaClient';

export const useBria = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<BriaError | null>(null);

  const handleError = useCallback((err: unknown) => {
    const briaError = err as BriaError;
    setError(briaError);
    toast.error(briaError.error || 'An error occurred');
    return briaError;
  }, []);

  const textToImage = useCallback(async (request: TextToImageRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.textToImage(request);
      toast.success('Image generation started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const onboardImage = useCallback(async (imageUrl: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.onboardImage(imageUrl);
      toast.success('Image onboarded successfully!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const editImage = useCallback(async (request: ImageEditRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.editImage(request);
      toast.success('Image edit started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const productShotEdit = useCallback(async (request: ProductShotRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.productShotEdit(request);
      toast.success('Product shot edit started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const tailoredGeneration = useCallback(async (request: TailoredGenerationRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.tailoredGeneration(request);
      toast.success('Tailored generation started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const generateAds = useCallback(async (request: AdsGenerationRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.generateAds(request);
      toast.success('Ads generation started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const editVideo = useCallback(async (request: VideoEditRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.editVideo(request);
      toast.success('Video edit started!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const getStatus = useCallback(async (requestId: string) => {
    try {
      return await briaClient.getStatus(requestId);
    } catch (err) {
      throw handleError(err);
    }
  }, [handleError]);

  const pollStatus = useCallback(async (
    requestId: string,
    pollInterval?: number,
    maxWait?: number
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await briaClient.pollStatus(requestId, pollInterval, maxWait);
      toast.success('Job completed!');
      return result;
    } catch (err) {
      throw handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    isLoading,
    error,
    textToImage,
    onboardImage,
    editImage,
    productShotEdit,
    tailoredGeneration,
    generateAds,
    editVideo,
    getStatus,
    pollStatus,
  };
};
