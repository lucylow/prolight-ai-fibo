import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLighting } from '@/hooks/useLighting';

const SceneSettings = () => {
  const { sceneSettings, updateScene } = useLighting();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Scene Settings
        </h2>
        <p className="text-muted-foreground">Describe your scene and subject</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass-card p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Subject Description</label>
            <Textarea
              value={sceneSettings.subjectDescription}
              onChange={(e) => updateScene({ subjectDescription: e.target.value })}
              placeholder="Describe your subject..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Environment</label>
            <Textarea
              value={sceneSettings.environment}
              onChange={(e) => updateScene({ environment: e.target.value })}
              placeholder="Describe the environment/backdrop..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Style Preset</label>
            <select
              value={sceneSettings.stylePreset}
              onChange={(e) => updateScene({ stylePreset: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              <option value="professional">Professional</option>
              <option value="cinematic">Cinematic</option>
              <option value="editorial">Editorial</option>
              <option value="dramatic">Dramatic</option>
              <option value="natural">Natural</option>
              <option value="high-key">High-Key</option>
              <option value="low-key">Low-Key</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <label className="text-sm font-medium">Enhance HDR</label>
            </div>
            <Switch
              checked={sceneSettings.enhanceHDR}
              onCheckedChange={(checked) => updateScene({ enhanceHDR: checked })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SceneSettings;
