import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Upload, Play, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBria } from '@/hooks/useBria';
import { toast } from 'sonner';

const TailoredModels = () => {
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [trainingImages, setTrainingImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const { tailoredGeneration, isLoading } = useBria();

  const handleAddTrainingImage = () => {
    if (imageUrl.trim()) {
      setTrainingImages([...trainingImages, imageUrl.trim()]);
      setImageUrl('');
      toast.success('Image added to training set');
    }
  };

  const handleTrainModel = async () => {
    if (!trainingName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    if (trainingImages.length === 0) {
      toast.error('Please add at least one training image');
      return;
    }

    toast.info('Model training is typically done via API. Please use the backend API endpoint.');
    // In a real implementation, you would call a training endpoint here
  };

  const handleGenerate = async () => {
    if (!modelId.trim()) {
      toast.error('Please enter a model ID');
      return;
    }
    if (!generationPrompt.trim()) {
      toast.error('Please enter a generation prompt');
      return;
    }

    try {
      const result = await tailoredGeneration({
        model_id: modelId,
        prompt: generationPrompt,
        num_results: 1,
        sync: false,
      });

      if (result.request_id) {
        toast.success('Generation started! Check status for results.');
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            Tailored Models
          </h1>
          <p className="text-muted-foreground text-lg">
            Train custom models that preserve your visual IP and generate consistent outputs
          </p>
        </div>

        <Tabs defaultValue="train" className="space-y-6">
          <TabsList>
            <TabsTrigger value="train">Train Model</TabsTrigger>
            <TabsTrigger value="generate">Generate with Model</TabsTrigger>
          </TabsList>

          <TabsContent value="train">
            <Card>
              <CardHeader>
                <CardTitle>Train Custom Model</CardTitle>
                <CardDescription>
                  Create a model that preserves your brand assets, product looks, or character styles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., brand-v1, product-style-v1"
                    value={trainingName}
                    onChange={(e) => setTrainingName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the visual style this model should preserve..."
                    value={trainingDescription}
                    onChange={(e) => setTrainingDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Training Images</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Image URL"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Button onClick={handleAddTrainingImage} variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {trainingImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {trainingImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Training ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                            onClick={() => setTrainingImages(trainingImages.filter((_, i) => i !== index))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {trainingImages.length} image(s) added
                  </p>
                </div>

                <Button
                  onClick={handleTrainModel}
                  disabled={isLoading || !trainingName.trim() || trainingImages.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Training...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Training
                    </>
                  )}
                </Button>

                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Model training is an asynchronous process. 
                    Use the backend API endpoint <code>/tailored-gen/train</code> to start training.
                    Monitor training status via the model status endpoint.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Generate with Tailored Model</CardTitle>
                <CardDescription>
                  Use your trained model to generate images that match your visual IP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model ID</Label>
                  <Input
                    id="modelId"
                    placeholder="Enter your trained model ID"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genPrompt">Generation Prompt</Label>
                  <Textarea
                    id="genPrompt"
                    placeholder="Describe what you want to generate..."
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !modelId.trim() || !generationPrompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>

                {generatedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {generatedImages.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Generated ${index + 1}`}
                        className="w-full rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default TailoredModels;
