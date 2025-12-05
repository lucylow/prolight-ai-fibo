import React from 'react';
import { motion } from 'framer-motion';
import { Sun, RotateCcw, Zap, ZapOff } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ColorTemperature } from '@/components/ui/color-temperature';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LightConfig {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

interface LightControlProps {
  lightType: string;
  lightConfig: LightConfig;
  onUpdate: (updates: Partial<LightConfig>) => void;
}

const lightLabels: Record<string, { label: string; description: string }> = {
  key: { label: 'Key Light', description: 'Primary light source defining shape and form' },
  fill: { label: 'Fill Light', description: 'Softens shadows created by key light' },
  rim: { label: 'Rim Light', description: 'Separates subject from background' },
  ambient: { label: 'Ambient Light', description: 'Overall scene illumination' },
};

const defaults: Record<string, Partial<LightConfig>> = {
  key: { intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5 },
  fill: { intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0 },
  rim: { intensity: 0.6, colorTemperature: 3200, softness: 0.3, distance: 1.0 },
  ambient: { intensity: 0.1, colorTemperature: 5000 },
};

const LightControl = ({ lightType, lightConfig, onUpdate }: LightControlProps) => {
  const { label, description } = lightLabels[lightType] || { label: lightType, description: '' };

  const resetLight = () => onUpdate(defaults[lightType] || {});
  const toggleEnabled = () => onUpdate({ enabled: !lightConfig.enabled });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${!lightConfig.enabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sun className="w-5 h-5 text-secondary" />
          <div>
            <h3 className="font-semibold text-foreground">{label}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={resetLight} className="p-2 rounded-md hover:bg-muted transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Reset to defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleEnabled}
                  className={`p-2 rounded-md transition-colors ${lightConfig.enabled ? 'text-secondary hover:bg-secondary/10' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {lightConfig.enabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{lightConfig.enabled ? 'Disable' : 'Enable'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Intensity</label>
            <span className="text-sm text-primary">{Math.round(lightConfig.intensity * 100)}%</span>
          </div>
          <Slider
            value={[lightConfig.intensity]}
            onValueChange={(v) => onUpdate({ intensity: v[0] })}
            min={0}
            max={1}
            step={0.01}
            disabled={!lightConfig.enabled}
          />
        </div>

        {lightType !== 'ambient' && (
          <>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Color Temperature</label>
                <span className="text-sm text-primary">{lightConfig.colorTemperature}K</span>
              </div>
              <ColorTemperature
                value={lightConfig.colorTemperature}
                onChange={(v) => onUpdate({ colorTemperature: v })}
                disabled={!lightConfig.enabled}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Softness</label>
                <span className="text-sm text-primary">
                  {lightConfig.softness < 0.3 ? 'Hard' : lightConfig.softness < 0.7 ? 'Medium' : 'Soft'}
                </span>
              </div>
              <Slider
                value={[lightConfig.softness]}
                onValueChange={(v) => onUpdate({ softness: v[0] })}
                min={0}
                max={1}
                step={0.01}
                disabled={!lightConfig.enabled}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Distance</label>
                <span className="text-sm text-primary">{lightConfig.distance}m</span>
              </div>
              <Slider
                value={[lightConfig.distance]}
                onValueChange={(v) => onUpdate({ distance: v[0] })}
                min={0.1}
                max={5}
                step={0.1}
                disabled={!lightConfig.enabled}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Direction</label>
              <select
                value={lightConfig.direction}
                onChange={(e) => onUpdate({ direction: e.target.value })}
                disabled={!lightConfig.enabled}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
              >
                <option value="frontal">Frontal</option>
                <option value="45 degrees camera-left">45° Camera Left</option>
                <option value="45 degrees camera-right">45° Camera Right</option>
                <option value="high and behind">High & Behind</option>
                <option value="behind subject">Directly Behind</option>
                <option value="above camera">Above Camera</option>
              </select>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default LightControl;
