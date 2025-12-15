/**
 * ProLight Pro Controls Store
 * Manages camera settings, lighting controls, and presets with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LightingConfig, CameraConfig, SceneConfig } from '@/utils/fiboBuilder';
import { Preset } from '@/utils/presets';

interface ProlightProStore {
  // Lighting configuration
  lighting: LightingConfig;
  
  // Camera configuration
  camera: CameraConfig;
  
  // Scene configuration
  scene: SceneConfig;

  // Presets
  savedPresets: Preset[];
  activePresetId: string | null;

  // Actions - Lighting
  updateKeyLight: (updates: Partial<LightingConfig['key']>) => void;
  updateFillLight: (updates: Partial<LightingConfig['fill']>) => void;
  updateRimLight: (updates: Partial<LightingConfig['rim']>) => void;
  updateAmbient: (updates: Partial<LightingConfig['ambient']>) => void;
  toggleLight: (lightType: 'key' | 'fill' | 'rim' | 'ambient') => void;

  // Actions - Camera
  updateCamera: (updates: Partial<CameraConfig>) => void;

  // Actions - Scene
  updateScene: (updates: Partial<SceneConfig>) => void;

  // Actions - Presets
  loadPreset: (preset: Preset) => void;
  savePreset: (name: string, description: string, category: Preset['category']) => void;
  deletePreset: (presetId: string) => void;
  setActivePreset: (presetId: string | null) => void;

  // Reset
  resetToDefaults: () => void;
}

const defaultLighting: LightingConfig = {
  key: {
    intensity: 1.0,
    angle_horizontal: 45,
    angle_vertical: 30,
    color_temperature: 5500,
    softness: 0.6,
    distance: 1.5,
    enabled: true,
  },
  fill: {
    intensity: 0.5,
    angle_horizontal: -45,
    angle_vertical: 30,
    color_temperature: 5500,
    softness: 0.8,
    distance: 2.0,
    enabled: true,
    fill_ratio: 0.5,
  },
  rim: {
    intensity: 0.7,
    angle_horizontal: 135,
    angle_vertical: 45,
    color_temperature: 5500,
    softness: 0.4,
    distance: 2.5,
    enabled: true,
  },
  ambient: {
    intensity: 0.2,
    color_temperature: 5500,
    enabled: true,
  },
};

const defaultCamera: CameraConfig = {
  focal_length: 50,
  aperture: 2.8,
  iso: 100,
  white_balance: 5500,
  metering_mode: 'matrix',
  shot_type: 'product',
  camera_angle: 'eye-level',
};

const defaultScene: SceneConfig = {
  subject_description: '',
  environment: 'studio',
  style_preset: 'professional',
  background: 'neutral',
};

export const useProlightProStore = create<ProlightProStore>()(
  persist(
    (set, get) => ({
      // Initial state
      lighting: defaultLighting,
      camera: defaultCamera,
      scene: defaultScene,
      savedPresets: [],
      activePresetId: null,

      // Lighting actions
      updateKeyLight: (updates) =>
        set((state) => ({
          lighting: {
            ...state.lighting,
            key: { ...state.lighting.key, ...updates },
          },
        })),
      updateFillLight: (updates) =>
        set((state) => ({
          lighting: {
            ...state.lighting,
            fill: { ...state.lighting.fill, ...updates },
          },
        })),
      updateRimLight: (updates) =>
        set((state) => ({
          lighting: {
            ...state.lighting,
            rim: { ...state.lighting.rim, ...updates },
          },
        })),
      updateAmbient: (updates) =>
        set((state) => ({
          lighting: {
            ...state.lighting,
            ambient: { ...state.lighting.ambient, ...updates },
          },
        })),
      toggleLight: (lightType) =>
        set((state) => {
          const light = state.lighting[lightType];
          return {
            lighting: {
              ...state.lighting,
              [lightType]: { ...light, enabled: !light.enabled },
            },
          };
        }),

      // Camera actions
      updateCamera: (updates) =>
        set((state) => ({
          camera: { ...state.camera, ...updates },
        })),

      // Scene actions
      updateScene: (updates) =>
        set((state) => ({
          scene: { ...state.scene, ...updates },
        })),

      // Preset actions
      loadPreset: (preset) =>
        set({
          lighting: preset.lighting,
          camera: preset.camera,
          scene: preset.scene,
          activePresetId: preset.id,
        }),
      savePreset: (name, description, category) => {
        const state = get();
        const newPreset: Preset = {
          id: `custom-${Date.now()}`,
          name,
          description,
          category,
          lighting: state.lighting,
          camera: state.camera,
          scene: state.scene,
        };
        set((state) => ({
          savedPresets: [...state.savedPresets, newPreset],
        }));
      },
      deletePreset: (presetId) =>
        set((state) => ({
          savedPresets: state.savedPresets.filter((p) => p.id !== presetId),
          activePresetId: state.activePresetId === presetId ? null : state.activePresetId,
        })),
      setActivePreset: (presetId) => set({ activePresetId: presetId }),

      // Reset
      resetToDefaults: () =>
        set({
          lighting: defaultLighting,
          camera: defaultCamera,
          scene: defaultScene,
          activePresetId: null,
        }),
    }),
    {
      name: 'prolight-pro-storage',
      partialize: (state) => ({
        lighting: state.lighting,
        camera: state.camera,
        scene: state.scene,
        savedPresets: state.savedPresets,
        activePresetId: state.activePresetId,
      }),
    }
  )
);

