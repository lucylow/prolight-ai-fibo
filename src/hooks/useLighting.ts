import { useLightingStore } from '../stores/lightingStore';

export const useLighting = () => {
  const {
    lightingSetup,
    cameraSettings,
    sceneSettings,
    updateLight,
    updateCamera,
    updateScene,
    loadPreset,
    resetLighting,
    getLightingAnalysis,
  } = useLightingStore();

  const getColorTemperatureColor = (temp: number): string => {
    if (temp <= 3200) return '#FF8C00';
    if (temp <= 4500) return '#FFA500';
    if (temp <= 5600) return '#FFD700';
    if (temp <= 6500) return '#FFFFE0';
    return '#87CEFA';
  };

  const exportLightingSetup = () => ({
    lightingSetup,
    cameraSettings,
    sceneSettings,
    analysis: getLightingAnalysis(),
    timestamp: new Date().toISOString(),
  });

  return {
    lightingSetup,
    cameraSettings,
    sceneSettings,
    updateLight,
    updateCamera,
    updateScene,
    loadPreset,
    resetLighting,
    getLightingAnalysis,
    getColorTemperatureColor,
    exportLightingSetup,
  };
};
