import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Lightbulb, Camera, Settings } from 'lucide-react';
import { useLightingStore } from '@/stores/lightingStore';
import { useGeneration } from '@/hooks/useGeneration';
import LightingSetup from '@/components/lighting/LightingSetup';
import LightVisualizer from '@/components/lighting/LightVisualizer';
import ImagePreview from '@/components/generation/ImagePreview';
import CameraControls from '@/components/camera/CameraControls';
import SceneSettings from '@/components/camera/SceneSettings';
import GenerationControls from '@/components/generation/GenerationControls';

const Studio = () => {
  const [activeTab, setActiveTab] = useState('lighting');
  const { currentImage, lightingAnalysis, isLoading } = useLightingStore();
  const { generateFromCurrentSetup } = useGeneration();

  const tabs = [
    { id: 'lighting', label: 'Lighting', icon: Lightbulb },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'scene', label: 'Scene', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'lighting':
        return <LightingSetup />;
      case 'camera':
        return <CameraControls />;
      case 'scene':
        return <SceneSettings />;
      default:
        return <LightingSetup />;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">Pro Lighting Studio</h1>
        <p className="text-lg text-muted-foreground">
          Professional studio lighting control with AI-powered FIBO generation
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-1"
          >
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all flex-1 ${
                      activeTab === tab.id
                        ? 'gradient-primary text-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Active Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>

          {/* 3D Visualizer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">3D Lighting Preview</h3>
            </div>
            <LightVisualizer />
          </motion.div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GenerationControls onGenerate={generateFromCurrentSetup} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold mb-4">Generated Image</h3>
            <ImagePreview
              image={currentImage}
              isLoading={isLoading}
              analysis={lightingAnalysis}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
