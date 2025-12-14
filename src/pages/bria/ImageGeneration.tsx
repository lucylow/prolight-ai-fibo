import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Image as ImageIcon, Sparkles, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBria } from '@/hooks/useBria';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [modelVersion, setModelVersion] = useState<'v1' | 'v2'>('v2');
  const [numResults, setNumResults] = useState(1);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [sync, setSync] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const { textToImage, getStatus, pollStatus, isLoading } = useBria();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      const result = await textToImage({
        prompt,
        model_version: modelVersion,
        num_results: numResults,
        sync,
        seed,
      });

      if (result.request_id) {
        setRequestId(result.request_id);
        
        if (sync) {
          // If sync, images should be in the response
          if (result.data && typeof result.data === 'object' && 'images' in result.data) {
            const images = (result.data as { images?: string[] }).images || [];
            setGeneratedImages(images);
          }
        } else {
          // Poll for async results
          pollForResults(result.request_id);
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const pollForResults = async (id: string) => {
    try {
      const result = await pollStatus(id, 2000, 300000);
      if (result.data && typeof result.data === 'object' && 'images' in result.data) {
        const images = (result.data as { images?: string[] }).images || [];
        setGeneratedImages(images);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
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
            <Wand2 className="w-8 h-8" />
            Image Generation with Bria Models
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate high-quality images using Bria's pre-trained V1/V2 models
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
              <CardDescription>
                Configure your image generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Text Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="A beautiful sunset over mountains, photorealistic, 4K..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model Version</Label>
                  <Select value={modelVersion} onValueChange={(v) => setModelVersion(v as 'v1' | 'v2')}>
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v2">V2 (Recommended)</SelectItem>
                      <SelectItem value="v1">V1 (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numResults">Number of Results</Label>
                  <Select
                    value={numResults.toString()}
                    onValueChange={(v) => setNumResults(parseInt(v))}
                  >
                    <SelectTrigger id="numResults">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seed">Seed (Optional - for deterministic outputs)</Label>
                <input
                  id="seed"
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Leave empty for random"
                  value={seed || ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sync"
                  checked={sync}
                  onChange={(e) => setSync(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="sync" className="cursor-pointer">
                  Wait for completion (synchronous)
                </Label>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Images
                  </>
                )}
              </Button>

              {requestId && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Request ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{requestId.substring(0, 20)}...</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(requestId)}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
              <CardDescription>
                {generatedImages.length > 0
                  ? `${generatedImages.length} image(s) generated`
                  : 'Generated images will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && generatedImages.length === 0 ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-64" />
                  <Skeleton className="w-full h-64" />
                </div>
              ) : generatedImages.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {generatedImages.map((imageUrl, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <img
                        src={imageUrl}
                        alt={`Generated ${index + 1}`}
                        className="w-full rounded-lg border"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge className="absolute top-2 left-2">
                        {modelVersion.toUpperCase()}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>No images generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageGeneration;
