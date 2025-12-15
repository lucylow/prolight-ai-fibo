import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLoading, setGenerationResult, lightingSetup, cameraSettings, sceneSettings } = useLightingStore();

  const generateFromCurrentSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      const sceneRequest = {
        subjectDescription: sceneSettings.subjectDescription,
        environment: sceneSettings.environment,
        lightingSetup,
        cameraSettings,
        stylePreset: sceneSettings.stylePreset,
        enhanceHDR: sceneSettings.enhanceHDR,
      };

      console.log('Generating from setup:', sceneRequest);

      const { data, error: fnError } = await supabase.functions.invoke('generate-lighting', {
        body: sceneRequest
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Generation result:', data);

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis: data.lighting_analysis,
        generation_metadata: data.generation_metadata
      });

      toast.success('Image generated successfully!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
      const nlRequest = {
        sceneDescription,
        lightingDescription,
        subject: sceneSettings.subjectDescription,
        styleIntent: sceneSettings.stylePreset,
      };

      console.log('Generating from NL:', nlRequest);

      const { data, error: fnError } = await supabase.functions.invoke('natural-language-lighting', {
        body: nlRequest
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('NL Generation result:', data);

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis: data.lighting_analysis,
        generation_metadata: data.generation_metadata
      });

      toast.success('Image generated from description!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const analyzeLighting = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-lighting', {
        body: lightingSetup
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      console.log('Analysis result:', data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    isGenerating,
    error,
    generateFromCurrentSetup,
    generateFromNaturalLanguage,
    analyzeLighting,
  };
};
