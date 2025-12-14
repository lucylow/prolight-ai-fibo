import { motion } from 'framer-motion';
import { Camera, User, Sparkles, Sun } from 'lucide-react';
import { useLighting } from '@/hooks/useLighting';

const presets = [
  { id: 'product', label: 'Product Photo', icon: Camera, config: { key: 0.9, fill: 0.6, rim: 0.4 } },
  { id: 'portrait', label: 'Portrait', icon: User, config: { key: 0.8, fill: 0.4, rim: 0.5 } },
  { id: 'dramatic', label: 'Dramatic', icon: Sparkles, config: { key: 1.0, fill: 0.2, rim: 0.8 } },
  { id: 'soft', label: 'Soft Fill', icon: Sun, config: { key: 0.6, fill: 0.7, rim: 0.3 } },
];

interface LightingPresetsProps {
  activePreset: string | null;
  onSelectPreset: (id: string) => void;
}

const LightingPresets = ({ activePreset, onSelectPreset }: LightingPresetsProps) => {
  const { updateLight } = useLighting();

  const handlePresetClick = (preset: typeof presets[0]) => {
    onSelectPreset(preset.id);
    updateLight('key', { intensity: preset.config.key });
    updateLight('fill', { intensity: preset.config.fill });
    updateLight('rim', { intensity: preset.config.rim });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const Icon = preset.icon;
        const isActive = activePreset === preset.id;
        
        return (
          <motion.button
            key={preset.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePresetClick(preset)}
            className={`preset-button flex items-center gap-2 ${isActive ? 'preset-button-active' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {preset.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default LightingPresets;
