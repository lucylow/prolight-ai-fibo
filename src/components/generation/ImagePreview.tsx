import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LightingAnalysis {
  keyFillRatio: number;
  lightingStyle: string;
  contrastScore: number;
  professionalRating: number;
}

interface ImagePreviewProps {
  image: { image_url: string } | null;
  isLoading: boolean;
  analysis: LightingAnalysis | null;
}

const ImagePreview = ({ image, isLoading, analysis }: ImagePreviewProps) => {
  const [scale, setScale] = useState(1);

  if (isLoading) {
    return (
      <div className="w-full h-80 rounded-2xl glass-card flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Generating your image...</p>
          <p className="text-sm text-muted-foreground">Using FIBO JSON-native generation</p>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="w-full h-80 rounded-2xl glass-card flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <ZoomIn className="w-8 h-8" />
          </div>
          <p>No image generated yet</p>
          <p className="text-sm">Configure your lighting and click Generate</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.image_url;
    link.download = `lighting-simulator-${Date.now()}.png`;
    link.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-4">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
        <motion.div style={{ scale }} className="relative">
          <img
            src={image.image_url}
            alt="Generated scene"
            className="w-full h-auto max-h-80 object-contain"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            {[
              { icon: ZoomIn, action: () => setScale((s) => Math.min(s + 0.25, 3)) },
              { icon: ZoomOut, action: () => setScale((s) => Math.max(s - 0.25, 0.5)) },
              { icon: RotateCcw, action: () => setScale(1) },
              { icon: Download, action: handleDownload },
            ].map(({ icon: Icon, action }, i) => (
              <button
                key={i}
                onClick={action}
                className="p-2 bg-background/80 backdrop-blur rounded-lg hover:bg-background transition-colors"
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
          >
            {[
              { label: 'Key/Fill Ratio', value: `${analysis.keyFillRatio}:1` },
              { label: 'Lighting Style', value: analysis.lightingStyle.replace('_', ' ') },
              { label: 'Contrast', value: `${Math.round(analysis.contrastScore * 100)}%` },
              { label: 'Pro Rating', value: `${analysis.professionalRating}/10` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-muted">
                <div className="font-medium text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-bold text-primary capitalize">{value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ImagePreview;
