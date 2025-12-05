import { useState } from 'react';
import { useLightingStore } from '../stores/lightingStore';

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLoading, setGenerationResult, lightingSetup, cameraSettings, sceneSettings, getLightingAnalysis } = useLightingStore();

  const generateFromCurrentSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      // Simulate generation with a demo image
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        image_url: `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop`,
        lightingAnalysis: getLightingAnalysis(),
        timestamp: new Date().toISOString(),
      };
      
      setGenerationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const generateFromNaturalLanguage = async (sceneDescription: string, lightingDescription: string) => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        image_url: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop`,
        lightingAnalysis: getLightingAnalysis(),
        timestamp: new Date().toISOString(),
      };
      
      setGenerationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  return {
    isGenerating,
    error,
    generateFromCurrentSetup,
    generateFromNaturalLanguage,
  };
};
