import React, { useState, Suspense, lazy, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Lightbulb, Camera, Settings, Code, Sparkles, Maximize2 } from 'lucide-react';
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
import LightingPanel from '@/components/LightingPanel';
import MoodPaletteEditor from '@/components/MoodPaletteEditor';
import CompositionPanel from '@/components/composition/CompositionPanel';

// Lazy load 3D visualizer for performance
const LightVisualizer = lazy(() => import('@/components/lighting/LightVisualizer'));

const Studio = () => {
  const [activeTab, setActiveTab] = useState('lighting');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const { currentImage, lightingAnalysis, isLoading, lightingSetup, sceneSettings, setLightingAnalysis } = useLightingStore();
  const { generateFromCurrentSetup, analyzeLighting } = useGeneration();
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousLightingRef = useRef<string>('');

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

  // Automatically analyze lighting when it changes
  useEffect(() => {
    // Create a serialized version of lighting setup for comparison
    const currentLightingKey = JSON.stringify(lightingSetup);
    
    // Only analyze if lighting actually changed
    if (currentLightingKey !== previousLightingRef.current && !isLoading) {
      previousLightingRef.current = currentLightingKey;
      
      // Debounce analysis calls (wait 500ms after last change)
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      
      analysisTimeoutRef.current = setTimeout(async () => {
        try {
          const analysis = await analyzeLighting();
          if (analysis) {
            setLightingAnalysis(analysis);
          }
        } catch (error) {
          // Silently fail - analysis is not critical for UI
          console.warn('Failed to analyze lighting:', error);
        }
      }, 500);
    }
    
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [lightingSetup, analyzeLighting, isLoading, setLightingAnalysis]);

  const tabs = [
    { id: 'lighting', label: 'Lighting', icon: Lightbulb },
    { id: 'lighting-advanced', label: 'Advanced Lighting', icon: Lightbulb },
    { id: 'palette', label: 'Palette & Mood', icon: Sparkles },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'composition', label: 'Composition', icon: Maximize2 },
    { id: 'scene', label: 'Scene', icon: Settings },
  ];

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'lighting':
        return <LightingSetup />;
      case 'lighting-advanced':
        return <LightingPanel />;
      case 'palette':
        return <MoodPaletteEditor />;
      case 'camera':
        return <CameraControls />;
      case 'composition':
        return <CompositionPanel />;
      case 'scene':
        return <SceneSettings />;
      default:
        return <LightingSetup />;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6 md:px-[5%]">
      <FiboBadge />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8"
      >
        <div className="fibo-badge inline-flex items-center gap-2 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 text-secondary" />
          <span>FIBO-Powered Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">Pro Lighting Studio</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
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
              <div className="h-64 sm:h-80 md:h-96 flex items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground px-4 text-center">Loading 3D visualizer...</p>
                </div>
              </div>
            }>
              <div className="h-64 sm:h-80 md:h-96">
                <LightVisualizer />
              </div>
            </Suspense>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card-premium p-1 overflow-x-auto"
          >
            <div className="flex gap-1 min-w-max sm:min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all flex-1 sm:flex-none min-w-[90px] sm:min-w-0 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'gradient-fibo text-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="font-medium text-xs sm:text-sm">{tab.label}</span>
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
            className="glass-card-premium p-4 sm:p-6 overflow-x-auto"
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
