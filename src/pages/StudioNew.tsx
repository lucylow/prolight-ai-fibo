/**
 * ProLight Studio - Production-Ready Demo
 * Integrates all new components with professional UI
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProLightLiveDemo from '@/components/ProLightLiveDemo';
import ProLightProControls from '@/components/ProLightProControls';
import FIBOJsonEditor from '@/components/FIBOJsonEditor';
import GenerationHistory from '@/components/GenerationHistory';
import PresetManagement from '@/components/PresetManagement';
import { Sparkles, Camera, Code, History, Settings, Lightbulb } from 'lucide-react';

export default function StudioNew() {
  const [activeTab, setActiveTab] = useState('demo');

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e0e0e0]">
      {/* Header */}
      <div className="border-b border-[#2a2f4a] bg-[#1a1f2e]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#e0e0e0] flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-[#667eea]" />
                ProLight AI FIBO
              </h1>
              <p className="text-sm text-[#999] mt-1">
                Professional photographer-grade lighting control with BRIA FIBO integration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[#1a1f2e] border border-[#2a2f4a]">
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Live Demo</span>
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Pro Controls</span>
            </TabsTrigger>
            <TabsTrigger value="fibo" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">FIBO JSON</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Presets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProLightLiveDemo />
              <GenerationHistory />
            </div>
          </TabsContent>

          <TabsContent value="controls" className="space-y-6">
            <ProLightProControls />
          </TabsContent>

          <TabsContent value="fibo" className="space-y-6">
            <FIBOJsonEditor />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <GenerationHistory />
          </TabsContent>

          <TabsContent value="presets" className="space-y-6">
            <PresetManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

