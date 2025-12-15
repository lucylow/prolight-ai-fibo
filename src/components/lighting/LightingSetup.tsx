import React from 'react';
import { motion } from 'framer-motion';
import { useLighting } from '@/hooks/useLighting';
import LightControl from './LightControl';

const LightingSetup = () => {
  const { lightingSetup, updateLight } = useLighting();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Lighting Setup</h2>
        <p className="text-muted-foreground">
          Configure your professional lighting setup with precise controls
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {Object.entries(lightingSetup).map(([lightType, lightConfig]) => (
          <LightControl
            key={lightType}
            lightType={lightType}
            lightConfig={lightConfig as any}
            onUpdate={(updates) => updateLight(lightType as any, updates)}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default LightingSetup;
