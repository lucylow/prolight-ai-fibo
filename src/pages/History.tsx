import React from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Download, Trash2 } from 'lucide-react';
import { useLightingStore } from '@/stores/lightingStore';
import { Button } from '@/components/ui/button';

const History = () => {
  const { generationResults } = useLightingStore();

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
          <HistoryIcon className="w-10 h-10" />
          Generation History
        </h1>
        <p className="text-lg text-muted-foreground">
          Your recent generated images and lighting setups
        </p>
      </motion.div>

      {generationResults.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <HistoryIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
          <p className="text-muted-foreground">Your generated images will appear here</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generationResults.map((result, i) => (
            <motion.div
              key={result.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card overflow-hidden group"
            >
              <div className="relative">
                <img
                  src={result.image_url}
                  alt={`Generation ${i + 1}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {new Date(result.timestamp).toLocaleString()}
                </p>
                {result.lightingAnalysis && (
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-muted">
                      {result.lightingAnalysis.lightingStyle.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary">
                      {result.lightingAnalysis.professionalRating}/10
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
