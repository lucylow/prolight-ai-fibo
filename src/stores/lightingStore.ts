import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockGenerationResults, shouldUseMockData } from '@/services/enhancedMockData';

interface LightConfig {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

interface AmbientConfig {
  intensity: number;
  colorTemperature: number;
  enabled: boolean;
}

interface LightingSetup {
  key: LightConfig;
  fill: LightConfig;
  rim: LightConfig;
  ambient: AmbientConfig;
}

interface CameraSettings {
  shotType: string;
  cameraAngle: string;
  fov: number;
  lensType: string;
  aperture: string;
}

interface SceneSettings {
  subjectDescription: string;
  environment: string;
  stylePreset: string;
  enhanceHDR: boolean;
}

interface GenerationResult {
  image_url: string;
  image_id?: string;
  fibo_json?: Record<string, unknown>;
  lightingAnalysis?: LightingAnalysis;
  generation_metadata?: Record<string, unknown>;
  timestamp?: string;
}

interface LightingAnalysis {
  keyFillRatio: number;
  lightingStyle: string;
  totalExposure: number;
  contrastScore: number;
  professionalRating: number;
}

interface LightingStore {
  lightingSetup: LightingSetup;
  cameraSettings: CameraSettings;
  sceneSettings: SceneSettings;
  generationResults: GenerationResult[];
  currentImage: GenerationResult | null;
  isLoading: boolean;
  lightingAnalysis: LightingAnalysis | null;
  
  updateLight: (lightType: keyof LightingSetup, updates: Partial<LightConfig | AmbientConfig>) => void;
  updateCamera: (updates: Partial<CameraSettings>) => void;
  updateScene: (updates: Partial<SceneSettings>) => void;
  setLoading: (isLoading: boolean) => void;
  setGenerationResult: (result: GenerationResult) => void;
  loadPreset: (preset: { lightingSetup: LightingSetup; cameraSettings: CameraSettings }) => void;
  resetLighting: () => void;
  getLightingAnalysis: () => LightingAnalysis;
}

const defaultLightingSetup: LightingSetup = {
  key: { direction: '45 degrees camera-right', intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
  fill: { direction: '30 degrees camera-left', intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true },
  rim: { direction: 'behind subject left', intensity: 0.6, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
  ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true },
};

const calculateLightingAnalysis = (lightingSetup: LightingSetup): LightingAnalysis => {
  const { key, fill, rim, ambient } = lightingSetup;
  
  const keyFillRatio = key.intensity / Math.max(fill.intensity, 0.1);
  const totalExposure = key.intensity + fill.intensity + rim.intensity + ambient.intensity;
  const contrastScore = (key.intensity - fill.intensity) / Math.max(key.intensity, 0.1);
  
  let lightingStyle = 'classical_portrait';
  if (keyFillRatio >= 4) lightingStyle = 'dramatic';
  if (keyFillRatio >= 8) lightingStyle = 'high_contrast';
  if (keyFillRatio <= 1.5) lightingStyle = 'soft_lighting';
  if (keyFillRatio <= 1) lightingStyle = 'flat_lighting';
  
  const idealRatio = 3.0;
  const ratioScore = 1 - Math.min(Math.abs(keyFillRatio - idealRatio) / 6, 1);
  const professionalRating = Math.round((ratioScore * 0.6 + contrastScore * 0.4) * 10);

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    totalExposure: Math.min(totalExposure, 1.0),
    contrastScore: Math.round(contrastScore * 100) / 100,
    professionalRating,
  };
};

export const useLightingStore = create<LightingStore>()(
  persist(
    (set, get) => ({
      lightingSetup: defaultLightingSetup,
      cameraSettings: {
        shotType: 'medium shot',
        cameraAngle: 'eye-level',
        fov: 85,
        lensType: 'portrait',
        aperture: 'f/2.8',
      },
      sceneSettings: {
        subjectDescription: 'professional model in studio',
        environment: 'minimalist photography studio with gray backdrop',
        stylePreset: 'professional',
        enhanceHDR: false,
      },
      generationResults: [],
      currentImage: null,
      isLoading: false,
      lightingAnalysis: null,

      updateLight: (lightType, updates) => set((state) => ({
        lightingSetup: {
          ...state.lightingSetup,
          [lightType]: { ...state.lightingSetup[lightType], ...updates },
        },
      })),

      updateCamera: (updates) => set((state) => ({
        cameraSettings: { ...state.cameraSettings, ...updates },
      })),

      updateScene: (updates) => set((state) => ({
        sceneSettings: { ...state.sceneSettings, ...updates },
      })),

      setLoading: (isLoading) => set({ isLoading }),

      setGenerationResult: (result) => set((state) => ({
        generationResults: [result, ...state.generationResults.slice(0, 9)],
        currentImage: result,
        lightingAnalysis: result.lightingAnalysis || null,
      })),

      setLightingAnalysis: (analysis) => set({ lightingAnalysis: analysis }),

      loadPreset: (preset) => set({
        lightingSetup: preset.lightingSetup,
        cameraSettings: preset.cameraSettings,
      }),

      resetLighting: () => set({ lightingSetup: defaultLightingSetup }),

      getLightingAnalysis: () => calculateLightingAnalysis(get().lightingSetup),
    }),
    {
      name: 'lighting-storage',
      partialize: (state) => ({
        lightingSetup: state.lightingSetup,
        cameraSettings: state.cameraSettings,
        sceneSettings: state.sceneSettings,
        generationResults: state.generationResults,
        currentImage: state.currentImage,
        lightingAnalysis: state.lightingAnalysis,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, check if we should populate mock data
        if (state && shouldUseMockData()) {
          // Only populate if generationResults is empty
          if (!state.generationResults || state.generationResults.length === 0) {
            state.generationResults = mockGenerationResults;
            if (mockGenerationResults.length > 0) {
              state.currentImage = mockGenerationResults[0];
              state.lightingAnalysis = mockGenerationResults[0].lightingAnalysis || null;
            }
          }
        }
      },
    }
  )
);
