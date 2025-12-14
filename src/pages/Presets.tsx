import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { useLighting } from '@/hooks/useLighting';
import { toast } from 'sonner';

const presets = [
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    description: 'Classic portrait lighting with triangle highlight under eye',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.9, colorTemperature: 5600, softness: 0.4, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.3, colorTemperature: 5600, softness: 0.6, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.5, colorTemperature: 5600, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'butterfly',
    name: 'Butterfly (Paramount)',
    description: 'Glamorous lighting from above creating butterfly shadow under nose',
    lightingSetup: {
      key: { direction: 'above camera', intensity: 0.85, colorTemperature: 5600, softness: 0.5, distance: 1.2, enabled: true },
      fill: { direction: 'frontal', intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.3, colorTemperature: 5600, softness: 0.4, distance: 1.5, enabled: true },
      ambient: { intensity: 0.15, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'loop',
    name: 'Loop Lighting',
    description: 'Subtle shadow loops around the nose, flattering for most faces',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: '30 degrees camera-left', intensity: 0.45, colorTemperature: 5600, softness: 0.6, distance: 2.0, enabled: true },
      rim: { direction: 'behind subject left', intensity: 0.4, colorTemperature: 5600, softness: 0.4, distance: 1.2, enabled: true },
      ambient: { intensity: 0.12, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'medium shot', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'split',
    name: 'Split Lighting',
    description: 'Dramatic half-face illumination for moody portraits',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 1.0, colorTemperature: 5600, softness: 0.3, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.1, colorTemperature: 5600, softness: 0.8, distance: 3.0, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.6, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 5000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
  {
    id: 'highkey',
    name: 'High Key',
    description: 'Bright, even lighting for clean commercial look',
    lightingSetup: {
      key: { direction: 'frontal', intensity: 0.7, colorTemperature: 5600, softness: 0.8, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.65, colorTemperature: 5600, softness: 0.8, distance: 1.8, enabled: true },
      rim: { direction: 'behind subject', intensity: 0.3, colorTemperature: 6500, softness: 0.5, distance: 1.5, enabled: true },
      ambient: { intensity: 0.3, colorTemperature: 5600, enabled: true },
    },
    cameraSettings: { shotType: 'medium shot', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/5.6' },
  },
  {
    id: 'lowkey',
    name: 'Low Key',
    description: 'Dramatic, moody lighting with deep shadows',
    lightingSetup: {
      key: { direction: '45 degrees camera-right', intensity: 0.95, colorTemperature: 4500, softness: 0.3, distance: 1.5, enabled: true },
      fill: { direction: '45 degrees camera-left', intensity: 0.15, colorTemperature: 5600, softness: 0.5, distance: 2.5, enabled: true },
      rim: { direction: 'behind subject left', intensity: 0.7, colorTemperature: 3200, softness: 0.2, distance: 1.0, enabled: true },
      ambient: { intensity: 0.02, colorTemperature: 4000, enabled: true },
    },
    cameraSettings: { shotType: 'close-up', cameraAngle: 'eye-level', fov: 85, lensType: 'portrait', aperture: 'f/2.8' },
  },
];

const Presets = () => {
  const { loadPreset } = useLighting();

  const handleLoadPreset = (preset: typeof presets[0]) => {
    loadPreset({
      lightingSetup: preset.lightingSetup,
      cameraSettings: preset.cameraSettings,
    });
    toast.success(`Loaded ${preset.name} preset`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
          <Palette className="w-10 h-10" />
          Lighting Presets
        </h1>
        <p className="text-lg text-muted-foreground">
          Professional lighting setups used by photographers worldwide
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((preset, i) => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 hover:-translate-y-2 transition-all duration-300 cursor-pointer group"
            onClick={() => handleLoadPreset(preset)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{preset.name}</h3>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </div>
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Check className="w-5 h-5" />
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key Intensity</span>
                <span className="text-primary">{Math.round(preset.lightingSetup.key.intensity * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fill Intensity</span>
                <span className="text-primary">{Math.round(preset.lightingSetup.fill.intensity * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key/Fill Ratio</span>
                <span className="text-secondary">
                  {(preset.lightingSetup.key.intensity / preset.lightingSetup.fill.intensity).toFixed(1)}:1
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Presets;
