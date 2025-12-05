import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useLighting } from '@/hooks/useLighting';

const CameraControls = () => {
  const { cameraSettings, updateCamera } = useLighting();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Camera Settings
        </h2>
        <p className="text-muted-foreground">Configure camera parameters for your shot</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Shot Type</label>
            <select
              value={cameraSettings.shotType}
              onChange={(e) => updateCamera({ shotType: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              <option value="close-up">Close-up</option>
              <option value="medium shot">Medium Shot</option>
              <option value="full shot">Full Shot</option>
              <option value="wide shot">Wide Shot</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Camera Angle</label>
            <select
              value={cameraSettings.cameraAngle}
              onChange={(e) => updateCamera({ cameraAngle: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              <option value="eye-level">Eye Level</option>
              <option value="high angle">High Angle</option>
              <option value="low angle">Low Angle</option>
              <option value="bird's eye">Bird's Eye</option>
            </select>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Field of View</label>
              <span className="text-sm text-primary">{cameraSettings.fov}mm</span>
            </div>
            <Slider
              value={[cameraSettings.fov]}
              onValueChange={(v) => updateCamera({ fov: v[0] })}
              min={24}
              max={200}
              step={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Aperture</label>
            <select
              value={cameraSettings.aperture}
              onChange={(e) => updateCamera({ aperture: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background"
            >
              <option value="f/1.4">f/1.4 (Very Shallow)</option>
              <option value="f/2.8">f/2.8 (Portrait)</option>
              <option value="f/5.6">f/5.6 (General)</option>
              <option value="f/8">f/8 (Landscape)</option>
              <option value="f/16">f/16 (Maximum DOF)</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CameraControls;
