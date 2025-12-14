import React, { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Lightbulb, Camera, Settings, Code, Sparkles } from 'lucide-react';
import { useLightingStore } from '@/stores/lightingStore';
import { useGeneration } from '@/hooks/useGeneration';
import LightingSetup from '@/components/lighting/LightingSetup';
import ImagePreview from '@/components/generation/ImagePreview';
import CameraControls from '@/components/camera/CameraControls';
import SceneSettings from '@/components/camera/SceneSettings';
import GenerationControls from '@/components/generation/GenerationControls';
import LightingPresets from '@/components/studio/LightingPresets';
import LightingRatioGauge from '@/components/studio/LightingRatioGauge';
import GenerationProgress from '@/components/studio/GenerationProgress';
import FiboJsonPanel from '@/components/studio/FiboJsonPanel';
import FiboBadge from '@/components/hero/FiboBadge';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load 3D visualizer for performance
const LightVisualizer = lazy(() => import('@/components/lighting/LightVisualizer'));

const Studio = () => {
  const [activeTab, setActiveTab] = useState('lighting');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const { currentImage, lightingAnalysis, isLoading } = useLightingStore();
  const { generateFromCurrentSetup } = useGeneration();

  // Simulate generation steps
  useEffect(() => {
    if (isLoading) {
      setGenerationStep(0);
      const timer1 = setTimeout(() => setGenerationStep(1), 1000);
      const timer2 = setTimeout(() => setGenerationStep(2), 2500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isLoading]);

  const tabs = [
    { id: 'lighting', label: 'Lighting', icon: Lightbulb },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'scene', label: 'Scene', icon: Settings },
  ];

  const renderTabContent = useCallback(() => {
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
  }, [activeTab]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <FiboBadge />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="fibo-badge inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-3 h-3 text-secondary" />
          <span>FIBO-Powered Studio</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-2">Pro Lighting Studio</h1>
        <p className="text-lg text-muted-foreground">
          Professional studio lighting control with AI-powered FIBO generation
        </p>
      </motion.div>

      {/* Quick Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Presets</h3>
        </div>
        <LightingPresets activePreset={activePreset} onSelectPreset={setActivePreset} />
      </motion.div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Panel: 3D Visualizer + Controls */}
        <div className="space-y-6">
          {/* 3D Visualizer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card-premium overflow-hidden"
          >
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">3D Lighting Preview</h3>
              </div>
              <div className="text-xs text-muted-foreground">Interactive • Drag to rotate</div>
            </div>
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            }>
              <LightVisualizer />
            </Suspense>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card-premium p-1"
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
                        ? 'gradient-fibo text-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
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
            className="glass-card-premium p-6"
          >
            {renderTabContent()}
          </motion.div>
        </div>

        {/* Right Panel: Generation + Preview */}
        <div className="space-y-6">
          {/* Lighting Ratio Gauge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LightingRatioGauge />
          </motion.div>

          {/* Generation Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GenerationControls onGenerate={generateFromCurrentSetup} />
          </motion.div>

          {/* Generation Progress */}
          <GenerationProgress isLoading={isLoading} currentStep={generationStep} />

          {/* FIBO JSON Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <FiboJsonPanel />
          </motion.div>

          {/* Generated Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="text-lg font-semibold">Generated Image</h3>
            </div>
            <div className="glass-card-premium overflow-hidden">
              <ImagePreview
                image={currentImage}
                isLoading={isLoading}
                analysis={lightingAnalysis}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
