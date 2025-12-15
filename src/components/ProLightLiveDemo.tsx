/**
 * ProLight Live Demo Component
 * Main demo panel with seed locking, generation controls, and history
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProlightStore } from '@/stores/useProlightStore';
import { useProlightProStore } from '@/stores/useProlightProStore';
import { useBriaAPI } from '@/hooks/useBriaAPI';
import { buildFIBOJson } from '@/utils/fiboBuilder';
import { Sparkles, Lock, Unlock, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProLightLiveDemo() {
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    currentSeed,
    isSeedLocked,
    currentPrompt,
    isGenerating,
    generationProgress,
    error,
    currentImage,
    setCurrentSeed,
    lockSeed,
    unlockSeed,
    setPrompt: setStorePrompt,
    setGenerating,
    setGenerationProgress,
    setError,
    setCurrentImage,
    addToHistory,
  } = useProlightStore();

  const { lighting, camera, scene } = useProlightProStore();
  const { generateWithFIBO, generateWithSeed, isLoading, progress } = useBriaAPI();

  const handleGenerate = async (useLockedSeed = false) => {
    const finalPrompt = prompt || currentPrompt || 'Professional product photography';
    setStorePrompt(finalPrompt);
    setError(null);
    setGenerating(true);
    setGenerationProgress(0);

    try {
      const fiboJson = buildFIBOJson(lighting, camera, {
        ...scene,
        subject_description: finalPrompt,
      });

      let result;
      if (useLockedSeed && currentSeed !== null) {
        // Reproduce with locked seed
        result = await generateWithSeed(finalPrompt, currentSeed, fiboJson, {
          onProgress: setGenerationProgress,
        });
      } else {
        // New generation
        result = await generateWithFIBO(finalPrompt, fiboJson, {
          onProgress: setGenerationProgress,
        });
      }

      if (result) {
        setCurrentImage(result);
        if (result.seed) {
          setCurrentSeed(result.seed);
        }

        // Add to history
        addToHistory({
          id: `gen-${Date.now()}`,
          ...result,
          prompt: finalPrompt,
          isReproduction: useLockedSeed,
          originalSeed: currentSeed || undefined,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error.message);
    } finally {
      setGenerating(false);
      setGenerationProgress(100);
    }
  };

  const handleGenerateNew = () => {
    handleGenerate(false);
  };

  const handleReproduce = () => {
    if (currentSeed !== null) {
      handleGenerate(true);
    }
  };

  const handleCopySeed = () => {
    if (currentSeed !== null) {
      navigator.clipboard.writeText(currentSeed.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#0f1419] border-[#2a2f4a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e0e0e0]">
            <Sparkles className="w-5 h-5 text-[#667eea]" />
            Live Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#999]">Subject Description</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Modern LED table lamp"
              className="bg-[#1a1f2e] border-[#2a2f4a] text-[#e0e0e0] placeholder:text-[#667]"
            />
          </div>

          {/* Seed Control */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1a1f2e] border border-[#2a2f4a]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[#999]">Seed:</span>
                {currentSeed !== null ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    {currentSeed}
                  </Badge>
                ) : (
                  <span className="text-sm text-[#667]">Not set</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isSeedLocked ? 'default' : 'outline'}
                  size="sm"
                  onClick={isSeedLocked ? unlockSeed : lockSeed}
                  disabled={currentSeed === null}
                >
                  {isSeedLocked ? (
                    <>
                      <Lock className="w-3 h-3" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      Unlocked
                    </>
                  )}
                </Button>
                {currentSeed !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySeed}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Generation Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateNew}
              disabled={isGenerating || isLoading}
              className="flex-1 bg-[#667eea] hover:bg-[#5568d3] text-white"
              loading={isGenerating || isLoading}
            >
              <Sparkles className="w-4 h-4" />
              Generate New
            </Button>
            <Button
              onClick={handleReproduce}
              disabled={isGenerating || isLoading || currentSeed === null || !isSeedLocked}
              variant="outline"
              className="flex-1 border-[#48bb78] text-[#48bb78] hover:bg-[#48bb78]/10"
            >
              <RefreshCw className="w-4 h-4" />
              Click Again = Identical
            </Button>
          </div>

          {/* Progress */}
          {(isGenerating || isLoading) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#999]">
                <span>Generating...</span>
                <span>{generationProgress || progress}%</span>
              </div>
              <div className="h-2 bg-[#1a1f2e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#667eea] transition-all duration-300"
                  style={{ width: `${generationProgress || progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-sm text-[#ff6b6b]">
              {error}
            </div>
          )}

          {/* Current Image Preview */}
          {currentImage && (
            <div className="mt-4">
              <div className="relative rounded-lg overflow-hidden border border-[#2a2f4a]">
                <img
                  src={currentImage.image_url}
                  alt="Generated"
                  className="w-full h-auto"
                />
                {currentImage.seed && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-[#667eea]/90 text-white">
                      Seed: {currentImage.seed}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

