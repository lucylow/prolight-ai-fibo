import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLightingStore } from '@/stores/lightingStore';

interface GenerationControlsProps {
  onGenerate: () => Promise<unknown>;
}

const GenerationControls = ({ onGenerate }: GenerationControlsProps) => {
  const { isLoading, resetLighting } = useLightingStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-primary" />
        Generation Controls
      </h3>
      
      <div className="space-y-3">
        <Button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full gradient-primary"
          size="lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>
        
        <Button
          onClick={resetLighting}
          variant="outline"
          className="w-full"
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Lighting
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        Using FIBO JSON-native architecture for precise, reproducible results
      </p>
    </motion.div>
  );
};

export default GenerationControls;
