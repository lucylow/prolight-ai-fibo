import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Wand2,
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Upload,
  Settings,
  Zap,
  Layers,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BriaImageGenerationV2Service,
  type TextToImageV2Params,
  type ImageToImageV2Params,
  type BriaV2Response,
} from '@/services/briaImageGenerationV2';

const ImageGenerationV2 = () => {
  const [generationType, setGenerationType] = useState<'text' | 'image' | 'product' | 'batch'>('text');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9'>('1:1');
  const [guidanceScale, setGuidanceScale] = useState(5);
  const [stepsNum, setStepsNum] = useState(50);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [sync, setSync] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Array<{ url: string; seed: number; structuredPrompt?: string }>>([]);
  const [history, setHistory] = useState<Array<{ prompt: string; imageUrl: string; timestamp: number }>>([]);
  const [copied, setCopied] = useState(false);

  // Product shot specific
  const [productDescription, setProductDescription] = useState('');
  const [lightingSetup, setLightingSetup] = useState('Professional 3-point studio lighting');
  const [background, setBackground] = useState('white seamless backdrop');

  // Batch generation
  const [batchPrompts, setBatchPrompts] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize service (API token would come from environment or context)
  const service = new BriaImageGenerationV2Service({
    apiToken: '', // Will be handled by edge functions
    baseUrl: '/edge/bria',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (generationType === 'text' && !prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (generationType === 'image' && !referenceImage) {
      toast.error('Please upload a reference image');
      return;
    }
    if (generationType === 'product' && !productDescription.trim()) {
      toast.error('Please describe the product');
      return;
    }
    if (generationType === 'batch' && batchPrompts.length === 0) {
      toast.error('Please add prompts for batch generation');
      return;
    }

    setProcessing(true);
    try {
      let response: BriaV2Response;

      switch (generationType) {
        case 'text':
          response = await service.textToImage({
            prompt,
            negative_prompt: negativePrompt || undefined,
            aspect_ratio: aspectRatio,
            guidance_scale: guidanceScale,
            steps_num: stepsNum,
            seed: seed,
            sync: sync,
          });
          break;

        case 'image':
          if (!referenceImage) return;
          response = await service.imageToImage({
            images: [referenceImage],
            prompt: prompt || undefined,
            negative_prompt: negativePrompt || undefined,
            strength: 0.7,
            aspect_ratio: aspectRatio,
            guidance_scale: guidanceScale,
            steps_num: stepsNum,
            seed: seed,
            sync: sync,
          });
          break;

        case 'product':
          response = await service.generateProductShot(
            productDescription,
            lightingSetup,
            background,
            {
              aspectRatio,
              seed: seed,
            }
          );
          break;

        case 'batch': {
          const batchResults = await service.batchGeneration({
            prompts: batchPrompts,
            aspect_ratio: aspectRatio,
            guidance_scale: guidanceScale,
            steps_num: stepsNum,
            seed: seed,
            sync: true,
          });
          // Combine batch results
          const batchImages = batchResults.flatMap((r) => {
            const url = r.result?.image_url || r.result?.images?.[0]?.url;
            const seed = r.result?.seed || r.result?.images?.[0]?.seed || 0;
            return url ? [{ url, seed }] : [];
          });
          setResults(batchImages);
          setHistory([
            ...history,
            ...batchImages.map((img) => ({
              prompt: batchPrompts.join(', '),
              imageUrl: img.url,
              timestamp: Date.now(),
            })),
          ]);
          setProcessing(false);
          toast.success(`Generated ${batchImages.length} images!`);
          return;
        }

        default:
          toast.error('Unknown generation type');
          setProcessing(false);
          return;
      }

      // Extract results
      const imageUrl = response.result?.image_url || response.result?.images?.[0]?.url;
      const resultSeed = response.result?.seed || response.result?.images?.[0]?.seed || 0;
      const structuredPrompt = response.result?.structured_prompt
        ? JSON.stringify(response.result.structured_prompt, null, 2)
        : undefined;

      if (imageUrl) {
        const newResult = {
          url: imageUrl,
          seed: resultSeed,
          structuredPrompt,
        };
        setResults([newResult]);
        setHistory([
          ...history,
          {
            prompt: prompt || productDescription || 'batch',
            imageUrl: imageUrl,
            timestamp: Date.now(),
          },
        ]);
        toast.success('Image generated successfully!');
      } else {
        toast.error('No image URL in response');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleWorkflow = async () => {
    if (!productDescription.trim()) {
      toast.error('Please describe the product');
      return;
    }

    setProcessing(true);
    try {
      const workflowResult = await service.completeProductPhotographyWorkflow(
        productDescription,
        {
          lightingTypes: [
            'Professional 3-point studio lighting',
            'Soft window light',
            'Dramatic rim lighting',
          ],
          backgrounds: [
            'white seamless backdrop',
            'neutral gray background',
          ],
          sync: true,
        }
      );

      const images = workflowResult.variations.map((v) => ({
        url: v.imageUrl,
        seed: v.seed,
      }));

      setResults(images);
      setHistory([
        ...history,
        ...images.map((img) => ({
          prompt: productDescription,
          imageUrl: img.url,
          timestamp: Date.now(),
        })),
      ]);
      toast.success(`Generated ${images.length} variations!`);
    } catch (error) {
      console.error('Workflow failed:', error);
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `bria-generated-${Date.now()}.png`;
    a.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-[5%] bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            BRIA Image Generation v2
          </h1>
          <p className="text-muted-foreground text-lg">
            Generate high-quality images using BRIA's FIBO v2 API with advanced controls
          </p>
        </div>

        <Tabs value={generationType} onValueChange={(v) => setGenerationType(v as 'text' | 'image' | 'product' | 'batch')} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text">
              <Wand2 className="w-4 h-4 mr-2" />
              Text to Image
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="w-4 h-4 mr-2" />
              Image to Image
            </TabsTrigger>
            <TabsTrigger value="product">
              <Layers className="w-4 h-4 mr-2" />
              Product Shot
            </TabsTrigger>
            <TabsTrigger value="batch">
              <Sparkles className="w-4 h-4 mr-2" />
              Batch
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Generation Settings
              </CardTitle>
              <CardDescription>
                Configure your image generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generationType === 'text' && (
                <>
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
                  <div className="space-y-2">
                    <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                    <Textarea
                      id="negativePrompt"
                      placeholder="blurry, low quality, distorted..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {generationType === 'image' && (
                <>
                  <div className="space-y-2">
                    <Label>Reference Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Reference Image
                    </Button>
                    {referenceImage && (
                      <img
                        src={referenceImage}
                        alt="Reference"
                        className="w-full rounded-lg border mt-2"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyPrompt">Modification Prompt</Label>
                    <Textarea
                      id="modifyPrompt"
                      placeholder="Describe what to change in the image..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {generationType === 'product' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Product Description</Label>
                    <Textarea
                      id="productDescription"
                      placeholder="Describe the product in detail..."
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lighting">Lighting Setup</Label>
                    <Select value={lightingSetup} onValueChange={setLightingSetup}>
                      <SelectTrigger id="lighting">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Professional 3-point studio lighting with key light, fill light, and rim light">
                          3-Point Studio Lighting
                        </SelectItem>
                        <SelectItem value="Soft window light from the left with subtle fill from reflectors">
                          Soft Window Light
                        </SelectItem>
                        <SelectItem value="Dramatic rim lighting with moody background">
                          Dramatic Rim Lighting
                        </SelectItem>
                        <SelectItem value="Flat diffused lighting for neutral product shots">
                          Flat Diffused
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background">Background</Label>
                    <Select value={background} onValueChange={setBackground}>
                      <SelectTrigger id="background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white seamless backdrop">White Seamless</SelectItem>
                        <SelectItem value="neutral gray background">Neutral Gray</SelectItem>
                        <SelectItem value="soft blur bokeh background">Soft Bokeh</SelectItem>
                        <SelectItem value="professional studio gray">Studio Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {generationType === 'batch' && (
                <div className="space-y-2">
                  <Label htmlFor="batchPrompts">Batch Prompts (one per line)</Label>
                  <Textarea
                    id="batchPrompts"
                    placeholder="Enter multiple prompts, one per line..."
                    value={batchPrompts.join('\n')}
                    onChange={(e) =>
                      setBatchPrompts(e.target.value.split('\n').filter(Boolean))
                    }
                    rows={8}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                  <Select
                    value={aspectRatio}
                    onValueChange={(v) => setAspectRatio(v as '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9')}
                  >
                    <SelectTrigger id="aspectRatio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Square (1:1)</SelectItem>
                      <SelectItem value="3:2">Landscape (3:2)</SelectItem>
                      <SelectItem value="2:3">Portrait (2:3)</SelectItem>
                      <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                      <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guidanceScale">Guidance Scale: {guidanceScale}</Label>
                  <input
                    id="guidanceScale"
                    type="range"
                    min="3"
                    max="5"
                    step="0.1"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stepsNum">Steps: {stepsNum}</Label>
                  <input
                    id="stepsNum"
                    type="range"
                    min="35"
                    max="50"
                    step="1"
                    value={stepsNum}
                    onChange={(e) => setStepsNum(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seed">Seed (Optional)</Label>
                  <input
                    id="seed"
                    type="number"
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Random"
                    value={seed || ''}
                    onChange={(e) =>
                      setSeed(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
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
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
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

              {generationType === 'product' && (
                <Button
                  onClick={handleWorkflow}
                  disabled={processing}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Generate Variations Workflow
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Results</CardTitle>
              <CardDescription>
                {results.length > 0
                  ? `${results.length} image(s) generated`
                  : 'Generated images will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processing && results.length === 0 ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-64" />
                  <Skeleton className="w-full h-64" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <img
                        src={result.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full rounded-lg border"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadImage(result.url)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {result.structuredPrompt && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => copyToClipboard(result.structuredPrompt!)}
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                      <Badge className="absolute top-2 left-2">Seed: {result.seed}</Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p>No images generated yet</p>
                </div>
              )}

              {history.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mt-6 mb-3">Generation History</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {history.slice(-6).map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => window.open(item.imageUrl, '_blank')}
                      >
                        <img
                          src={item.imageUrl}
                          alt={`History ${idx + 1}`}
                          className="w-full rounded border"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageGenerationV2;

