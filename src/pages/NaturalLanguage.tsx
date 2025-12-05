import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Wand2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGeneration } from '@/hooks/useGeneration';
import { useLightingStore } from '@/stores/lightingStore';
import ImagePreview from '@/components/generation/ImagePreview';

const NaturalLanguage = () => {
  const [sceneDescription, setSceneDescription] = useState('');
  const [lightingDescription, setLightingDescription] = useState('');
  const { generateFromNaturalLanguage, isGenerating } = useGeneration();
  const { currentImage, lightingAnalysis, isLoading } = useLightingStore();

  const handleGenerate = async () => {
    if (!sceneDescription && !lightingDescription) return;
    await generateFromNaturalLanguage(sceneDescription, lightingDescription);
  };

  const examples = [
    { scene: 'Portrait of a woman in elegant attire', lighting: 'Soft, flattering beauty lighting with subtle rim light' },
    { scene: 'Product shot of a luxury watch', lighting: 'Clean, high-key lighting with reflective highlights' },
    { scene: 'Dramatic portrait of a musician', lighting: 'Moody, low-key lighting with strong shadows' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
          <MessageSquare className="w-10 h-10" />
          Natural Language Control
        </h1>
        <p className="text-lg text-muted-foreground">
          Describe your scene and lighting in plain English - AI translates to precise parameters
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="glass-card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                Scene Description
              </label>
              <Textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="Describe your scene... e.g., 'Professional headshot of a business executive'"
                className="min-h-[120px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                Lighting Description
              </label>
              <Textarea
                value={lightingDescription}
                onChange={(e) => setLightingDescription(e.target.value)}
                placeholder="Describe the lighting... e.g., 'Soft, dramatic lighting with warm tones and subtle shadows'"
                className="min-h-[120px]"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!sceneDescription && !lightingDescription)}
              className="w-full gradient-primary"
              size="lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate from Description'}
            </Button>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Example Prompts</h3>
            <div className="space-y-3">
              {examples.map((example, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSceneDescription(example.scene);
                    setLightingDescription(example.lighting);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <p className="font-medium text-sm">{example.scene}</p>
                  <p className="text-xs text-muted-foreground">{example.lighting}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4">Generated Result</h3>
          <ImagePreview image={currentImage} isLoading={isLoading} analysis={lightingAnalysis} />
        </motion.div>
      </div>
    </div>
  );
};

export default NaturalLanguage;
