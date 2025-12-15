import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, ChevronDown, ChevronUp, Copy, Check, Info } from 'lucide-react';
import { buildFiboLightingJson } from '@/utils/fiboLightingUtils';
import type { LightingSetup } from '@/utils/fiboLightingUtils';

interface FIBOJsonViewerProps {
  preset: {
    id: string;
    name: string;
    lightingSetup: LightingSetup;
    cameraSettings: {
      shotType: string;
      cameraAngle: string;
      fov: number;
      lensType: string;
      aperture: string;
    };
  };
}

const FIBOJsonViewer: React.FC<FIBOJsonViewerProps> = ({ preset }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build complete FIBO JSON structure
  const lightingJson = buildFiboLightingJson(preset.lightingSetup);
  
  const fiboJson = {
    subject: {
      main_entity: "professional portrait subject",
      attributes: preset.cameraSettings.shotType,
      action: "posing",
    },
    camera: {
      shot_type: preset.cameraSettings.shotType,
      camera_angle: preset.cameraSettings.cameraAngle,
      fov: preset.cameraSettings.fov,
      lens_type: preset.cameraSettings.lensType,
      aperture: preset.cameraSettings.aperture,
    },
    lighting: lightingJson,
    render: {
      resolution: [1024, 1024],
      color_space: "sRGB",
      samples: 50,
    },
    deterministic: true,
  };

  const jsonString = JSON.stringify(fiboJson, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">View FIBO JSON Structure</span>
          <Info className="w-3 h-3 text-muted-foreground" />
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/30"
          >
            <div className="p-4 relative">
              <button
                onClick={handleCopy}
                className="absolute top-6 right-6 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors z-10"
                title="Copy FIBO JSON"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary font-medium mb-1">FIBO Interactive Format</p>
                <p className="text-xs text-muted-foreground">
                  This preset is converted to FIBO's structured JSON format, enabling deterministic, 
                  reproducible lighting control. Each parameter maps directly to FIBO's lighting system.
                </p>
              </div>
              
              <pre className="text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                <code className="text-primary/80">{jsonString}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FIBOJsonViewer;

